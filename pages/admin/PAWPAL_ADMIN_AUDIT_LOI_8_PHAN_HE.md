# PAWPAL ADMIN — BÁO CÁO RÀ SOÁT LỖI & KẾ HOẠCH SỬA TÍCH LŨY

> **Phiên bản:** `v0.4` — bản tổng hợp đủ 8/8 · **Cập nhật:** 16/10/2026  
> **Phạm vi đã rà soát:** **8/8 phân hệ Admin (không tính Chatbot)** — (1) Dashboard, (2) Khách hàng, (3) Thú cưng, (4) Dịch vụ, (5) Bán hàng & Kho, (6) Nhân sự, (7) Khiếu nại, (8) Cấu hình hệ thống.  
> **Hoàn thành đợt kiểm tra mã nguồn:** đã nhận đủ 8 phân hệ. Vẫn còn bước test hành vi thật trên staging/database/backend/RLS trước khi kết luận PASS.  
> **Mục tiêu:** tìm lỗi nghiệp vụ, thao tác chỉ giả lập, sai/thiếu dữ liệu, lỗi bảo mật, lệch CSDL, hiệu năng; ghi **vị trí — nguyên nhân — cách sửa — cách kiểm chứng** để có thể giao trực tiếp cho người viết code.

## A. Cách sử dụng & độ tin cậy

- **Không có sửa đổi mã nguồn** ở đợt rà soát này. Báo cáo là danh sách sửa và kiểm thử, không phải bản vá.
- Đã đọc HTML/CSS/JS của tám phân hệ và các JS subtab, đối chiếu đường đọc/ghi Supabase, dữ liệu render và nút thao tác; **`node --check` đều đạt đối với 34 file JavaScript thuộc 8 phân hệ (24 file đã kiểm ở v0.3 + 10 file Nhân sự/Cấu hình mới)**. Cú pháp hợp lệ **không chứng minh tính năng chạy đúng**.
- **Mã lỗi:** `D` = Dashboard; `C` = Customers; `P` = Pets; `S` = Services; `O` = Orders/Sales/Inventory; `K` = Khiếu nại; `N` = Nhân sự; `CFG` = Cấu hình hệ thống. Giữ nguyên mã lỗi của những đợt trước.
- **Ưu tiên:** `P0` = bảo mật / sai người-sai hồ sơ / tiền-điểm / dữ liệu sức khỏe có thể sai / hành động sai khó khôi phục; `P1` = nghiệp vụ sai hoặc nút không làm đúng như giao diện tuyên bố; `P2` = hiển thị/hiệu năng/dữ liệu thiếu/UX.
- **Mức chắc chắn:** `XÁC NHẬN QUA CODE` = có đường mã gây lỗi hoặc không có triển khai; `CẦN DB/ROUTER` = phải đối chiếu schema, RLS, enum, router hay chạy thực tế; `RỦI RO` = có đường xử lý chưa an toàn, chưa thực hiện thử khai thác.
- **Chưa thể xác nhận thao tác thực sự commit production** do chưa có Supabase schema/RLS/RPC, file router `admin.js`, backend, tài khoản thử và mạng kết nối. Đừng coi những câu “đã lưu”, “đã gửi” trên toast là bằng chứng giao dịch.
- **Nguyên tắc triển khai:** không tự sửa enum/cột theo phỏng đoán; không thêm dữ liệu mẫu vào production; thao tác có tác động phải xác nhận ở DB; không tự deploy; dùng migration có rollback và test bằng môi trường thử nghiệm.

### Tóm tắt tiến độ

| Phân hệ | File kiểm tra | Tình trạng | Ưu tiên trước mắt |
|---|---|---|---|
| 1. Dashboard | `dashboard.js/html/css` | Đã rà soát tĩnh | Doanh thu theo ngày, lỗi truy vấn, realtime/cache, XSS |
| 2. Khách hàng | `customers.js/html/css`, `tab-customer-list.js`, `tab-customer-profile.js`, `tab-customer-pawpoint.js` | Đã rà soát tĩnh | Mã khách, giao dịch điểm, sửa hồ sơ, XSS |
| 3. Thú cưng | `pets.js/html/css`, `tab-pet-list.js`, `tab-pet-profile.js`, `tab-pet-reminders.js`, `tab-pet-carelog.js` | Đã rà soát tĩnh | Nhầm chủ nuôi, mã PET, tiêm chủng, dữ liệu giả |
| 4. Dịch vụ | `services.js/html/css`, `tab-service-bookings.js`, `tab-service-detail.js`, `tab-service-catalog.js`, `tab-service-reviews.js` | Đã rà soát tĩnh | Phụ phí & bảng giá, SLA, gửi thông báo giả, SOP, ghi đánh giá |
| 5. Bán hàng & Kho | `orders.js/html/css`, `tab-order-list.js`, `tab-order-detail.js`, `tab-order-products.js`, `tab-order-promos.js` | Đã rà soát tĩnh | POS tự báo thành công, sai địa chỉ, tiền/COD/RMA/tồn kho, review giả, XSS |
| 6. Nhân sự | `staff.js/html/css`, `tab-staff-list.js`, `tab-staff-profile.js`, `tab-staff-schedule.js`, `tab-staff-assessment.js` | Đã rà soát tĩnh | Cấp tài khoản/RBAC, phân ca và điều phối giả, hồ sơ KPI/lương giả, đánh giá tay nghề |
| 7. Khiếu nại | `complaints.js/html/css`, `tab-complaint-services.js`, `tab-complaint-orders.js`, `tab-complaint-detail.js` | Đã rà soát tĩnh | Client anon riêng, local overrides, bằng chứng giả, duyệt/assign/RMA, dữ liệu PII |
| 8. Cấu hình hệ thống | `settings.js/html/css`, `tab-settings-banners.js`, `tab-settings-content.js`, `tab-settings-system.js`, `tab-settings-audit.js` | Đã rà soát tĩnh | Token đối tác, safe mode client-only, audit, RAG giả, SSOT, XSS |

---

## B. PHÂN HỆ 1 — DASHBOARD

### D-01 · P0/P1 · Xác định đúng doanh thu, ngày ghi nhận và tránh đếm tiền chưa thu
**Vị trí:** `dashboard.js` ~185–207, 420–453. **Hiện trạng:** cộng `sales_order.total_amount` của đơn `COMPLETED/DELIVERED/PAID` theo **`created_at`**; cộng `appointment.total_price` của ca `COMPLETED` theo **`appointment_date`**, không kiểm tra ca đã thu tiền. Một đơn tạo hôm qua nhưng thanh toán hôm nay có thể không thuộc doanh thu hôm nay; dịch vụ hoàn thành nhưng chưa thanh toán vẫn có thể được tính. Biểu đồ dùng logic tương tự.

**Cách sửa:** thống nhất với Kế toán định nghĩa *doanh thu đã thu*, *doanh thu theo hoàn thành dịch vụ* hay *giá trị đặt hàng*. Nếu hiển thị “Doanh thu hôm nay” theo dòng tiền, truy vấn hóa đơn/giao dịch thanh toán đã thành công và `paid_at`, xử lý hoàn tiền/đơn hủy; nếu thống kê theo hoàn thành, đổi tên chỉ số và áp dụng nhất quán. Đưa tổng hợp vào SQL view/RPC kiểm soát quyền, không trộn nhiều mốc thời gian.

**Kiểm thử:** đơn tạo D-1 trả tiền D; ca đã hoàn thành nhưng chưa thu; đơn bị hoàn tiền; thanh toán một phần; so sánh với POS/sổ thanh toán chính thức. **Chưa kết luận phương án kế toán cuối cùng nếu chưa có bảng thanh toán.**

### D-02 · P1 · XÁC NHẬN QUA CODE · Lỗi Supabase có thể bị hiển thị thành 0
**Vị trí:** `dashboard.js` ~90–158. `Promise.all` trả từng `{data,error}`; nhiều `error` chưa được kiểm tra, dữ liệu thiếu được biến thành `[]`/`0`, `_dashLastFetchedAt` vẫn cập nhật.

**Cách sửa:** kiểm tra `error` của từng query; phân biệt lỗi toàn màn hình với lỗi widget riêng. Khi lỗi, hiện “Không tải được” + nút thử lại, không hiển thị `0` như là dữ liệu xác thực; không cache lỗi. Trường hợp fallback tồn kho phải kiểm tra **cả** query `inventoryFallback.error`.

**Kiểm thử:** tạm chặn một bảng bằng RLS, giả lập mất mạng, query sai cột; KPI phải hiện trạng thái lỗi và tải lại thành công ngay khi phục hồi.

### D-03 · P1 · XÁC NHẬN QUA CODE · Query lịch thiếu `pet_id` / `note`
**Vị trí:** `dashboard.js` ~105, 528–610. Query `appointment` không lấy `pet_id`, `note` nhưng một số khu vực lịch dùng chúng.

**Cách sửa:** thêm trường phù hợp theo schema, join `pet_profile` bằng `pet_id`, chỉ hiển thị ghi chú thực nếu quyền cho phép; không dùng câu ví dụ hoặc “Bé cưng” khi cần nhận diện chính xác.

**Kiểm thử:** lịch có 2 bé cùng chủ; bấm lịch phải mở đúng bé và ca; test ghi chú thật, trống và bị giới hạn RLS.

### D-04 · P1 · XÁC NHẬN QUA CODE · Realtime bị chặn bởi cache TTL 90 giây
**Vị trí:** `dashboard.js` ~66–80, 1145–1182. Callback realtime gọi `loadDashboardData()` mặc định `force=false`, khiến event mới có thể render lại dữ liệu cũ.

**Cách sửa:** khi có event hợp lệ hãy invalidate cache hoặc `force:true` (có debounce/coalescing, không fetch toàn bộ 8 bảng cho mỗi sự kiện). Dùng phân luồng query theo widget nếu phù hợp.

**Kiểm thử:** mở 2 cửa sổ, cập nhật kho/đơn/lịch; Dashboard phản ánh sau sự kiện, không phải chờ hết 90 giây.

### D-05 · P1 · XÁC NHẬN QUA CODE · Biểu đồ tỷ lệ AI tự xử lý không phản ánh handover thật
**Vị trí:** `dashboard.js` ~889–916. Chỉ đếm vài trạng thái `ESCALATED/HANDOVER/AGENT_HANDOVER`, bỏ sót ví dụ `agent_handling`; khi 0 phiên hiển thị 100% AI.

**Cách sửa:** thống nhất enum trạng thái với `chat_conversation` và định nghĩa mẫu số/điểm kết thúc phiên. 0 phiên nên hiện `—`/“Chưa có dữ liệu”, không phải 100%.

**Kiểm thử:** 0 phiên; bot kết thúc; khách yêu cầu người thật; agent tiếp nhận; phiên đang chờ.

### D-06 · P1 · XÁC NHẬN QUA CODE · Sai trường lọc nhân viên hoạt động
**Vị trí:** `dashboard.js` ~113, 918–937. Query lấy `account_status`, phép lọc đọc `s.status`; có thể tính cả nhân viên nghỉ việc vào mẫu số.

**Cách sửa:** dùng trường trạng thái đúng và chính sách “nhân viên có lịch trực/có khả năng nhận ca” nếu chỉ số là công suất; tránh gọi “tỷ lệ lấp đầy” nếu phép tính chỉ là số nhân viên có ít nhất một cuộc hẹn / tổng nhân viên.

**Kiểm thử:** nhân viên active, inactive, nghỉ phép, không có lịch, 2 ca trên 1 nhân viên.

### D-07 · P1/P2 · XÁC NHẬN QUA CODE · Giới hạn 500/200 bản ghi làm KPI không đầy đủ
**Vị trí:** `dashboard.js` ~104–115. Giới hạn 500 đơn, 500 lịch, 200 ticket, 200 chat nhưng dùng danh sách đó tính số liệu tổng.

**Cách sửa:** đếm/tính tổng bằng RPC/aggregate với bộ lọc thời gian; phân trang cho danh sách chi tiết. Với lịch tuần cần query đúng khoảng ngày, không chỉ 500 dòng mới nhất.

**Kiểm thử:** seed hơn 500 đơn/ca và hơn 200 ticket; so sánh tổng với truy vấn kiểm chứng trên DB.

### D-08 · P1/P2 · XÁC NHẬN QUA CODE · Lịch có nguy cơ gắn listener trùng và mất trạng thái xem
**Vị trí:** `dashboard.js` ~511–878, 1151–1158, 1201–1213. `setupDashboardCalendar()` chạy lại trong nhánh realtime appointment; trong khi nó đăng ký lại listener. Nhánh Dashboard đã khởi tạo không cập nhật lại lịch.

**Cách sửa:** khởi tạo listener đúng một lần; tách `renderCalendar()` khỏi `bindCalendarEvents()`, lưu view/selected date ở state. Realtime chỉ làm mới data và render, không setup lại.

**Kiểm thử:** đổi tháng 3 lần; sửa lịch từ tab khác; click chuyển tuần chỉ chạy một lần và giữ đúng ngày đang chọn.

### D-09 · P0 · RỦI RO XSS · Render dữ liệu vào HTML không escape
**Vị trí:** `dashboard.js` ~375–385, 603–608, 1075. Tên hàng, SKU, tên khách và nội dung do DB cung cấp được nối vào HTML.

**Cách sửa:** dùng `textContent` cho text; khi buộc phải có markup, escape dữ liệu/đưa vào DOM theo cấu trúc cố định; validate URL ảnh. Tránh `innerHTML` trực tiếp với chuỗi từ khách hoặc sản phẩm.

**Kiểm thử:** tên sản phẩm/khách chứa `<img ...>` hoặc dấu nháy; chỉ được hiển thị như văn bản, không chạy code, không phá HTML.

### D-10 · P1 · CẦN DB · Cảnh báo kho chuyển dữ liệu thiếu thành số lượng 0 và mức an toàn 5
**Vị trí:** `dashboard.js` ~300–380. Nếu dữ liệu `inventory` thiếu, code chọn `product.stock` hoặc `0`, ngưỡng tối thiểu mặc định `5`.

**Cách sửa:** phân biệt rõ “không có inventory”, “tồn kho thật là 0”, “ngưỡng chưa cấu hình”; không báo hết hàng từ giá trị `null`/query lỗi. Xác định bảng nguồn tồn kho duy nhất theo thiết kế Sales/Kho sắp gửi.

**Kiểm thử:** sản phẩm chưa nhập tồn kho, inventory NULL, tồn 0, tồn đúng min, tồn hơn min; so với màn Kho.

### D-11 · P2 · XÁC NHẬN QUA CODE · KPI/tồn kho dùng dữ liệu một lần nạp lâu hơn thời gian cần thiết
**Vị trí:** `dashboard.js` `DASH_CACHE_TTL_MS=90_000`, `focus` chỉ reload khi ẩn >=5 phút.

**Cách sửa:** tách tần suất theo loại dữ liệu; hiển thị `Cập nhật lúc ...`; có “Làm mới” thực sự force; dùng sự kiện cache invalidation sau thao tác ở phân hệ khác.

**Kiểm thử:** sửa đơn, xem Dashboard trong 90 giây; xác nhận người dùng không bị hiểu sai trạng thái cập nhật.

### D-12 · P1 · CẦN ROUTER · Nút điều hướng nhanh cần xác nhận có mở đúng module/modal
**Vị trí:** `dashboard.html` các nút tiếp nhận bé/đặt lịch/lên đơn; `dashboard.js` `setupQuickReceptionActions`, `bindModuleNavigation`.

**Cách sửa:** viết hợp đồng điều hướng bằng module + subtab + entity UUID, nơi nhận phải xác nhận đã mở thành công; nếu module khác chưa load, không báo thành công từ nơi gửi. Kiểm chứng khi nhận Sales/Kho và Pet/Service router.

**Kiểm thử:** thử 3 nút từ Dashboard khi đang ở mỗi phân hệ; modal phải mở đúng, không mất tham số, không bị dính state cũ.

---

## C. PHÂN HỆ 2 — KHÁCH HÀNG

### C-01 · P0 · XÁC NHẬN QUA CODE · Mã `CUST-xxx` không ổn định
**Vị trí:** `customers.js` ~409–455. Tạo `CUST-${idx + 1}` dựa trên vị trí load rồi dùng làm key state; thứ tự/khách mới có thể đổi mã của khách khác.

**Cách sửa:** dùng `customer.id` UUID làm khóa nội bộ bất biến và một `customer_code` duy nhất được sinh/lưu bởi DB nếu nghiệp vụ cần mã đẹp. Không dùng vị trí trong mảng để định danh. Chuyển các deep link và sessionStorage sang UUID (hoặc tra cứu `customer_code` → UUID qua DB).

**Kiểm thử:** A có mã X → thêm B → refresh → A vẫn có X; mở từ Thú cưng/Ticket/Pawpoint không sang khách khác.

### C-02 · P1 · XÁC NHẬN QUA CODE · Lịch hẹn khách hàng mặc định “Hoàn thành” do sai tên trường
**Vị trí:** `customers.js` ~231–238 và ~324–350. SELECT `appointment_status` nhưng đọc `a.status`; dùng `start_time` dù query lấy `appointment_time`.

**Cách sửa:** map `a.appointment_status` theo enum thực, dùng `a.appointment_time`; trạng thái không xác định phải là “Chưa rõ”, không tự cho là hoàn thành.

**Kiểm thử:** lịch PENDING/CONFIRMED/IN_PROGRESS/COMPLETED/CANCELLED có đúng nhãn/ngày/giờ.

### C-03 · P0/P1 · XÁC NHẬN QUA CODE · Tự thêm dữ liệu cân nặng & tiêm chủng không có thật
**Vị trí:** `customers.js` ~272–286. Thiếu cân nặng bị hiển thị `4.0`; thiếu lịch tiêm được hiển thị “Đầy đủ sổ tiêm”.

**Cách sửa:** nếu DB là null thì hiển thị “Chưa ghi nhận/Chưa xác minh”; không biến thiếu dữ liệu thành xác nhận sức khỏe.

**Kiểm thử:** hồ sơ mới chưa có cân/tiêm; kiểm tra cả bảng Khách hàng, Drawer và liên kết sang Thú cưng.

### C-04 · P0 · XÁC NHẬN QUA CODE · Thao tác cộng/trừ Pawpoint không nguyên tử
**Vị trí:** `tab-customer-pawpoint.js` ~322–355. Cập nhật `customer_membership.total_paw_points` trước, tiếp đến INSERT `paw_point_transaction`; có thể lỗi giữa chừng và số dư lệch nhật ký. Tính số dư từ state cũ dễ race khi hai admin thao tác.

**Cách sửa:** RPC giao dịch Postgres: kiểm tra quyền, chính sách, số điểm dương, số dư hiện tại bằng khóa/UPDATE có điều kiện; ghi balance + history + audit trong **một transaction**, idempotency key chống gửi trùng; trả số dư thực từ DB. Frontend chỉ gọi RPC rồi reload.

**Kiểm thử:** 2 admin cùng cộng/trừ; click 2 lần; trừ quá số dư; cố tình làm insert lịch sử lỗi; không có trường hợp đổi balance mà không có ledger.

### C-05 · P1 · CẦN DB · `reward_rule_id` cố định trong giao dịch
**Vị trí:** `tab-customer-pawpoint.js` ~348–354. Ghi UUID `92222222-2222-2222-2222-222222222222` không lấy từ policy hay cấu hình.

**Cách sửa:** nếu cần FK, chọn rule thực từ DB theo loại giao dịch, trạng thái áp dụng và quyền; nếu điều chỉnh thủ công thì cần loại transaction/policy riêng. Không dùng UUID giả. **Xác minh schema trước khi migration.**

**Kiểm thử:** không có policy, policy tắt, vượt hạn mức, FK thiếu, nhiều policy cùng phù hợp.

### C-06 · P0/P1 · XÁC NHẬN QUA CODE · Thêm khách thực hiện nhiều ghi riêng và bỏ qua lỗi
**Vị trí:** `tab-customer-list.js` ~745–805. Tạo `customer`, sau đó INSERT profile, membership, address, activation SMS, pet nhưng không kiểm tra `{error}` từng bước và không rollback.

**Cách sửa:** tách “tạo hồ sơ khách + cấu phần bắt buộc” thành RPC atomic; những side effect ngoài DB (SMS) đưa vào outbox/queue, có trạng thái gửi; nếu tạo thú cưng không bắt buộc thì hiển thị thất bại riêng và cho retry. Loại bỏ toast thành công tổng thể khi một bước quan trọng thất bại.

**Kiểm thử:** cưỡng bức lỗi ở profile/membership/address/SMS; kiểm tra không có hồ sơ mồ côi và UI nói đúng phần thành công.

### C-07 · P0/P1 · XÁC NHẬN QUA CODE · Modal sửa ngày sinh có thể giữ ngày của người trước
**Vị trí:** `tab-customer-profile.js` ~506–525. Chỉ set ô DOB nếu `data.dob.includes('/')`; dữ liệu từ `customers.js` là `YYYY-MM-DD`, nên ô ngày có thể không được reset và giữ giá trị lần trước.

**Cách sửa:** luôn set `editCustDob.value = data.dobRaw || ''` sau khi chuẩn hóa; reset form trước khi gán dữ liệu. Không dùng text hiển thị làm nguồn input.

**Kiểm thử:** mở khách A có DOB, mở B không DOB, mở C có DOB ISO rồi Save; ngày sinh không lẫn nhau.

### C-08 · P1 · XÁC NHẬN QUA CODE · Ô hạng thẻ có nhập nhưng không được lưu
**Vị trí:** `tab-customer-profile.js` ~596–674. Có biến `newTier` nhưng payload update không dùng nó.

**Cách sửa:** quyết định chính sách: hạng tự tính từ điểm (thì khóa ô chỉnh sửa và ghi rõ) hay admin có quyền override (thì lưu policy riêng, audit và xác minh). Không giữ control đánh lừa người dùng.

**Kiểm thử:** đổi hạng và refresh; UI phải nhất quán với chính sách thực.

### C-09 · P1 · XÁC NHẬN QUA CODE · Nút “Gửi lại SMS” chưa gửi SMS
**Vị trí:** `tab-customer-profile.js` ~380–382. Handler chỉ hiển thị thông báo mà không gọi gateway/outbox.

**Cách sửa:** khi chưa tích hợp: vô hiệu hóa/nói rõ “chưa hỗ trợ”; khi có: POST backend tạo thông điệp outbox, xác nhận trạng thái `queued/sent/failed`, có giới hạn tần suất và log, không nhúng token SMS ở frontend.

**Kiểm thử:** SMS thành công, số sai, nhà cung cấp lỗi, gửi 2 lần, kiểm tra log gateway.

### C-10 · P1 · XÁC NHẬN QUA CODE · Cache 90 giây che kết quả sau thêm/sửa/xóa
**Vị trí:** `customers.js` ~212–217 và các handler ở `tab-customer-list.js` / `tab-customer-profile.js` gọi reload không `force:true`.

**Cách sửa:** mọi mutation thành công phải invalidate cache/reload `force:true`; chỉ báo thành công sau xác nhận bản ghi, handle API lỗi và cập nhật state từ DB.

**Kiểm thử:** thêm khách, đổi SĐT, xóa bé, chuyển trạng thái rồi xem lại ngay trên các subtab.

### C-11 · P0/P1 · RỦI RO XSS · Dữ liệu tên, thú cưng, ghi chú vào HTML
**Vị trí:** `tab-customer-list.js` ~241–307; `tab-customer-profile.js` ~65–86; `customers.js` ~98–99, ~136–140. Ghép tên/ghi chú/chuỗi `message` vào HTML, có thể phản ánh thẻ hoặc thuộc tính HTML do người dùng nhập.

**Cách sửa:** thay bằng DOM nodes + `textContent`, hoặc escape chuỗi thuộc tính trước khi ghép markup. Modal xác nhận nên nhận plain text và xử lý `<strong>` qua template cố định, không nhận HTML tự do.

**Kiểm thử:** tên khách chứa `"><svg ...>` và dấu `&`, quote; không chạy script và không phá danh sách.

### C-12 · P0 · XÁC NHẬN QUA CODE · Nếu thiếu modal xác nhận, hành động vẫn được thực hiện
**Vị trí:** `customers.js` ~87–102. `showCustomerConfirmModal()` chạy thẳng `onAccept()` khi thiếu modal.

**Cách sửa:** fail-closed: dừng tác vụ, cảnh báo thiếu UI, hoặc hiển thị `window.confirm` đúng nghĩa và chỉ chạy khi người dùng xác nhận; không tự chấp nhận hành động xóa.

**Kiểm thử:** cố tình xóa node modal trong DevTools rồi bấm Xóa: không được xóa ngay.

### C-13 · P1 · XÁC NHẬN QUA CODE · Trạng thái tạm khóa chưa được chuẩn hóa
**Vị trí:** `customers.js` ~446–455. Chỉ coi `LOCKED`/`da_khoa` là khóa; enum `tam_khoa` chưa được nhận diện.

**Cách sửa:** map đầy đủ các trạng thái hiện có từ schema; phân biệt `ACTIVE`, `TEMP`, `SUSPENDED`, `LOCKED`, `DELETED` theo ý nghĩa và quyền được phép thực hiện.

**Kiểm thử:** tài khoản đang hoạt động / tạm khóa / khóa vĩnh viễn phải có nhãn đúng, lọc đúng.

### C-14 · P1 · CẦN ROUTER · Hồ sơ đơn hàng có thể ghép bằng tên/SĐT hoặc mã cố định
**Vị trí:** `tab-customer-profile.js` ~164–194. Có logic sessionStorage/mapping `CUST-001 → USER-001` và so tên/số điện thoại để bổ sung đơn.

**Cách sửa:** chỉ dùng `customer_id` UUID và FK khi ghép đơn hàng; lưu deep link bằng UUID. Không suy ra quyền sở hữu đơn từ trùng tên/số điện thoại.

**Kiểm thử:** hai khách trùng tên, đổi SĐT, dữ liệu sessionStorage từ ca cũ, refresh trang.

### C-15 · P2 · XÁC NHẬN QUA CODE · Xuất CSV chưa đồng bộ toàn bộ bộ lọc và giới hạn dữ liệu
**Vị trí:** `tab-customer-list.js` phần xuất; `tab-customer-pawpoint.js` ~79–135; `customers.js` query Pawpoint giới hạn.

**Cách sửa:** tái sử dụng cùng hàm filter giữa render/export; nếu xuất “toàn bộ” thì export phân trang server-side có quyền, không lấy số bản ghi đang có trong state làm toàn hệ thống. Escape CSV chống công thức spreadsheet bắt đầu `=`, `+`, `-`, `@` với dữ liệu người nhập.

**Kiểm thử:** nhiều trang, lọc thành viên, khiếu nại, CSV mở Excel; số hàng chính xác, công thức từ tên/ghi chú không tự chạy.

### C-16 · P1/P2 · CẦN DB · Dùng điểm hiện tại để tính hạng có thể khác định nghĩa hạng
**Vị trí:** `customers.js` ~411–430. Hạng dựa vào `total_paw_points` (số điểm đang có) thay vì một chỉ số xét hạng đã thống nhất. Khi đổi điểm thành voucher, hạng có thể bị hạ ngoài ý muốn.

**Cách sửa:** xác định hạng theo tổng điểm tích lũy, chi tiêu, kỳ xét hạng hay số dư; nếu `total_paw_points` là ví điểm khả dụng thì tạo/đọc riêng `tier_points` hoặc `membership_tier`, không tính tùy ý ở client.

**Kiểm thử:** khách đủ hạng nhưng đổi voucher hết điểm; kết quả theo policy, không theo ngẫu nhiên state.

---

## D. PHÂN HỆ 3 — THÚ CƯNG

### P-01 · P0 · XÁC NHẬN QUA CODE · Thêm bé không chọn chủ vẫn có thể gán cho khách đầu tiên
**Vị trí:** `tab-pet-list.js` ~1171–1182. Khi `newPetOwnerHidden` rỗng/không hợp lệ, code lấy `Object.keys(customersData)[0]`. Đây là **sai liên kết sở hữu**, nguy hiểm hơn thông báo lỗi đơn giản.

**Cách sửa:** xóa toàn bộ nhánh tự chọn chủ đầu tiên; yêu cầu `ownerCustId` tồn tại, được chọn rõ từ autocomplete và backend xác nhận UUID khách hợp lệ + quyền tạo pet cho người đó. Khóa nút Lưu khi chưa có chủ.

**Kiểm thử:** không chọn chủ, gõ tên tự do không chọn gợi ý, chọn rồi xóa, refresh dialog; **không** có bản ghi pet được tạo với chủ khác. Tạo thử 2 khách khác tên và kiểm tra UUID trong DB.

### P-02 · P0/P1 · XÁC NHẬN QUA CODE · Sinh mã PET bằng độ dài danh sách và fallback theo thứ tự
**Vị trí:** `tab-pet-list.js` ~1197–1205 (`PET-${Object.keys(...).length+1}`); `pets.js` ~348–393 (`PET-${idx+1}` nếu thiếu mã). Lưu trữ, xóa, hạn chế RLS hoặc hai admin thêm cùng lúc có thể trùng mã; `petsMap[code]` có thể ghi đè một hồ sơ.

**Cách sửa:** UUID PK giữ nguyên, `pet_code` sinh **phía database** (sequence / cơ chế phát sinh mã có UNIQUE), không sinh từ length/index. Không dùng `pet_code` làm duy nhất khóa state nếu có thể thiếu/trùng; phản hồi lỗi trùng rõ ràng.

**Kiểm thử:** 2 admin tạo cùng lúc; lưu trữ PET-002 rồi tạo mới; 2 record thiếu mã; không có hồ sơ biến mất hoặc trỏ nhầm.

### P-03 · P0 · XÁC NHẬN QUA CODE · Điền xác nhận tiêm chủng giả khi vừa tạo pet
**Vị trí:** `tab-pet-list.js` ~1220–1235. `vaccination_history` ghi thẳng `'Đã tiêm phòng định kỳ'` dù form không có chứng từ/sự kiện tiêm chủng được xác minh.

**Cách sửa:** khi chưa có lịch sử, lưu `NULL`/trống và hiển thị “Chưa xác nhận”; chỉ thêm mốc tiêm qua form vaccine có loại, ngày, cơ sở/nguồn, người ghi, trạng thái và chứng cứ theo chính sách. Không chuyển tình trạng chưa biết thành “đã tiêm”.

**Kiểm thử:** tạo bé mới không ghi lịch tiêm → Dashboard/Khách hàng/Pet Hotel không hiển thị đã tiêm; thêm chứng nhận có hiệu lực → cập nhật theo đúng policy.

### P-04 · P0/P1 · XÁC NHẬN QUA CODE · “Đủ điều kiện Pet Hotel” chỉ dựa vào tên vaccine/trạng thái text
**Vị trí:** `tab-pet-profile.js` ~48–69. Chỉ cần một dòng chứa `dại|rabies` và trạng thái trong 3 chuỗi được cho là hợp lệ; **không** kiểm tra ngày hết hạn, chống chỉ định, hồ sơ dịch tễ/điều kiện dịch vụ khác.

**Cách sửa:** đổi nhãn thành “Đã có ghi nhận vaccine dại” cho đến khi có bộ quy tắc Hotel được phê duyệt; điều kiện nhận phòng phải chạy backend trên dữ liệu vaccine có cấu trúc, hiệu lực ngày, tình trạng sức khỏe và các yêu cầu thực tế. Không coi nhãn UI là chứng nhận đủ điều kiện y tế.

**Kiểm thử:** vaccine cũ/hết hiệu lực, vaccine chưa xác minh, có cảnh báo sức khỏe, không có chứng từ: không được tự báo đủ điều kiện.

### P-05 · P1 · XÁC NHẬN QUA CODE · Nhắc lịch Hotel/vaccine luôn bằng 0
**Vị trí:** `tab-pet-reminders.js` ~12–48. `getRemindersData()` chỉ sinh loại `BATH` và `GROOM`; KPI vẫn đếm `HOTEL` và `HOTEL_VACCINE` nên không bao giờ có dòng thuộc hai loại này.

**Cách sửa:** hoặc ẩn/tạm ghi “Chưa triển khai” đối với KPI chưa có rule, hoặc thực hiện rule cụ thể từ DB. Với vaccine, sử dụng `next_due_at` từ mốc có cấu trúc và trạng thái xác minh, không suy ra từ chữ tự do.

**Kiểm thử:** tạo bộ hồ sơ có hạn tiêm; cần xuất hiện dòng và KPI đúng; trường hợp không có ngày phải là “Chưa rõ”, không tự đến hạn.

### P-06 · P1 · XÁC NHẬN QUA CODE · Tất cả reminder luôn chưa gửi và bấm Gửi không ghi lịch sử
**Vị trí:** `tab-pet-reminders.js` ~25, 120–139, 290–320. Mỗi lần render tạo reminder với `status:'UNSENT'`; nút submit chỉ báo mở Zalo/copy thủ công, không có API, không lưu lần gửi.

**Cách sửa:** phân biệt rõ **Soạn/copy/mở Zalo** với **Đã gửi qua hệ thống**. Nếu gửi thủ công, chỉ cho nhân viên bấm “Đánh dấu đã liên hệ” kèm thời gian/kênh/người thực hiện; nếu gửi thật, tạo `reminder_delivery`/outbox + gateway và lưu trạng thái trả về.

**Kiểm thử:** trước/sau liên hệ, tải lại trang, lỗi gateway, gửi trùng; filter `SENT` phải chính xác, không hiện tất cả là chưa gửi mãi mãi.

### P-07 · P1 · XÁC NHẬN QUA CODE · Nút Đặt lịch ở danh sách nhắc lịch chưa được nối đúng
**Vị trí:** `tab-pet-reminders.js` ~195–202 tạo `.btn-quick-book-spa` mỗi dòng; `tab-pet-profile.js` ~363 dùng `querySelector('.btn-quick-book-spa')` và lấy pet đang mở từ `sessionStorage`.

**Cách sửa:** dùng event delegation trên bảng nhắc lịch với `data-pet-id` UUID hoặc mã hợp lệ của **chính dòng được bấm**, gọi `handleCreateServiceForPet(petId)`; không phụ thuộc pet đang mở trong hồ sơ khác.

**Kiểm thử:** hiện 2 reminder A, B; bấm “Đặt lịch” dòng B → modal chọn B, không chọn A hoặc pet từ trang hồ sơ.

### P-08 · P1 · XÁC NHẬN QUA CODE · Nút In thẻ đeo cổ chỉ thông báo thành công
**Vị trí:** `tab-pet-list.js` ~1277–1286. `btnConfirmSendPrintCollar` chỉ gọi toast; không `window.print()`, không render trang in hay kết nối máy in.

**Cách sửa:** nếu chưa tích hợp máy in, đổi thành “Xem trước thẻ”/“Chưa cấu hình máy in”. Nếu hỗ trợ web print thì dựng print CSS 80mm và `window.print()`; nếu in tem trực tiếp thì backend/bridge máy in có xác nhận job.

**Kiểm thử:** có print dialog hoặc job ID thật; hủy in không báo đã in thành công; thẻ không chứa SĐT/mã sai mặc định.

### P-09 · P1 · XÁC NHẬN QUA CODE · Modal chi tiết Carelog dùng dữ liệu ví dụ khi không tìm thấy bản ghi
**Vị trí:** `tab-pet-profile.js` ~450–488. `careItem = find(...) || { ... }` gắn ngày, KTV, ảnh chó và nội dung chăm sóc cụ thể giả.

**Cách sửa:** nếu `careId` không còn tồn tại: dừng và hiện “Không tìm thấy bản ghi”; không hiển thị bất kỳ chứng cứ hình ảnh/mốc chăm sóc mẫu nào. Chỉ hiển thị ảnh và lịch sử từ Supabase Storage/DB thực.

**Kiểm thử:** xóa log ở cửa sổ khác rồi mở ID cũ; kết quả không xuất hiện hồ sơ giả.

### P-10 · P1 · XÁC NHẬN QUA CODE · Ghi cân nặng không nguyên tử; hai đường thao tác khác nhau
**Vị trí:** `tab-pet-profile.js` ~506–560; `tab-pet-list.js` ~1342–1394. Cả hai đều ghi `pet_weight_history` rồi cập nhật `pet_profile.weight` bằng 2 request; tại `tab-pet-list.js`, một số loại lỗi bảng history còn bị bỏ qua và vẫn cập nhật cân nặng.

**Cách sửa:** dùng một RPC `record_pet_weight` atomic: kiểm tra cân nặng hợp lệ, quyền, ghi lịch sử và cập nhật cân hiện tại cùng transaction; trả về bản ghi xác thực. Chỉ có **một** handler chuẩn từ modal dùng chung; xóa logic ghi trùng; idempotency chống click lặp.

**Kiểm thử:** history insert lỗi, profile update lỗi, 2 admin cập nhật cùng lúc, nhấn Save 2 lần; số cân hiện tại và mốc mới nhất luôn khớp.

### P-11 · P1 · XÁC NHẬN QUA CODE · Tạo pet và ghi mốc cân ban đầu thành 2 thao tác rời
**Vị trí:** `tab-pet-list.js` ~1238–1257. Nếu insert pet thành công nhưng `pet_weight_history` thất bại, tạo hồ sơ không đồng bộ; sau lỗi vẫn có toast thành công ở cuối.

**Cách sửa:** RPC tạo pet + mốc cân, chỉ xác nhận toàn phần khi các thành phần bắt buộc đã lưu; nếu lịch sử không bắt buộc, thể hiện trạng thái “tạo hồ sơ xong, thiếu mốc cân” rõ ràng và cung cấp retry.

**Kiểm thử:** cố tình fail bảng weight history; không báo thành công chung gây hiểu nhầm.

### P-12 · P1 · XÁC NHẬN QUA CODE · Tạo nhanh chủ nuôi không kiểm tra profile/member/address
**Vị trí:** `tab-pet-list.js` ~1007–1082. Sau insert `customer` có kiểm tra lỗi, các INSERT `customer_profile`, `customer_membership`, `customer_address` không kiểm tra `{error}`.

**Cách sửa:** tái sử dụng duy nhất backend/RPC `create_customer_at_counter` từ phân hệ Khách hàng, bảo đảm kiểm tra SĐT trùng và transaction; đừng nhân đôi thuật toán tạo chủ giữa hai phân hệ.

**Kiểm thử:** lỗi profile hoặc membership; không thể có khách được hiển thị đầy đủ dù thiếu bảng phụ.

### P-13 · P1 · XÁC NHẬN QUA CODE · Thêm/sửa pet tự gán giá trị sức khỏe/đặc điểm mặc định
**Vị trí:** `tab-pet-list.js` ~1185–1235; `tab-pet-profile.js` ~588–625; `pets.js` ~348–401. Giống `Corgi`, màu `Vàng trắng`, cân khi sửa `8.5`, giới tính thiếu mặc định “Đực”, ghi chú “Bé ngoan”, dị ứng thiếu thành “Không”.

**Cách sửa:** giữ null/“Chưa cập nhật” cho dữ liệu không được cung cấp; validate giới tính/giống/cân theo schema; không tự sinh thông tin khám/ứng xử. Nếu cần giá trị gợi ý để nhập nhanh, đánh dấu *gợi ý* và chỉ lưu khi người dùng chọn.

**Kiểm thử:** form trống từng trường, pet khác loài/giới tính chưa xác định, pet không có dữ liệu dị ứng; không lưu mặc định vô căn cứ.

### P-14 · P1 · XÁC NHẬN QUA CODE · Lịch sử dịch vụ ghép theo tên bé và đưa giá giả
**Vị trí:** `tab-pet-profile.js` ~129–177. Lấy thêm `sessionStorage.pawpal_admin_services_bookings`, ghép theo `petName` nếu không khớp mã, giá thiếu trở thành `250.000đ`.

**Cách sửa:** chỉ join `appointment.pet_id = pet_profile.id` UUID; loại bỏ ghép theo tên, không lấy sessionStorage làm nguồn chân lý; thiếu giá hiển thị “Chưa xác nhận”.

**Kiểm thử:** hai bé cùng tên thuộc 2 khách, lịch đã hủy, phiên đăng nhập khác có sessionStorage cũ.

### P-15 · P0 · RỦI RO XSS · Bảng pet/reminder và ghi chú tiêm/cân chèn HTML trực tiếp
**Vị trí:** `tab-pet-list.js` ~308–350, autocomplete ~744–930, `tab-pet-profile.js` ~37–44, ~103–170, `tab-pet-reminders.js` ~154–202, `pets.js` ~427–435. Có chèn tên, cảnh báo, SĐT, ảnh/URL và thuộc tính từ DB/input vào `innerHTML`.

**Cách sửa:** HTML template cố định + `textContent`; escape toàn bộ dữ liệu trong text và thuộc tính `data-*`, `title`, `src`; validate link/URL ảnh. Với văn bản nhiều dòng dùng CSS `white-space:pre-wrap` thay vì chèn `<br>` từ text thô.

**Kiểm thử:** nhập tên/cảnh báo chứa `"><svg ...>` hoặc HTML dài; mọi bảng, modal và ảnh vẫn đúng, không thi hành script.

### P-16 · P1/P2 · XÁC NHẬN QUA CODE · Mất lịch sử cân sau timeout, lịch hẹn thiếu vì limit
**Vị trí:** `pets.js` ~218–251: `Promise.race` với timeout 5 giây cho cân nặng có thể trả `[]` nhưng không báo lỗi; `appointment.limit(500)` không sort/không lọc theo pet, lịch cũ có thể thiếu.

**Cách sửa:** tách trạng thái lỗi từng widget; query history có phân trang/date range, có quyền và retry; không tuyên bố “Chưa có dữ liệu” khi thực ra timeout. Giảm tải bằng truy vấn theo pet khi mở Drawer.

**Kiểm thử:** giả lập query cân >5 giây, hơn 500 lịch, lịch mốc rất cũ; phân biệt trống thật và tải lỗi.

### P-17 · P1 · XÁC NHẬN QUA CODE · “Tải ảnh từ thiết bị” chưa được nối handler
**Vị trí:** `pets.html` ~1350–1355 có nút `btnUploadPetPhoto`; không tìm thấy handler tương ứng trong nhóm JS của Pet đã gửi.

**Cách sửa:** nối nút với `petPhotoFileInput`, validate MIME/kích thước cả server, lưu Supabase Storage với quyền truy cập phù hợp rồi ghi `avatar_url` từ file đã lưu; nếu chưa triển khai thì disable có nhãn rõ.

**Kiểm thử:** click nút phải mở file chooser; upload ảnh thật, reload vẫn còn; thử file 6MB/không phải ảnh/không có quyền.

### P-18 · P1 · XÁC NHẬN QUA CODE · Tính nhắc lịch cố định 14/30 ngày, không có trạng thái gửi
**Vị trí:** `tab-pet-reminders.js` ~12–27, ~51–65. Nhắc tắm 14 ngày, grooming 30 ngày dựa vào ca hoàn thành trong 500 appointment; nội dung mặc định hứa voucher 10% và còn lịch trống mà không truy vấn chính sách/slot thật.

**Cách sửa:** lấy chu kỳ và mẫu tin từ cấu hình chính thức hoặc chỉ đánh dấu đây là gợi ý; không tự hứa ưu đãi/giờ trống khi chưa kiểm chứng. Đối với chiến dịch, đối chiếu consent khách và trạng thái liên hệ.

**Kiểm thử:** đổi rule/tắt ưu đãi, hết slot, khách từ chối marketing; nội dung không đưa ra cam kết sai.

### P-19 · P2 · XÁC NHẬN QUA CODE · Bộ lọc cân/tiêm/vaccine chưa rõ ranh giới và trạng thái nguồn
**Vị trí:** `tab-pet-list.js` ~222–260. `under5` dùng cân bằng 0 cho record chưa cân; `over20` loại đúng 20, `10to20` gồm 10 và 20; các khoảng có thể chồng nhau ở 10. `vaccinated` dựa vào chuỗi lịch sử chứ không phải hiệu lực.

**Cách sửa:** định nghĩa khoảng `[0,5)`, `[5,10)`, `[10,20)`, `[20,+∞)` hoặc theo nghiệp vụ thống nhất; không đưa `null` vào dưới 5kg; vaccine tách `verified/expired/unverified`.

**Kiểm thử:** null, 0, 4.9, 5, 10, 20, 20.1; hồ sơ vaccine chưa xác minh và quá hạn.

### P-20 · P2 · CẦN ROUTER · Điều hướng từ Pet sang Khách hàng/Dịch vụ cần hợp đồng UUID
**Vị trí:** `tab-pet-list.js` ~94–111, ~659–700; `services.js` ~674–681. Pet sử dụng sessionStorage để truyền mã PET, rồi trigger router/hash; cần kiểm tra các thuộc tính target và lifecycle sau khi đổi module.

**Cách sửa:** dùng `navigateToModule({module,subtab,entityId})` ở router trung tâm, mở module đích trước khi render/modal; ưu tiên UUID, không tên bé và mã sinh theo index. Nếu không resolve được thì báo lỗi rõ, không chọn pet đầu tiên.

**Kiểm thử:** tạo ca cho 2 pet khác nhau ở hai màn; mở từ danh sách/nhắc lịch/hồ sơ, quay lại; không có sai pet.

---

## E. PHÂN HỆ 4 — DỊCH VỤ

### S-01 · P1 · XÁC NHẬN QUA CODE · Form cho chọn Hotel nhưng backend/frontend chủ động chặn lưu Hotel
**Vị trí:** `services.html` form tạo lịch và `tab-service-bookings.js` ~1400–1450: `if (category === 'Hotel') throw new Error('Chưa thể lưu Hotel ...')`.

**Cách sửa:** nếu Hotel chưa được triển khai, disable “Tạo lịch Hotel” + giải thích; nếu phải hoạt động, xây workflow đặt phòng/giữ chỗ, kiểm tra phòng còn trống theo khoảng check-in/check-out, số bé/công suất, policy và giá Hotel, xác nhận atomically. Không chỉ bỏ dòng `throw` vì đang thiếu logic phòng.

**Kiểm thử:** chọn Hotel, tạo booking hợp lệ, trùng phòng cùng thời gian, không đủ điều kiện thú cưng, hủy/đổi phòng, kiểm tra quyền.

### S-02 · P1 · XÁC NHẬN QUA CODE · SLA là mức cố định, có điều kiện theo mã lịch demo
**Vị trí:** `services.js` ~205–251: `getServiceSlaInfo()` cho PENDING ngay trạng thái cảnh báo 15 phút, mã `BKG-1006/1008/1009` có xử lý riêng và gán số phút trễ cứng `35/18`.

**Cách sửa:** loại bỏ mã ca hardcoded và số phút mô phỏng. Bổ sung/đọc `created_at`, `confirmed_at`, `actual_start_at`, `expected_end_at` hoặc các mốc SLA theo schema; tính deadline theo chính sách. “Sắp tới” dựa lịch thật; phân biệt ca đang chờ duyệt với ca thật sự quá hạn.

**Kiểm thử:** lịch mới tạo 30 giây trước, 16 phút, 31 phút; ca quá giờ bắt đầu; ca chờ KTV; không có mã ngoại lệ.

### S-03 · P1 · XÁC NHẬN QUA CODE · KPI “Hôm nay” trộn dữ liệu tất cả ngày
**Vị trí:** `tab-service-bookings.js` ~131–156. `total` lọc hôm nay nhưng `pending`, `in_progress`, `completed`, `cancelled` đếm toàn bộ `bookingsData` không lọc ngày.

**Cách sửa:** thống nhất rõ KPI theo hôm nay hay tất cả; nếu là “Hôm nay” thì lọc `appointment_date` trước rồi nhóm status; nếu là công việc tồn đọng thì cần nhãn “Tồn đọng (mọi ngày)” riêng.

**Kiểm thử:** lịch hôm qua pending, hôm nay 1 completed, tuần sau 3 cancelled; các KPI đúng nhãn và số lượng.

### S-04 · P0/P1 · XÁC NHẬN QUA CODE · Giá, phụ phí, biên bản được đóng gói vào `appointment.note`
**Vị trí:** `services.js` ~27–83, ~53–84, `tab-service-bookings.js` ~2190–2245. Dùng những khối `[Pawpal charges v1]`, `[Pawpal intake v1]`, `[Pawpal handover v1]` trong `note`, sau đó parser/tách chuỗi và UPDATE cả `note` + `total_price`.

**Rủi ro:** dễ mất dữ liệu do định dạng thay đổi, xung đột sửa giữa hai luồng, thiếu FK cho phụ phí, khó audit theo từng khoản. Đã có `eq(...)` giảm một phần tranh chấp nhưng chưa thay thế thiết kế giao dịch và ledger chuẩn.

**Cách sửa:** thiết kế bảng chuẩn hóa theo schema thực: `appointment_intake`, `appointment_handover`, `appointment_charge_line`/`service_booking_item` với UUID, loại khoản, giá, người chấp thuận, timestamp; RPC để thay đổi line items + tổng tiền atomically. Migration đọc dữ liệu cũ một lần, không bỏ mất chú thích tự do.

**Kiểm thử:** hai nhân viên thêm phụ phí đồng thời; cùng lúc đổi KTV; note có unicode/xuống dòng; xóa phụ phí và rollback khi lỗi.

### S-05 · P0/P1 · XÁC NHẬN QUA CODE · Lưu danh mục và bảng giá thành nhiều giao dịch rời
**Vị trí:** `tab-service-catalog.js` ~579–628. `upsert(service)` rồi `update(giá cũ inactive)` rồi `insert(4 mức giá mới)`; nếu bước ba lỗi thì dịch vụ đã đổi và toàn bộ giá cũ có thể bị khóa.

**Cách sửa:** RPC `save_service_with_price_matrix` dùng một transaction, validate toàn bộ payload trước ghi, kiểm tra chính sách quyền, lưu giá mới + hiệu lực atomically, audit version. Lỗi bất kỳ bước nào phải rollback toàn bộ.

**Kiểm thử:** cố tình lỗi row giá thứ ba, kết nối rớt, trùng `service_code`, hai người sửa cùng lúc; bộ giá cũ vẫn dùng được nếu save thất bại.

### S-06 · P0/P1 · XÁC NHẬN QUA CODE · Khoảng cân nặng bảng giá có khe hở 4.9–5kg
**Vị trí:** `tab-service-catalog.js` ~599–609 tạo `[0,4.9], [5,10], [10,20], [20,999.99]`; `tab-service-bookings.js` ~1462–1469 lọc `weight >= weight_from && weight < weight_to`.

**Cách sửa:** cùng một chuẩn **khoảng nửa mở** `[0,5), [5,10), [10,20), [20, +∞)` trên DB và UI, hoặc chuẩn khoảng khác do nghiệp vụ xác nhận. Dùng `weight_to=NULL` cho vô cực. Tránh gap, overlap; constraint DB cho effective price ranges nếu có thể.

**Kiểm thử:** giá ở cân 0.1, 4.9, 4.95, 5, 9.99, 10, 19.99, 20, 25kg; với mỗi cân chỉ **một** giá đúng hiệu lực.

### S-07 · P1 · XÁC NHẬN QUA CODE · Hiển thị bảng giá giả khi không có dữ liệu giá
**Vị trí:** `services.js` ~455–507, `tab-service-catalog.js` ~296–312, ~493–507. Bảng giá mặc định 120k/150k/200k/250k và thời lượng 60 phút khi thiếu row; có thể hiện giá cũ/không hợp lệ. Mã nhân viên/giá còn lấy từ dữ liệu client.

**Cách sửa:** nếu thiếu matrix giá đang hiệu lực thì hiển thị “Chưa cấu hình giá — không thể đặt lịch”, không lấy giá mẫu làm thật. Tải giá `status=ACTIVE`, `effective_from/to` theo ngày hẹn; tính giá server-side. Trong modal edit không tự điền giá mặc định cho record chưa có giá mà ghi rõ trạng thái trống.

**Kiểm thử:** xóa toàn bộ giá, giá hết hiệu lực, giá nhiều phiên bản, giá tương lai; không hiển thị 120k là giá thật.

### S-08 · P1 · XÁC NHẬN QUA CODE · Sửa dịch vụ có thể ghi đè SOP bằng bước mẫu; thuộc tính nhập không được lưu
**Vị trí:** `services.js` map `servicesData` ~455–510 không expose `steps`, `petType`, `commission`, `staffLevel` từ schema; `tab-service-catalog.js` ~465–585 mở edit với `getDefaultStepsForGroup` và lưu `checklist` theo list đó. Các trường `commission`, `staffLevel`, `petType` đọc từ form nhưng không có trong `upsert`.

**Cách sửa:** map cột `service.checklist` → `steps` thật và các trường tương ứng nếu schema tồn tại; nếu chưa có cột, ẩn/disable field hoặc bổ sung migration theo nghiệp vụ. Không dùng preset SOP làm dữ liệu khi sửa; cần so sánh trước/sau và versioning quy trình.

**Kiểm thử:** chỉnh tên dịch vụ mà không đụng SOP; SOP vẫn y nguyên sau reload. Thay commission/pet types phải lưu hoặc UI ghi rõ chưa hỗ trợ.

### S-09 · P1 · XÁC NHẬN QUA CODE · Nút tải ảnh ở các biên bản nhận/bàn giao/phụ phí chưa có storage thực
**Vị trí:** `tab-service-bookings.js` ~1900–1966 (tiếp nhận), ~1980–2024 (bàn giao), ~2170–2245 (phụ phí). Ảnh chỉ là `blob:` URL của file trong trình duyệt; khi có ảnh, nút Lưu ném lỗi yêu cầu bỏ ảnh. `tab-service-detail.js` cũng thông báo kho ảnh chưa cấu hình.

**Cách sửa:** ngừng trình bày đây là tính năng lưu ảnh đang hoạt động; nếu bắt buộc bằng chứng Zero-Claim, thiết kế Supabase Storage private bucket + metadata DB, access policy, MIME/size, xử lý rollback/orphan, signed URL và audit. Nếu chưa làm, khóa nút chọn ảnh có lời giải thích.

**Kiểm thử:** đính kèm JPG/PNG, lưu và mở từ máy khác; quyền xem ảnh; lỗi upload; file giả dạng; khi xóa bản ghi không còn URL orphan.

### S-10 · P1 · XÁC NHẬN QUA CODE · Tiếp nhận an toàn dùng tình trạng mặc định “bình thường” và cân 4.2kg
**Vị trí:** `tab-service-bookings.js` ~795–883. Modal mặc định `4.2` khi không có cân thật; `checkSkinNormal`, `checkEyesEarsNormal` được set `true` khi chưa có biên bản; diễn đạt như đã kiểm tra.

**Cách sửa:** mọi mốc an toàn bắt đầu ở trạng thái *chưa kiểm tra*; buộc nhân viên xác nhận checklist bắt buộc, cân thực tế và ghi ngoại lệ. Không có cân tham chiếu thì phải thể hiện thiếu, không dùng 4.2kg giả.

**Kiểm thử:** hồ sơ bé chưa có cân/lịch sử; tiếp nhận phải yêu cầu nhập và tick sau khi kiểm tra; không tự hợp thức hóa da/mắt/tai bình thường.

### S-11 · P1 · CẦN DB · Tạo lịch Spa/Taxi chưa kiểm tra xung đột công suất/lịch nhân viên
**Vị trí:** `tab-service-bookings.js` ~1400–1485. Có kiểm tra pet/customer/giá và thời gian tương lai, nhưng không thấy kiểm tra KTV đã có ca trùng giờ, năng lực phục vụ/slot và năng lực phòng theo chi nhánh ngay trong luồng insert.

**Cách sửa:** trước khi xác nhận, backend kiểm tra khoảng thời gian `[start,end)`, slot phòng/điểm tiếp nhận, KTV, policy và trạng thái service trong **giao dịch ngăn race**; unique/exclusion constraint nếu schema cho phép. Phần UI chỉ gợi ý slot, backend mới quyết định.

**Kiểm thử:** 2 admin cùng đặt cho 1 KTV lúc 14:00; ca trùng 15 phút; giới hạn công suất; gửi request trực tiếp vượt form.

### S-12 · P1 · XÁC NHẬN QUA CODE · Tiến độ Carelog luôn 100% khi có ít nhất 1 log
**Vị trí:** `tab-service-bookings.js` ~1030–1048. `doneCount = logs.length`, nên tỷ lệ luôn `logs.length / logs.length = 100%` dù SOP có 7 bước và mới làm 1 bước.

**Cách sửa:** lấy danh sách SOP đúng version đã áp dụng cho booking, map mốc `care_action` và trạng thái hoàn tất từng bước; tính `completed_required_steps / required_steps`. Không dùng số log bất kỳ làm mẫu số; trạng thái không đủ dữ liệu phải “Chưa xác định”.

**Kiểm thử:** 0/7, 1/7, 6/7, 7/7; log ghi bổ sung không thuộc SOP không tăng %.

### S-13 · P1 · XÁC NHẬN QUA CODE · Nhật ký chăm sóc chưa đọc được tên bước dù có `care_action`
**Vị trí:** `services.js` query `care_log` ~338–343 chỉ SELECT `id,appointment_id,...`, nhưng mapper ~418–425 đọc `log.care_action?.action_name` nên rơi vào `'Ghi nhận chăm sóc'`.

**Cách sửa:** join `care_action:care_action_id(action_name,...)` theo schema, map id và SOP version; nếu join bị RLS chặn phải hiện lỗi đúng; tránh lấy `description` làm tên bước.

**Kiểm thử:** ghi “Chải lông” rồi reload; timeline đúng bước, KTV và thời gian; nhật ký không có action phải có nhãn “Chưa xác định” và liên kết sửa.

### S-14 · P1 · XÁC NHẬN QUA CODE · Có thể hoàn tất ca mà không kiểm chứng đầy đủ SOP
**Vị trí:** `services.js` ~21–25 (`assertHandoverReady`) chỉ kiểm tra trạng thái, intakeRecordedAt/staffId/cân; `tab-service-bookings.js` ~1998–2030 kiểm tra tick chất lượng/tư trang nhưng không xác nhận tất cả bước SOP bắt buộc.

**Cách sửa:** server kiểm tra checklist bắt buộc, mốc staff, biên bản an toàn, yêu cầu ảnh nếu policy bắt buộc, tình trạng khẩn cấp và điều kiện bàn giao; không chỉ dựa trên checkbox client. Ca có ngoại lệ cần lý do/duyệt quản lý.

**Kiểm thử:** ca mới tiếp nhận nhưng 0 nhật ký, đã tick “đạt” → không được hoàn tất nếu SOP quy định bắt buộc.

### S-15 · P1 · XÁC NHẬN QUA CODE · Phản hồi đánh giá báo thành công khi UPDATE lỗi
**Vị trí:** `tab-service-reviews.js` ~460–495. Cập nhật `review.replyText`/`status` trong state **trước** khi gọi Supabase, `.update()` không đọc `{error}`; catch cũng bị bỏ qua rồi báo “Đã gửi”.

**Cách sửa:** disable nút khi gửi; UPDATE `.select('id,shop_reply').single()`, kiểm tra lỗi và kết quả, rồi mới đổi state/toast. Nếu chỉ sửa phản hồi nội bộ chứ chưa phát ra khách, đổi từ “Đã gửi” thành “Đã lưu nội bộ”; xác nhận cơ chế publish thực tế.

**Kiểm thử:** RLS deny UPDATE, mất mạng, gửi lại, shop_reply dài, trang khách có nhìn thấy không; thất bại không được hiện “đã phản hồi”.

### S-16 · P1 · XÁC NHẬN QUA CODE · Nút “Báo khách đón bé” báo gửi thành công giả
**Vị trí:** `tab-service-detail.js` ~1031–1099, nút `btnSendNotifyPickup`. `onclick` chỉ hiển thị toast thành công; không có API SMS/ZNS/notification hoặc outbox.

**Cách sửa:** thực hiện API backend gửi qua nhà cung cấp thật + thông báo trạng thái, retry, hạn mức và audit; hoặc đổi nhãn “Sao chép tin nhắn” và tuyệt đối không nói đã gửi. Lấy `booking.customerName` và `booking.serviceName` đúng dữ liệu thay cho `booking.customer/service` không tồn tại; bỏ fallback giả.

**Kiểm thử:** bản tin đến được đúng khách; gateway timeout; số trống; ca đã bàn giao; log vẫn còn sau refresh.

### S-17 · P1 · XÁC NHẬN QUA CODE · Các nút xuất hiện trong HTML nhưng chưa có handler ở các JS đã gửi
**Vị trí:** `services.html` có `btnFilterUpcomingQuick` (~46), `btnSettleToPos` (~324), `btnShareCarelogLink` (~368), không tìm thấy tham chiếu tới các ID này trong JS Dịch vụ đã gửi. Còn cụm menu static `menuActionViewDetail/Confirm/Intake/ChangeStaff/Complete/Cancel` cần rà với portal menu động.

**Cách sửa:** nối sự kiện rõ ràng với chức năng được cho phép, **hoặc ẩn/disable** cùng tooltip “Chưa hỗ trợ”; riêng thanh toán POS phải có đường giao dịch với phân hệ Bán hàng và không được tự đánh dấu `PAID`.

**Kiểm thử:** click từng nút khi có/không có lịch, kiểm tra trạng thái sau reload và module đích; automation smoke test nếu được.

### S-18 · P0 · RỦI RO XSS · Render review, booking, catalog và modal từ dữ liệu thô
**Vị trí:** `tab-service-reviews.js` ~145–178 (tên, bình luận, reply); `tab-service-bookings.js` ~175–181, 303–394; `tab-service-catalog.js` ~296–343, 38–90. Một số hàm có escape nhưng nhiều vị trí vẫn chèn thẳng vào `innerHTML`/thuộc tính. Custom pet species từ người nhập cũng có thể được render thô.

**Cách sửa:** thống nhất một tầng renderer an toàn (DOM `textContent`/template có escape text + attribute), không dùng `innerHTML` với giá trị do khách/admin nhập. Đặc biệt bình luận khách hàng phải được coi là untrusted.

**Kiểm thử:** comment chứa HTML, tên dịch vụ chứa dấu nháy/`<`/`&`, custom species chứa thẻ HTML; không có script chạy, không làm mất event table.

### S-19 · P1 · XÁC NHẬN QUA CODE · Đánh giá thiếu rating bị coi là 5 sao
**Vị trí:** `services.js` ~540–560 (`rating: r.rating || 5`), `tab-service-reviews.js` ~26–35 và ~145–149 (`Number(r.rating) || 5`). Null/0 bị ép thành 5, làm sai KPI và lọc.

**Cách sửa:** validate `rating` trong [1,5] đúng kiểu; null/ngoài khoảng là “Chưa có điểm” hoặc dữ liệu lỗi, không tính vào trung bình; nếu DB không cho null thì hiển thị lỗi nhập dữ liệu.

**Kiểm thử:** rating 1–5, null, 0, 6, chuỗi; trung bình và cảnh báo thấp sao tính đúng.

### S-20 · P1 · XÁC NHẬN QUA CODE · `appointment_code` thiếu được tạo từ index trên client
**Vị trí:** `services.js` map bookings ~435–443: `item.appointment_code || 'BKG-' + (1000 + idx)`; id giả có thể thay đổi theo thứ tự/khách, gây lỗi deep link.

**Cách sửa:** mọi thao tác ghi/điều hướng phải dùng `appointment.id` UUID. Nếu cần mã dễ đọc, database sinh `appointment_code` duy nhất, không từ chỉ số. Record thiếu mã cần hiển thị dấu hiệu dữ liệu thiếu để xử lý migration.

**Kiểm thử:** reorder query, tạo lịch mới, lịch cũ code null; không chuyển nhầm ca.

### S-21 · P1 · XÁC NHẬN QUA CODE · Query phụ bị lỗi nhưng danh sách vẫn hiển thị như đầy đủ
**Vị trí:** `services.js` ~290–365 và ~370–560. Chỉ throw nếu `appRes/svcRes/revRes` lỗi; lỗi giá, nhân viên, khách, pet hoặc carelog có thể bị thay thành `[]` và dùng fallback dữ liệu.

**Cách sửa:** với dữ liệu quan trọng như giá/nhân viên để tạo booking, phải fail-closed chức năng ghi; tách lỗi widget đọc không thiết yếu, hiển thị “thiếu dữ liệu”, giữ nguyên nơi bị lỗi. Các hành động lưu dùng fetch lại dữ liệu có quyền và không dựa vào state cũ.

**Kiểm thử:** khóa `service_price_matrix` bằng RLS hoặc chặn riêng request, dữ liệu danh mục phải báo giá chưa sẵn sàng, không cho tạo booking tính giá giả.

### S-22 · P1 · XÁC NHẬN QUA CODE · Biên bản in/chữ ký dùng tên và đồ đạc mặc định giả
**Vị trí:** `tab-service-detail.js` ~924–1030: mặc định tên người nhận `Lê Lệ Quyên`, nhân viên `Ngọc Anh`, dây dắt đỏ; còn sai trường `booking.service` và `booking.customer` so với mapper thực.

**Cách sửa:** lấy từ `booking.customerName`/`serviceName` và `intakeRecord`; nếu không có thì ghi “Chưa xác nhận”, không in chữ ký người thật chưa ký. Lưu ký nhận/xác nhận với thời điểm và người ký đúng quy trình, đừng xem việc render tên là chữ ký.

**Kiểm thử:** chủ thiếu tên, ca chưa intake, không có tư trang, 2 KTV; bản in không xuất hiện khách/hàng mẫu bất kỳ.

### S-23 · P1/P2 · XÁC NHẬN QUA CODE · Phụ phí chưa xác thực chấp thuận từ khách, hiển thị hoa hồng nhưng không lưu
**Vị trí:** `tab-service-bookings.js` ~2130–2244. Modal nhận `consent`/`consentNote`, tính hoa hồng UI, nhưng không buộc bằng chứng khách duyệt và khoản commission không có trong line item; phần ghi chỉ lưu tên/tiền/lý do trong note.

**Cách sửa:** xác định policy phụ thu: có `consent_status`, người xác nhận, thời điểm, kênh, bằng chứng; chỉ ghi khi đã được phép. Nếu hoa hồng là nghiệp vụ thật, lưu commission scheme/version và tính server-side sau khi ca hoàn tất/được thanh toán.

**Kiểm thử:** chưa đồng ý, khách từ chối, phụ phí đổi nhiều lần, KTV bị chuyển, giá trị hoa hồng khớp sổ.

### S-24 · P1/P2 · XÁC NHẬN QUA CODE · Không đọc đúng các bước Carelog/ảnh cũ và chưa hỗ trợ ảnh thật
**Vị trí:** `services.js` ~338–343, ~418–429; `tab-service-detail.js` ~645–800. Query `care_log` không join `care_log_media`, nhưng renderer dùng `log.care_log_media || []`. Nút upload có cảnh báo chưa tích hợp.

**Cách sửa:** nếu hệ thống có bảng `care_log_media`, join theo quyền/quan hệ đúng; nếu chưa thì ẩn UI ảnh, không hiện ảnh demo; link ảnh dùng signed URL và chính sách riêng. Làm rõ trạng thái ảnh với khách trước khi nói “đã gửi app”.

**Kiểm thử:** mở log có/không ảnh, nhiều ảnh, ảnh bị xóa/quyền sai, album ca sau reload.

### S-25 · P2 · CẦN ROUTER · Điều hướng sang Ticket, Pet, POS phải kiểm tra module đích
**Vị trí:** `tab-service-bookings.js` ~1121–1132, `tab-service-detail.js` ~160–185 và các nút thanh toán/chia sẻ. Phần chuyển Ticket hiện chủ yếu set `sessionStorage` + click sidebar, chưa chứng minh bản ghi Ticket đã được tạo.

**Cách sửa:** phân biệt “Mở phân hệ Khiếu nại” với “Tạo ticket”; chỉ báo tạo ticket nếu backend thực sự INSERT và trả ID. Dùng router API chuẩn với entity UUID; có thông báo khi không mở được đích.

**Kiểm thử:** tạo ticket từ ca đang chạy, hoàn thành, hủy; tạo 2 lần; mở lại ticket từ danh sách; test lúc module Khiếu nại chưa load.

### S-26 · P2 · RỦI RO CSS · CSS dùng selector toàn cục có thể ảnh hưởng các phân hệ khác
**Vị trí:** `services.css` có `.admin-card`, `.admin-input`, `.admin-select`, `.subtab-content`, `.kpi-card`, `.table-toolbar-section`; `pets.css`/`customers.css` cũng khai báo các lớp tương tự.

**Cách sửa:** scope CSS mỗi phân hệ dưới `.services-module`, `.pets-module`, `.customers-module` (trừ design-system shared cố ý). Kiểm thử sau khi load các module theo thứ tự khác nhau và khi chuyển tab.

**Kiểm thử:** mở Dashboard → Customers → Pets → Services → Dashboard; font, padding, border, modal và hidden subtabs không bị thay đổi do CSS cuối cùng được inject.

---

## F. PHÂN HỆ 5 — BÁN HÀNG & KHO (ORDERS / POS / INVENTORY / VOUCHERS / RMA)

> **Đã xem:** `orders.js`, `orders.html`, `orders.css`, `tab-order-list.js`, `tab-order-detail.js`, `tab-order-products.js`, `tab-order-promos.js`. **Mã lỗi:** `O-01..O-26`. Phần có ghi “chưa có backend” nghĩa là **không thấy trong các file này**, cần kiểm tra API/trigger/RPC ngoài phạm vi trước khi khẳng định hệ thống không có cơ chế đó.

### O-01 · P0 · XÁC NHẬN QUA CODE · Mã đơn POS sinh bằng số phần tử, có thể trùng và sai năm
**Vị trí:** `tab-order-list.js:1037–1053`. `newCode = 'ORD-2026-00' + (state.orders.length + 1)` không bảo đảm duy nhất (xóa/ẩn đơn, nhiều admin cùng thao tác, reload danh sách), năm 2026 bị đóng cứng.

**Cách sửa:** tạo `order_code` tại database/backend từ sequence/UUID hoặc generator có unique constraint; nhận mã từ insert thành công; mã chỉ dùng để hiển thị, khóa nghiệp vụ vẫn là `sales_order.id`. Bắt lỗi `23505` và idempotency khi nhấn lặp.

**Kiểm thử:** hai POS đồng thời, đổi sang năm khác, refresh sau tạo, có đơn bị xóa/ẩn; mỗi đơn có mã duy nhất và không có đơn “chỉ tồn tại trên máy”.

### O-02 · P0 · XÁC NHẬN QUA CODE · Nếu thiếu địa chỉ của khách, POS lấy địa chỉ bất kỳ trong toàn hệ thống
**Vị trí:** `tab-order-list.js:1098–1111`. Khi không có địa chỉ của `activePosCustomer`, code `customer_address.select('id').limit(1)` không lọc theo khách rồi dùng làm `shipping_address_id`; người mua có nguy cơ bị gắn địa chỉ của người khác.

**Cách sửa:** tuyệt đối loại bỏ fallback lấy địa chỉ toàn hệ thống; nếu nhận tại quầy để `shipping_address_id=null` nếu schema cho phép, nếu giao hàng yêu cầu chọn/tạo địa chỉ thuộc chính `customer_id`, xác nhận quan hệ tại backend. Khách vãng lai có quy trình địa chỉ khách không định danh riêng.

**Kiểm thử:** hai khách A/B, A không có địa chỉ; tạo đơn A phải không bao giờ tham chiếu địa chỉ B. RLS/API phải từ chối ID địa chỉ không thuộc khách.

### O-03 · P0 · XÁC NHẬN QUA CODE · POS báo tạo đơn thành công dù DB lỗi, tạo đơn và chi tiết rời rạc
**Vị trí:** `tab-order-list.js:1095–1148`. `insert sales_order` chỉ lấy `data` không xử lý `error`; `insert sales_order_detail` cũng bỏ `error`; ngoại lệ bị log rồi vẫn `unshift(newOrder)`, lưu session và toast thành công. Ngay cả khi mất kết nối, UI vẫn lập hóa đơn giả thành công.

**Cách sửa:** backend/RPC `create_pos_order` có transaction: validate đầu vào, tạo order + tất cả detail + phương thức thanh toán + giữ/trừ tồn, trả về ID/code; ROLLBACK toàn bộ nếu một bước lỗi; chỉ hiển thị hóa đơn sau khi nhận kết quả và truy vấn lại. Vô hiệu nút khi đang gửi + idempotency key.

**Kiểm thử:** RLS cấm insert, lỗi insert dòng chi tiết thứ 2, mất mạng, bấm 2 lần; không được có order rỗng/mồ côi, không có toast thành công giả.

### O-04 · P0 · XÁC NHẬN QUA CODE / CẦN DB · Giá POS do client tự trừ điểm/khuyến mãi, chưa chứng minh có trừ điểm và kho ở server
**Vị trí:** `tab-order-list.js:627–704, 1037–1134`. Tier giảm 2/5/10% bằng chuỗi tên, 1 Pawpoint quy đổi 100đ, voucher/điểm trừ trực tiếp `grandTotal`; lệnh tạo đơn chỉ lưu `total_amount` và chi tiết sản phẩm, không thấy ghi trừ Pawpoint, số lượt voucher hay tồn kho.

**Cách sửa:** cấu hình quy đổi điểm/chính sách tier ở DB, server nhận `product_id, quantity, voucher_code, points_requested`; tính lại giá và hạn mức từ DB, kiểm tra số dư/khả dụng, ghi sổ giao dịch điểm, dùng voucher, trừ/giữ tồn cùng transaction. Không chấp nhận `grandTotal` do client cung cấp là nguồn sự thật.

**Kiểm thử:** điểm lớn hơn số dư; voucher hết lượt/hết hạn; hai POS mua món còn 1; sửa payload giá còn 1đ; server phải từ chối đúng và không âm điểm/kho.

### O-05 · P1 · XÁC NHẬN QUA CODE · POS tự thêm sản phẩm đầu tiên nếu không tìm thấy, không ràng buộc số lượng với tồn
**Vị trí:** `tab-order-list.js:554–579, 961–976`. Nếu tìm kiếm không khớp, code chọn `prodList[0].sku`. Giỏ cộng số lượng tùy ý mà không đối chiếu tồn khi xác nhận.

**Cách sửa:** chỉ thêm khi người dùng chọn SKU cụ thể; báo “Không tìm thấy sản phẩm”, validate `qty` là số nguyên dương ở UI và server; kiểm tra tồn tại lúc checkout, khóa hàng tồn khi ghi để tránh race.

**Kiểm thử:** nhập chuỗi không có sản phẩm và ấn Thêm; giỏ phải giữ nguyên. Nhập số lượng -1, NaN, 999 với tồn 2; không tạo được đơn sai.

### O-06 · P1 · XÁC NHẬN QUA CODE · Thông tin khách vãng lai giả và danh bạ POS chỉ lấy 50 khách
**Vị trí:** `tab-order-list.js:351–421, 1043–1054`. Khi hết nguồn dữ liệu, tạo ba khách mẫu; không nhập điện thoại thì dùng `0900000000`, không có khách thì dùng `USER-001`; truy vấn `customer.limit(50)` khiến autocomplete không tìm được khách thứ 51.

**Cách sửa:** xóa customer mock khỏi production; không giả định một guest là `USER-001`; tìm khách bằng API truy vấn theo từ khóa có phân trang; dùng guest data thật/NULL theo schema; validate số liên hệ nếu thu thập.

**Kiểm thử:** DB 0 khách; số điện thoại trống; tìm khách thứ 51; không được tự hiện tên/số của khách mẫu hay gắn nhầm user.

### O-07 · P1 · XÁC NHẬN QUA CODE · Payment method trong đơn có thể bị mặc định COD sau reload
**Vị trí:** `orders.js:680–736`, `tab-order-list.js:1108–1116`. Create POS không ghi dữ liệu `payment`/`payment_method_id`; lúc đọc mặc định `payMethod='cod'` và phân loại theo `String(payment_method_id).includes('momo'|'vnpay'|'bank'|'cash')` — khó phù hợp UUID khóa ngoại.

**Cách sửa:** xác thực bảng payment/payment_method thực tế; lưu payment theo ID + trạng thái giao dịch đối soát, join ID sang mã phương thức bằng bảng quan hệ, không suy đoán từ UUID. Đồng bộ POS tiền mặt và chuyển khoản riêng.

**Kiểm thử:** POS nhận tiền mặt/thẻ/MoMo/COD; reload phải hiện đúng phương thức và trạng thái thực.

### O-08 · P0 · XÁC NHẬN QUA CODE · Xác nhận thu tiền/COD cập nhật local trước, bỏ qua Supabase error
**Vị trí:** `tab-order-list.js:897–934, 1470–1522`. Nút một đơn và “Xác nhận đối soát toàn bộ” chuyển `paymentStatus='paid'` trước UPDATE, không kiểm tra `{error}` của Supabase; batch cộng số đơn đã xử lý dù ghi thất bại. Không thấy bằng chứng giao dịch bưu cục.

**Cách sửa:** chỉ cho vai trò kế toán/quản lý đối soát theo sao kê/batch, transaction/RPC trả số bản ghi thực đã cập nhật, trạng thái trước/sau, người duyệt, ngày đối soát, mã chứng từ; lỗi từng đơn phải được báo và không đổi UI.

**Kiểm thử:** batch có một đơn bị RLS từ chối; chỉ tính số thành công thật, tổng tiền đối soát khớp tài khoản thanh toán, không thể đối soát lại lần hai.

### O-09 · P0/P1 · XÁC NHẬN QUA CODE · Các nút chuyển trạng thái đơn báo thành công khi ghi thất bại; “Hoàn tất” ghi thành “Đã giao”
**Vị trí:** `tab-order-list.js:1154–1239, 1524–1616`. Xác nhận/huỷ/đã giao/hoàn tất đổi local và toast rồi bỏ `.error`; `completeOrder()` gán `status='completed'` trên máy nhưng UPDATE DB `order_status:'DELIVERED'`, nên reload trở về đã giao. Chỉ hiển thị cộng Pawpoint, không thấy ghi ledger.

**Cách sửa:** server state machine có các chuyển hợp lệ, xác minh điều kiện tài chính; một API update có optimistic lock/version và audit, trả trạng thái canonical, frontend reload. Riêng `complete` ghi trạng thái chuẩn theo schema, chỉ thông báo cộng điểm khi ledger thực sự ghi.

**Kiểm thử:** xác nhận rồi reload, hoàn tất rồi reload, hủy khi đang giao, API trả 403, 2 admin cùng chuyển trạng thái; không hiện “hoàn tất” ảo.

### O-10 · P1 · XÁC NHẬN QUA CODE · Mã vận đơn và hãng vận chuyển được sinh/suy diễn không có nguồn thật
**Vị trí:** `orders.js:777–789`, `tab-order-list.js:1157–1159, 1322–1325, 1621–1625`. Kể cả sau reload, trạng thái shipping được map thành `J&T Express` và mã `JT<8 ký tự UUID>`, batch sinh mã ngẫu nhiên; UI dễ khiến admin nghĩ đơn đã giao cho hãng.

**Cách sửa:** chỉ lưu mã vận đơn do hãng hoặc bộ phận vận chuyển cấp; nếu chưa có integration thì ghi rõ “Chưa bàn giao thật”, không tự tạo số tracking hợp lệ giả; map bảng shipment/delivery events nếu có.

**Kiểm thử:** đơn shipping chưa có tracking; mở modal, reload, gửi sang hãng; chỉ hiện mã có xác nhận từ đối tác.

### O-11 · P0 · XÁC NHẬN QUA CODE · RMA tự nhập tồn trước khi có kiểm định và chạy nhiều lệnh rời
**Vị trí:** `tab-order-detail.js:263–309, 346–415`. Bấm xác nhận RMA có thể cộng `inventory` ngay khi chọn `restock`, trước khi kiểm hàng; đọc tồn rồi ghi tổng mới (race), cập nhật trạng thái đơn, insert return_request/detail không transaction, nhiều `.error` bị bỏ qua.

**Cách sửa:** tách `RMA_REQUESTED → RECEIVED → INSPECTED → APPROVED → RESTOCKED/DISPOSED`, chỉ nhập lại *hàng đã kiểm định* bằng RPC atomic có mã sự kiện kho và idempotency, chống cộng tồn hai lần; điều kiện số lượng trả tính tổng theo mọi RMA trước đó, không chỉ số lượng mua.

**Kiểm thử:** gửi yêu cầu nhưng kho chưa nhận không tăng tồn; hai RMA cùng SKU, kiểm định đạt/hỏng; fail giữa cập nhật stock và insert; không lệch tồn.

### O-12 · P0 · XÁC NHẬN QUA CODE · Hiển thị đã hoàn tiền dù không gọi cổng thanh toán; RMA sang Khiếu nại chỉ qua session
**Vị trí:** `tab-order-detail.js:380–393, 418–495`, `complaints.js:618–668`. `payment_status='REFUNDED'` được đặt khi chọn refund, không thấy API refund hay xác minh bank; timeline nói “Hoàn tất bồi hoàn”. `pawpal_admin_order_rma_tickets` chỉ nằm trong sessionStorage, không tạo `support_ticket` thực.

**Cách sửa:** tách đề nghị/duyệt refund/thực hiện/refund webhook thành các trạng thái; không cập nhật `REFUNDED` trước chứng từ; liên kết `return_request.id`, `support_ticket.id`, `sales_order.id` bằng FK và giao dịch backend. Refund ngân hàng cần API/đối soát riêng và quyền phê duyệt.

**Kiểm thử:** API ngân hàng trả thất bại; hai máy khác nhau; reload/đăng nhập mới; ticket & RMA đều mở đúng cùng hồ sơ, không có thông báo “đã hoàn” giả.

### O-13 · P1 · XÁC NHẬN QUA CODE · Tồn kho, ngưỡng cảnh báo, danh mục và giá thành viên bị dùng fallback giả
**Vị trí:** `orders.js:545–579`. Nếu thiếu record inventory/field thì tự cho `stock=10, minStock=5`, category=`Thức ăn khô`, brand=`PawPal`, price member = 92.5% giá bán; tạo `originalPrice=115%` giá bán dù DB không có giá gốc.

**Cách sửa:** `stock` thiếu = “Chưa đồng bộ tồn” hoặc bắt buộc mapping inventory, không bao giờ biến null thành 10. Không tự dựng giá gốc/giá thành viên từ công thức nếu không có chính sách. Dùng trường bảng giá/tier hiện hành đã được xác nhận.

**Kiểm thử:** sản phẩm chưa có inventory row, ngưỡng tồn null, giá gốc null, danh mục thiếu; không được hiển thị số liệu giả hoặc khuyến mãi ảo.

### O-14 · P1 · XÁC NHẬN QUA CODE · Trạng thái tạm ngưng có thể bị hiển thị thành hết/sắp hết hàng
**Vị trí:** `orders.js:573`, `tab-order-products.js:101–119`. `status` dựa vào tồn trước khi xét `p.status==='INACTIVE'` khiến sản phẩm inactive có stock 0/ít được gán `Hết hàng/Sắp hết` thay vì `Tạm ngưng`.

**Cách sửa:** mô hình hóa hai thuộc tính **trạng thái kinh doanh** (ACTIVE/INACTIVE) và **tình trạng kho** (0/low/normal) độc lập, render badge cả hai.

**Kiểm thử:** INACTIVE+0, INACTIVE+2, ACTIVE+0; lọc “Tạm ngưng” phải trả đủ các sản phẩm tương ứng.

### O-15 · P0/P1 · XÁC NHẬN QUA CODE · Thêm/sửa sản phẩm có thể báo thành công dù cập nhật kho thất bại
**Vị trí:** `tab-order-products.js:646–844`. Khi sửa ghi trước vào `productsList`, `UPDATE product` và `UPDATE inventory` không xét `error`; khi tạo mới insert inventory không xét `error`, vẫn báo thành công. Product tạo xong nhưng inventory thiếu là trạng thái nửa vời.

**Cách sửa:** API/RPC transaction sản phẩm + tồn kho + SKU unique + category đúng; không optimistic-update khi chưa có xác nhận; hiển thị lỗi thực và rollback phần đã ghi nếu dùng nhiều query.

**Kiểm thử:** DB cho insert product nhưng cấm inventory, sửa SKU đụng unique, mất kết nối khi sửa, admin refresh; dữ liệu phải nhất quán.

### O-16 · P0 · XÁC NHẬN QUA CODE · Điều chỉnh/nhập/kiểm kê kho thiếu giao dịch, kiểm tra số và xử lý cạnh tranh
**Vị trí:** `tab-order-products.js:850–912, 946–1053`. `ADD/SUB/SET` trực tiếp đổi `prod.stock`, SUB âm bị chặn 0 nhưng số lượng nhập không validate; GRN và kiểm kê `UPDATE inventory(quantity_in_stock=...)` trong vòng lặp, không xét `{error}`. Hai admin cùng thao tác có thể mất cập nhật; `NaN`/số âm có thể lọt theo DOM/input.

**Cách sửa:** `inventory_adjust`/`goods_receipt_confirm`/`stocktake_confirm` qua Postgres RPC/transaction, kiểm số nguyên an toàn ≥0, stock version/lock và journal bất biến; đơn nhập có header/detail/batch id, từ chối trùng idempotency.

**Kiểm thử:** hai nhân viên cùng nhập +5, đếm -1/NaN, kiểm kê một dòng fail, nhập kho nhiều món một món không tồn tại, bấm lưu 2 lần; không âm kho, không mất log.

### O-17 · P1 · XÁC NHẬN QUA CODE · Lịch sử biến động kho chỉ nằm trong sessionStorage
**Vị trí:** `orders.js:81–104`; `tab-order-products.js:694–707, 879–889, 966–976, 1025–1035`. `addStockLog()` lưu `pawpal_admin_stock_logs` trên máy, không có insert vào journal/log kho tương ứng.

**Cách sửa:** ghi `inventory_movement`/stock ledger server-side cùng giao dịch cập nhật tồn; lưu actor, lý do, before/after, hàng, số lượng, tham chiếu GRN/đơn/RMA, thời gian; UI chỉ đọc nhật ký chính thức, không xem session là chứng từ.

**Kiểm thử:** nhập hàng ở máy A, mở lịch sử ở máy B; thống kê tồn khớp tổng biến động; xóa storage không mất lịch sử.

### O-18 · P1 · XÁC NHẬN QUA CODE · Biến thể SKU chưa được lưu và nạp lại từ DB
**Vị trí:** `tab-order-products.js:574–625, 790–825`, `orders.js:545–578`. Nhiều variant tạo mảng local `variants`; lệnh insert chỉ ghi một product và một inventory tổng, khi reload `hasVariants:false, variants:[]`.

**Cách sửa:** thiết kế `product_variant` với SKU riêng, giá và tồn của từng variant; giao dịch tạo/sửa + unique SKU; POS chọn variant ID chứ không chỉ SKU sản phẩm chính.

**Kiểm thử:** sản phẩm hai size/giá khác nhau, refresh, mua size 1, kiểm kê size 2; tồn/giá hai biến thể độc lập.

### O-19 · P1 · XÁC NHẬN QUA CODE · Đánh giá sản phẩm là dữ liệu mẫu, phản hồi có thể thành công giả
**Vị trí:** `tab-order-products.js:1510–1587, 1675–1705`. Khi không có dữ liệu session, code tự tạo ba review 4–5 sao với khách/tin nhắn giả; `submitProductReviewReply()` update Supabase không xét `.error`, chỉ sửa session/reply và báo thành công.

**Cách sửa:** query review thật theo `product_id` và pagination; empty-state trung thực; reply cần kiểm quyền và kết quả UPDATE trả bản ghi, audit. Tuyệt đối bỏ seed review giả khỏi production.

**Kiểm thử:** product chưa có review, DB trả 403 khi reply, refresh/máy khác; không xuất hiện đánh giá giả và không hiện phản hồi ảo.

### O-20 · P0 · RỦI RO XSS · Dữ liệu từ DB được ghép vào innerHTML/inline onclick, kể cả phiếu in
**Vị trí:** `tab-order-list.js:446–457, 739–749`, `tab-order-detail.js:118–151, 1720–1736`, `tab-order-products.js:123–152, 1621–1665`, `tab-order-promos.js:54–100`, `orders.js:184–365`. Tên khách/sản phẩm, SKU, review, địa chỉ được nội suy vào HTML, thuộc tính `src`, `onclick` mà chưa escape đúng ngữ cảnh.

**Cách sửa:** tạo DOM với `textContent` và `addEventListener`, escape phù hợp riêng cho text/attribute; URL ảnh chỉ cho phép HTTPS/Storage path đáng tin và dùng `setAttribute` an toàn; với rich HTML dùng sanitizer có allowlist; CSP hạn chế inline scripts.

**Kiểm thử:** tên hàng chứa `<img src=x onerror=...>`, SKU chứa `'`, voucher chứa `"`; không thực thi JS, không phá HTML/in phiếu.

### O-21 · P1 · XÁC NHẬN QUA CODE · Voucher áp dụng ở POS không kiểm ngày, lượt, giá tối thiểu, điểm yêu cầu
**Vị trí:** `tab-order-list.js:637–649`; `orders.js:597–627`. Tìm voucher active và giảm giá; không thấy kiểm `startsAt`, `endsAt`, `limit-used`, `minOrder`, `required_points`, phạm vi hàng, số lần dùng một khách trong khâu checkout.

**Cách sửa:** xét tất cả điều kiện tại server vào thời điểm đặt hàng, giữ số lượt trong giao dịch, rate limit chống dùng lặp, trả breakdown đã xác nhận; frontend chỉ hiển thị tính toán dự kiến.

**Kiểm thử:** voucher hết hạn nhưng `is_active=true`, số lượt bằng 0, đơn nhỏ hơn min, thiếu điểm, hai đơn mua đồng thời dùng suất cuối.

### O-22 · P1/P2 · XÁC NHẬN QUA CODE · Thông tin voucher bị điền ngầm hoặc ràng buộc không đúng nghiệp vụ
**Vị trí:** `orders.js:602–626`, `tab-order-promos.js:152–175, 185–205`. Voucher thiếu `end_date` hiển thị “31/12/2026”; `max_usage` null tự thành 100; form không cho `minimum_order_amount=0` dù có thể cho voucher toàn bộ; input `points` ở client sau tạo được lưu chuỗi thay vì số.

**Cách sửa:** map dữ liệu nullable trung thực, thống nhất “không giới hạn” với policy; validate ngày/timezone và kiểu dữ liệu phía backend; không tự giả định hạn sử dụng/max lượt khi DB null.

**Kiểm thử:** voucher không giới hạn, min-order=0 khi chính sách cho phép, ngày quá hạn ở múi giờ VN, maxUses lớn và points=0.

### O-23 · P1 · XÁC NHẬN QUA CODE · In hóa đơn PDF chỉ hiện thông báo, số liệu biên lai POS chưa xác nhận
**Vị trí:** `tab-order-list.js:724–779, 1657–1659`. `printInvoice()` chỉ `showToast('Đang xuất...PDF')` không tạo file; `printReceiptDirectly()` gọi browser `window.print()` nhưng toast tuyên bố gửi tới POS K80; receipt dùng `order.total` làm tiền khách đưa, tiền thối luôn 0, điểm earned tính một công thức riêng.

**Cách sửa:** in hóa đơn bằng document generator/print CSS hoặc API POS thật, gọi đúng tên “Mở hộp thoại in của trình duyệt”; lấy số tiền khách đưa, thanh toán và điểm cộng đã chốt từ transaction; không giả định thiết bị K80.

**Kiểm thử:** thanh toán tiền mặt 200k cho hóa đơn 150k => tiền thối 50k, in khi máy không kết nối, người dùng hủy hộp thoại in; không được báo đã in thành công.

### O-24 · P1/P2 · XÁC NHẬN QUA CODE · Cache và cờ lỗi không được đồng bộ hoàn toàn sau thao tác
**Vị trí:** `orders.js:502–510, 833–854`, `tab-order-products.js:839–844`. `syncOrdersAndProductsFromSupabase()` bỏ fetch trong 90 giây khi còn dữ liệu; thêm sản phẩm gọi không `force`, dễ hiển thị cache trong khi mong dữ liệu mới; lỗi trước đó có thể tồn tại trong state vì không reset `productsError/ordersError/vouchersError` nhất quán sau lần thành công.

**Cách sửa:** các thao tác write thành công gọi `{force:true}` hoặc cập nhật state có version; invalidation realtime theo bảng; reset error trước/ sau fetch theo kết quả và tránh request chồng lặp.

**Kiểm thử:** tạo sản phẩm rồi xem danh sách ngay, sửa tồn ở máy B, API lỗi rồi phục hồi; màn hình không kẹt trạng thái lỗi/stale.

### O-25 · P1 · XÁC NHẬN QUA CODE · Điều hướng chi tiết/RMA có thể tự chuyển sang đơn đầu tiên không được chọn
**Vị trí:** `tab-order-detail.js:26–28`, `tab-order-list.js:1703–1708`, `orders.js:438, 898–900`. Không thấy orderId hợp lệ, `renderOrderDetail` và `openReturnRefundModal` fallback sang đơn đầu tiên/đơn đã giao bất kỳ. Người dùng có thể tưởng mình xử lý đơn A nhưng thực ra đang ở đơn B.

**Cách sửa:** nếu không tồn tại đúng ID, show màn trống “Không tìm thấy đơn” và dừng mọi action; chỉ dùng UUID khóa thật; không fallback bằng vị trí list.

**Kiểm thử:** mở deep-link đến đơn đã xóa, ID không có, reload sau lọc; không hiển thị dữ liệu hay mở RMA của đơn khác.

### O-26 · P0/P1 · CẦN DB/RLS · Các thao tác tiền, tồn, hoàn tiền chạy từ trình duyệt không thấy kiểm vai trò phía server
**Vị trí:** các `.from('sales_order'|'inventory'|'voucher'|'return_request').insert/update` trong `tab-order-list.js`, `tab-order-products.js`, `tab-order-detail.js`, `tab-order-promos.js`. Client có thể bị sửa payload trong DevTools. File frontend không chứng minh RLS chặn thao tác trái phép.

**Cách sửa:** cung cấp ma trận quyền thu ngân/kho/kế toán/quản lý; cấm write trực tiếp nhạy cảm bằng RLS và chỉ cho RPC/backend có kiểm session, resource owner, ngưỡng tiền, transitions, audit và idempotency. Không đưa `service_role` vào client.

**Kiểm thử:** tài khoản kho thử đổi payment_status, CSKH thử cấp voucher 100%, thu ngân thử refund; backend/RLS từ chối 403, không cập nhật DB.

---

## G. PHÂN HỆ 6 — NHÂN SỰ (STAFF / ROSTER / ASSESSMENT / AUTH)

> **Đầu vào:** `staff.html/css/js`, `tab-staff-list.js`, `tab-staff-profile.js`, `tab-staff-schedule.js`, `tab-staff-assessment.js`. **Phân biệt rõ:** có nơi cố ý triển khai thực qua Supabase/RPC (`staff_shift_request`, `staff_schedule`), nhưng không vì vậy mà các nút cùng màn đều hoạt động thật. Bằng chứng backend/RLS/RPC chưa được cung cấp.

### Tóm tắt luồng thao tác

| Nhóm | Có xử lý trong code? | Ghi chú xác minh |
|---|---|---|
| Danh sách, tìm kiếm, lọc, phân trang | Có | Sai một số trường role/status, mã EMP không ổn định |
| Thêm/sửa nhân viên | Có gọi Supabase | Lỗi cập nhật không kiểm tra, cấp tài khoản tách rời và vẫn có success giả |
| Cấp tài khoản và quyền truy cập | Có gọi `/api/admin/staff/provision-account` | Chưa có route/RBAC nên chưa xác nhận backend cho phép đúng vai trò |
| Xóa nhân viên | Có DELETE | Không kiểm tra DB error, không offboard Auth |
| Khóa an toàn và điều phối lại KTV | Chủ yếu local/mock | **Chưa xử lý các lịch thật** trong hai nút xác nhận |
| Phân ca ngày/tuần | Có đọc và ghi `staff_schedule` | Save nhiều query rời, không transaction; có RPC riêng cho đơn nghỉ/đổi ca |
| Duyệt đơn nghỉ và đổi ca | Có gọi RPC | Phải xem migration/RLS mới kết luận tranh chấp/giới hạn 8h |
| Báo cáo sự cố ca | Có insert `audit_log` | Gia hạn không làm thay đổi deadline/ca thực tế |
| Đánh giá tay nghề | Có update `staff`, không chờ kết quả | Danh sách/lịch sử là dữ liệu tổng hợp giả; chưa có notification thực |
| Hồ sơ nhân sự 360° | Có render | **Lương, hoa hồng, số ca, CSAT là các số cố định** |

### N-01 · P0 · XÁC NHẬN QUA CODE · Mã nhân viên EMP sinh theo thứ tự query, đổi người khi dữ liệu thay đổi

**Vị trí:** `staff.js:229`.

**Hiện trạng / nguyên nhân:** Dữ liệu `staff` được order theo `created_at` và mã hiển thị `EMP-001...` sinh bằng `idx + 1`, trong khi khóa thật là `rawId` (UUID). Xóa một bản ghi cũ làm mã những nhân viên phía sau thay đổi; `sessionStorage` và liên kết bằng mã có thể chọn sai người.

**Cách sửa:** Lưu `employee_code` cố định, UNIQUE do server cấp; với quan hệ thao tác luôn dùng `staff.id` UUID. Di chuyển chọn nhân viên và URL/hash sang UUID, chỉ hiển thị mã EMP ổn định.

**Kiểm thử:** Tạo 3 người A/B/C, xóa B, refresh; mã A/C không đổi, hồ sơ C vẫn trỏ đúng UUID.

### N-02 · P1 · XÁC NHẬN QUA CODE · Sai quy đổi trạng thái tài khoản và nghỉ việc

**Vị trí:** `staff.js:240`.

**Hiện trạng / nguyên nhân:** `status='locked'` bị gán `RESIGNED`; mọi giá trị khác `leave`/`pause` bị gán `ACTIVE`, kể cả trạng thái lạ hoặc đã chấm dứt hợp đồng. `account_status` và tình trạng lao động là hai khái niệm khác nhau.

**Cách sửa:** Định nghĩa bộ enum theo schema (`employment_status`, `account_status`, `service_locked` nếu có), map đầy đủ, trạng thái không nhận diện -> 'Không xác định', không tự ACTIVE.

**Kiểm thử:** Seed locked, resigned, leave, pause, active, unknown; kiểm tra bộ lọc, KPI và quyền nhận ca.

### N-03 · P1 · XÁC NHẬN QUA CODE · Vai trò/chuyên môn không rõ tự rơi về Groomer

**Vị trí:** `staff.js:189`, `staff.js:193`.

**Hiện trạng / nguyên nhân:** `mapDbRoleToStaffRole` mặc định `Groomer` với role không nhận ra; `mapDbRoleToPosition` lại ưu tiên chuỗi `specialization` hơn vai trò. Người có role mới có thể được lọc/điều phối như Groomer.

**Cách sửa:** Dùng từ điển enum vai trò lấy từ backend; chức vụ và chuyên môn là trường khác nhau, role chưa hỗ trợ thì hiển thị `Chưa phân loại` và không phân công tự động.

**Kiểm thử:** Cho `role='ACCOUNTANT'`, `ADMIN`, `VET`, `CSKH` và specialization tùy ý; xác minh kết quả không tự thành Groomer.

### N-04 · P1 · XÁC NHẬN QUA CODE · Nút thêm/sửa đọc chức vụ nhưng không ghi trường vai trò/chức vụ tương ứng

**Vị trí:** `tab-staff-list.js:781`, `tab-staff-list.js:813`.

**Hiện trạng / nguyên nhân:** Form đọc `position` nhưng payload `staff.insert/update` chỉ ghi `specialization`, `shift`...; người dùng đổi chức vụ và thấy UI cập nhật cục bộ nhưng sau reload có thể quay về role cũ.

**Cách sửa:** Map lựa chọn chức vụ sang trường `role`/`position` thật theo schema, validate vai trò cho phép ở server, reload và so sánh dữ liệu trả về trước khi báo thành công.

**Kiểm thử:** Sửa nhân viên từ CSKH sang Receptionist, F5 và mở lại form; DB/row/filter vẫn cùng chức vụ.

### N-05 · P0 · XÁC NHẬN QUA CODE · Sửa nhân viên bỏ qua lỗi Supabase update

**Vị trí:** `tab-staff-list.js:812`.

**Hiện trạng / nguyên nhân:** Nhánh edit `await ...update()` nhưng không destructure/kiểm tra `{ error }` hay số dòng ảnh hưởng. Update 0 bản ghi/RLS từ chối có thể trôi qua.

**Cách sửa:** Dùng `.update(...).eq('id',UUID).select('id,...').single()`; `if(error) throw`, xác minh trường và quyền cập nhật, chặn mọi success UI khi lỗi.

**Kiểm thử:** Giả lập RLS UPDATE denied hoặc UUID không tồn tại; toast phải báo lỗi, dữ liệu trên form vẫn giữ để sửa.

### N-06 · P0 · XÁC NHẬN QUA CODE · Thêm/sửa nhân viên vẫn toast thành công sau exception hoặc thiếu client

**Vị trí:** `tab-staff-list.js:867`, `tab-staff-list.js:913`.

**Hiện trạng / nguyên nhân:** Khối `catch` chỉ log rồi tiếp tục sửa `mockStaff`, reload và hiển thị 'Đã thêm/đã cập nhật'; khi `client` là `null` mã cũng bỏ qua ghi thật.

**Cách sửa:** Thoát ngay khi không có Supabase hoặc transaction lỗi; success chỉ sau khi DB xác nhận. Giữ form đang mở, hiển thị lỗi cụ thể + retry an toàn; không thêm dòng tạm như đã lưu.

**Kiểm thử:** Ngắt mạng, sửa sai UUID, chặn insert, tắt Supabase client; tuyệt đối không hiện toast thành công.

### N-07 · P0/P1 · XÁC NHẬN QUA CODE + CẦN BACKEND · Cấp Auth account thất bại nhưng hồ sơ vẫn được coi hoàn tất

**Vị trí:** `tab-staff-list.js:848`, `tab-staff-list.js:863`.

**Hiện trạng / nguyên nhân:** Quy trình tạo staff rồi gọi endpoint cấp tài khoản riêng; API lỗi, JSON invalid hoặc lỗi quyền có thể để lại staff chưa có account, sau đó vẫn hiện success chung. Không thấy cơ chế rollback/compensation trong các file này.

**Cách sửa:** Thiết kế backend workflow có trạng thái `provisioning/active/failed`, idempotency key, audit và retry; dùng server xác định `staffId`, kiểm tra quyền cấp tài khoản, xác minh account được liên kết.

**Kiểm thử:** Cho API provisioning trả 403/500/timeout; staff không bị trình bày như đã cấp quyền và có thể thử lại không tạo tài khoản đôi.

### N-08 · P0 · CẦN BACKEND/RLS · Quyền hệ thống lấy từ checkbox client, phải chống tự cấp quyền admin

**Vị trí:** `tab-staff-list.js:855`, `tab-staff-list.js:856`.

**Hiện trạng / nguyên nhân:** Frontend gửi `systemRole` và `permissions` cùng password lên `/api/admin/staff/provision-account`. Không có file route/policy nên chưa thể xác nhận backend buộc đúng vai trò người yêu cầu.

**Cách sửa:** Backend kiểm `auth.uid()`, quyền `staff.account.provision/roles.assign`, deny-by-default; chỉ cho cấp role nằm trong allowlist theo cấp bậc; audit server, chống CSRF nếu dùng cookie; không dùng role client làm thẩm quyền.

**Kiểm thử:** Đổi payload qua DevTools thành `ADMIN` và mọi quyền khi đăng nhập nhân viên thường; API phải 403 và không thay đổi DB.

### N-09 · P1 · XÁC NHẬN QUA CODE · Sửa email/role/quyền trên tài khoản đã có chưa thực sự đồng bộ

**Vị trí:** `tab-staff-list.js:847`.

**Hiện trạng / nguyên nhân:** Khi sửa nhân viên, endpoint provision-account chỉ được gọi nếu có `accountPassword`; đổi email/role/permission nhưng để trống mật khẩu sẽ không gọi API. Bật toggle không đồng nghĩa trạng thái tài khoản đã cập nhật.

**Cách sửa:** Tách `createAccount`, `updateAccountRole`, `updateAccountEmail`, `resetPassword`, `disableAccount`. Hiển thị rõ trường nào có hiệu lực và trạng thái xác minh từ Auth/backend.

**Kiểm thử:** Edit account sẵn có: chỉ đổi quyền, chỉ đổi email, tắt tài khoản, reset pass; kiểm tra Auth/DB sau reload.

### N-10 · P1 · XÁC NHẬN QUA CODE · Sinh mật khẩu bằng Math.random và cho người dùng thấy mật khẩu cố định trên client

**Vị trí:** `tab-staff-list.js:762`.

**Hiện trạng / nguyên nhân:** Hàm tạo mật khẩu 8 ký tự dựa vào `Math.random()`; không phải CSPRNG. Mật khẩu khởi tạo cũng được giữ trong form trình duyệt.

**Cách sửa:** Ưu tiên invite/password-reset có thời hạn do Auth tạo; nếu cần sinh cục bộ, dùng `crypto.getRandomValues` + policy mạnh và không log/token hóa vào `localStorage`.

**Kiểm thử:** Nhấn sinh 20 lần, xác nhận policy độ dài/entropy; kiểm tra không lộ password trong log hay storage.

### N-11 · P0 · XÁC NHẬN QUA CODE · Xóa nhân viên không kiểm tra lỗi database, xóa luôn khỏi state

**Vị trí:** `tab-staff-list.js:343`.

**Hiện trạng / nguyên nhân:** Handler `delete` không kiểm `{ error }` hoặc số dòng xóa, sau đó xóa local và toast thành công dù RLS/foreign key có thể từ chối. Xóa staff không đồng bộ vô hiệu hóa tài khoản Auth.

**Cách sửa:** Thay hard delete bằng offboarding/soft-delete có phê duyệt; server xử lý khóa Auth, thu hồi ca, vô hiệu quyền, lưu audit, transaction cho các trạng thái liên quan.

**Kiểm thử:** Thử xóa staff có ca/ticket/credential, RLS cấm; phải từ chối rõ, giữ bản ghi và không mất chứng cứ.

### N-12 · P0 · XÁC NHẬN QUA CODE · Điều phối lại khi khóa KTV hiển thị hai lịch hẹn giả

**Vị trí:** `tab-staff-list.js:535`.

**Hiện trạng / nguyên nhân:** Modal `openReassignModal` render `BK-8902/BK-8905` cùng tên khách/bé giả, không query lịch `appointment` thật của nhân viên cần khóa.

**Cách sửa:** Load `appointment` đang pending/confirmed/in_progress theo staff UUID, ngày và chi nhánh. Không dùng mock ở màn vận hành production; nếu không tải được phải khóa thao tác điều phối.

**Kiểm thử:** Gán 0/1/3 lịch thật cho KTV; modal chỉ hiển thị đúng các lịch, kể cả ca từ chi nhánh khác.

### N-13 · P0 · XÁC NHẬN QUA CODE · Nút xác nhận/chuyển ca chỉ đổi trạng thái cục bộ nhưng báo thành công

**Vị trí:** `tab-staff-list.js:930`, `tab-staff-list.js:948`.

**Hiện trạng / nguyên nhân:** `btnConfirmReassign` và `btnDismissReassignModal` chỉ đặt `staff.serviceLocked=true`, `staff.status='PAUSE'` trong object. Không có update `staff`/`appointment`/`staff_schedule` trong hai handler.

**Cách sửa:** Đưa vào RPC/server transaction: khóa nhận ca mới, reassign appointment đúng người, kiểm tra xung đột và quyền; nếu không có nhân sự thay thì tạo queue điều phối thực; reload từ DB trước toast.

**Kiểm thử:** Sau thao tác refresh và mở phân hệ Dịch vụ: staff phải bị khóa, từng lịch chuyển người thật, không mất ca.

### N-14 · P0/P1 · XÁC NHẬN QUA CODE · Danh sách người thay không kiểm tra năng lực, lịch và tình trạng nghỉ

**Vị trí:** `tab-staff-list.js:525`.

**Hiện trạng / nguyên nhân:** Mẫu lọc người thay chỉ kiểm `status !== 'PAUSE'` và `!serviceLocked`; có thể gồm người nghỉ phép/đã nghỉ việc, sai chuyên môn, đang có ca khác hoặc vượt 8h.

**Cách sửa:** Dùng điều kiện server: account/employee active, đủ SOP/chứng chỉ, đúng loại dịch vụ/chi nhánh, không xung đột ca, chưa quá 8h; không cho xác nhận khi 0 người hợp lệ.

**Kiểm thử:** KTV nghỉ phép, sai loại dịch vụ, bị khóa ở Khiếu nại, trùng 09:00, đủ 8 giờ — phải không thể được chọn.

### N-15 · P1 · XÁC NHẬN QUA CODE · Đánh giá tay nghề là dữ liệu tổng hợp giả thay vì lịch sử sát hạch

**Vị trí:** `staff.js:262`, `staff.js:266`.

**Hiện trạng / nguyên nhân:** Mỗi lần tải staff, code tạo 1 assessment từ `skill_score` hiện tại, gán ngày cố định, giám khảo cố định và câu nhận xét mẫu. Bản đánh giá cũ không tồn tại trong dữ liệu này.

**Cách sửa:** Tạo/đọc bảng đánh giá có staff_uuid, assessor_uuid, ngày, điểm, minh chứng, kết quả, version SOP và quyền sửa; `staff.skill_score` chỉ là snapshot/điểm tổng hợp.

**Kiểm thử:** Một nhân viên có 3 lần thi qua 3 tháng; hiển thị đủ 3 lịch sử thật với người chấm/ngày/điểm.

### N-16 · P0/P1 · XÁC NHẬN QUA CODE · Lưu đánh giá bỏ qua Promise và lỗi, cập nhật state trước database

**Vị trí:** `tab-staff-assessment.js:283`, `tab-staff-assessment.js:286`.

**Hiện trạng / nguyên nhân:** Hàm `handleSaveAssessment` không async, gọi update Supabase `.then(()=>{})` mà không kiểm error; ngay lập tức thêm `mockAssessments`, mở khóa/khóa nhận việc và báo thành công. Không có insert bản ghi assessment thật.

**Cách sửa:** Dùng backend/RPC lưu assessment, cập nhật khóa năng lực cùng transaction và audit; await `.select()` + kiểm lỗi/số dòng; không thay state chính thức trước commit.

**Kiểm thử:** Chặn UPDATE bằng RLS: modal không được biến mất như thành công; F5 kết quả phải không tự biến mất.

### N-17 · P1 · XÁC NHẬN QUA CODE · Nút 'Lưu và gửi thông báo' không gửi thông báo thật

**Vị trí:** `tab-staff-assessment.js:315`.

**Hiện trạng / nguyên nhân:** `btnSendAssessNotify` gọi cùng `handleSaveAssessment(true)` rồi hiện toast 'đã gửi', nhưng không có gửi SMS/email/in-app notification hay API gửi trong handler.

**Cách sửa:** Tách `saveAssessment` và `notifyStaff` (gửi qua backend queue sau khi commit), hiển thị `Đã lưu, chưa gửi` nếu queue lỗi; lưu notification/outbox ID và audit.

**Kiểm thử:** Ngắt provider thông báo: kết quả đã lưu nhưng không được nhận là đã gửi; retry không tạo tin nhắn trùng.

### N-18 · P1 · XÁC NHẬN QUA CODE · Cho nhập điểm vượt 100/âm và kết quả không khớp điểm

**Vị trí:** `tab-staff-assessment.js:270`, `tab-staff-assessment.js:195`.

**Hiện trạng / nguyên nhân:** Handler chỉ kiểm score không rỗng, không giới hạn 0..100 hay integer; result lấy trực tiếp từ select, có thể khác quy tắc `>=80 PASS / >=60 RETRAIN`. Mở modal mặc định 85/PASS có thể được lưu khi chưa chấm.

**Cách sửa:** Validate phía server điểm 0-100, ngày, evaluator; tính result từ policy thống nhất và bắt người dùng xác nhận đã chấm thật; mở modal để trống hoặc nhãn minh họa.

**Kiểm thử:** Điểm -3, 101, 'abc', 65 nhưng PASS, không nhập gì; không lưu sai kết quả.

### N-19 · P0/P1 · XÁC NHẬN QUA CODE · Hồ sơ nhân viên hiện lương/KPI/CSAT hoàn toàn cố định

**Vị trí:** `tab-staff-profile.js:59`, `tab-staff-profile.js:55`.

**Hiện trạng / nguyên nhân:** Các giá trị lương cơ bản, hoa hồng, tổng thu nhập, giờ công, đánh giá khách, số ca đều hardcode dùng chung cho mọi nhân viên.

**Cách sửa:** Chưa có bảng lương thì hiển thị 'Chưa có dữ liệu' thay vì số minh họa; nếu có, tổng hợp từ timesheet/service payroll/review, giới hạn quyền xem lương bởi HR/manager.

**Kiểm thử:** Mở hồ sơ 2 nhân viên khác dữ liệu và 1 người không có bảng lương; không ai có KPI giả.

### N-20 · P1 · XÁC NHẬN QUA CODE · Truy cập ID nhân viên không tồn tại lại mở hồ sơ đầu tiên

**Vị trí:** `tab-staff-profile.js:28`.

**Hiện trạng / nguyên nhân:** Hàm `renderStaffProfile` fallback sang người đầu tiên khi không tìm thấy ID, và core cũng tự gán `selectedStaffId` đầu tiên. Người dùng có thể chỉnh sửa/khóa nhầm nhân viên nếu link đã cũ.

**Cách sửa:** Không fallback khi caller truyền ID cụ thể; hiển thị 'Không tìm thấy' và khóa mọi action; chỉ chọn dòng đầu khi người dùng chủ động mở danh sách hoặc không có ID yêu cầu.

**Kiểm thử:** Thử deep-link đến UUID/EMP đã xóa, phải hiển thị 404 state chứ không mở người khác.

### N-21 · P0/P1 · XÁC NHẬN QUA CODE · Phân ca cập nhật nhiều hàng rời rạc, hỏng giữa chừng

**Vị trí:** `tab-staff-schedule.js:685`, `tab-staff-schedule.js:699`.

**Hiện trạng / nguyên nhân:** Save phân ca chạy nhiều `.update` rồi `.insert` riêng. Kiểm snapshot trước vòng lặp nhưng không bảo đảm nguyên tử; network/RLS lỗi nửa chừng để lại nhân sự bị tháo ca nhưng chưa có người thay.

**Cách sửa:** Dùng Postgres RPC transaction nhận `date/shift/staff_uuid[]`, khóa dòng/unique constraints/optimistic version, validate max hours và commit toàn bộ hoặc rollback toàn bộ.

**Kiểm thử:** Mô phỏng lỗi lần update thứ hai hoặc insert bị FK: roster cũ phải giữ nguyên.

### N-22 · P1 · XÁC NHẬN QUA CODE · Lỗi query lịch bị biến thành danh sách trống, định biên sai

**Vị trí:** `staff.js:292`, `staff.js:294`.

**Hiện trạng / nguyên nhân:** Load staff vẫn gán `isLoaded=true` khi `staff_schedule` lỗi, `schedules||[]` thành roster rỗng. Dashboard phân ca và định biên có thể hiển thị 'Chưa phân ca' trong khi CSDL lỗi truy cập.

**Cách sửa:** Tách `scheduleLoadStatus` và lỗi, disable nút lưu phân ca khi chưa đồng bộ được; nút retry riêng, không coi `[]` như dữ liệu hợp lệ.

**Kiểm thử:** Chặn SELECT `staff_schedule`; lịch phải thông báo lỗi chứ không báo ca trống.

### N-23 · P1 · XÁC NHẬN QUA CODE · Giờ làm tuần coi ca NIGHT như 4h trong khi ngày coi 8h

**Vị trí:** `tab-staff-schedule.js:164`, `tab-staff-schedule.js:102`.

**Hiện trạng / nguyên nhân:** Cách tính ngày cộng NIGHT 8 giờ, nhưng lịch tuần cộng `list.length*4`, khiến tổng giờ tuần sai. Đồng thời UI có ca NIGHT nhưng luồng lưu phân ca cố ý vô hiệu hóa NIGHT.

**Cách sửa:** Tính số giờ từ `start_time/end_time` hoặc bảng shift definition duy nhất, xử lý ca qua nửa đêm; nếu chưa hỗ trợ NIGHT thì vô hiệu hóa nhất quán ở mọi màn và ghi rõ.

**Kiểm thử:** Lịch tuần có 1 NIGHT và 1 MORNING: tổng đúng theo định nghĩa ca, không bị thiếu 4 giờ.

### N-24 · P1 · XÁC NHẬN QUA CODE · Định biên đủ ca được hardcode >=2, không dựa công suất

**Vị trí:** `tab-staff-schedule.js:52`.

**Hiện trạng / nguyên nhân:** Thẻ quota kết luận đủ người khi có >=2 nhân sự cho mọi ca, không đối chiếu loại dịch vụ, số bàn/phòng, slotCapacity/chi nhánh hoặc người không đủ điều kiện.

**Cách sửa:** Tính định biên theo cấu hình + lịch thực + chứng chỉ/khóa an toàn, phân nhóm ca/chi nhánh; nếu chưa có capacity schema thì đặt 'Chưa cấu hình định biên'.

**Kiểm thử:** Ca 2 Groomer nhưng cần 3, ca có 2 người một bị khóa, ca Hotel không có Caregiver; phải cảnh báo.

### N-25 · P1 · CẦN DB/RPC · Đơn nghỉ/đổi ca và duyệt ngay thiếu quy trình nguyên tử tổng thể

**Vị trí:** `tab-staff-schedule.js:254`.

**Hiện trạng / nguyên nhân:** Frontend insert đơn `PENDING`, sau đó gọi RPC duyệt ngay. Nếu RPC thất bại thì đơn chờ duyệt còn tồn tại; điều này đã được code cảnh báo nhưng không phải workflow 'duyệt ngay' atomic. Chưa có SQL để xác minh RPC chặn trùng ca/vượt giờ và quyền duyệt.

**Cách sửa:** Ưu tiên RPC `create_and_approve_request` cho quyền phù hợp; kiểm unique, leave overlap, staff không active, 8h/ngày, đối tượng đổi ca, idempotency và audit server.

**Kiểm thử:** 2 quản lý cùng duyệt; nhân viên xin trùng ngày; RPC lỗi; xác minh 0/1 transition đúng DB.

### N-26 · P1 · XÁC NHẬN QUA CODE · Biên bản sự cố chỉ lưu audit_log, gia hạn SLA không tác động lịch

**Vị trí:** `tab-staff-schedule.js:424`, `tab-staff-schedule.js:435`.

**Hiện trạng / nguyên nhân:** `saveIncidentReport` lưu một chuỗi mô tả trong `audit_log`, bao gồm extendMinutes, nhưng không update `appointment` deadline, công suất hoặc workflow sự cố; toast nói gia hạn được ghi nhận để điều phối.

**Cách sửa:** Dùng bảng `service_incident` và liên kết appointment/staff, thông tin mức độ, thời gian được phê duyệt; thay đổi giờ ca qua server riêng và cập nhật SLA chỉ khi commit.

**Kiểm thử:** Lập biên bản cộng 30 phút; kiểm DB lịch, deadline thực, event điều phối, tránh 2 biên bản gia hạn trùng.

### N-27 · P0 · RỦI RO XSS · Dữ liệu nhân sự và tên ca đi vào innerHTML chưa escape nhất quán

**Vị trí:** `tab-staff-list.js:233`, `tab-staff-list.js:521`, `tab-staff-schedule.js:117`, `tab-staff-assessment.js:124`, `staff.js:334`.

**Hiện trạng / nguyên nhân:** Một số trường nhân viên/tên chuyên môn/số điện thoại, breadcrumb, giám khảo, ghi chú đi trực tiếp vào HTML. Hàm escapeHtml có nơi được dùng nhưng không bao phủ tất cả vị trí.

**Cách sửa:** Dùng `textContent`, node factory, escape ở mọi ngữ cảnh text và attribute; không nối tên tùy ý vào `innerHTML`; áp CSP và kiểm URL avatar.

**Kiểm thử:** Tạo staff có tên/position chứa payload HTML, duyệt danh sách, lịch, cảnh báo, modal, bài sát hạch — tất cả chỉ hiển thị text.

### N-28 · P1/P2 · CẦN DB + XÁC NHẬN QUA CODE · Danh sách/roster tải toàn bộ dữ liệu và cache 90 giây

**Vị trí:** `staff.js:219`, `staff.js:206`.

**Hiện trạng / nguyên nhân:** `staff.select('*')`, `staff_schedule.select('*')`, `staff_shift_request.select('*')` không có phân trang/ngày lọc. Cache 90 giây có thể che trạng thái khóa/ca vừa được sửa từ ticket hoặc admin khác.

**Cách sửa:** Server pagination/staff roster theo week/branch, select cột tối thiểu; realtime/invalidation sau thay đổi có debounce; dùng `force:true` sau mutation.

**Kiểm thử:** Seed >1000 nhân viên/10k lịch; sửa khóa KTV ở Khiếu nại, màn Nhân sự cập nhật đúng mà không F5.

### N-29 · P1 · CẦN DB/QUYỀN · Thông tin nhạy cảm nhân sự không có bằng chứng hạn chế theo vai trò

**Vị trí:** `staff.js:220`, `tab-staff-profile.js:59`.

**Hiện trạng / nguyên nhân:** Danh sách đọc `staff.select('*')` rồi lưu toàn bộ trong state frontend; chứa email, địa chỉ, ngày sinh, quyền hệ thống và thuộc tính tài khoản. Không có RLS/schema/bộ phận người dùng nên chưa khẳng định có rò rỉ, nhưng bề mặt dữ liệu rộng.

**Cách sửa:** Tạo staff_view công khai tối thiểu và HR_view được bảo vệ; RLS/column security + API cho lương/quyền; audit các lần đọc thông tin đặc biệt.

**Kiểm thử:** Đăng nhập lễ tân và nhân viên thường; không đọc được lương/thông tin Auth/permission của người khác.

### N-30 · P2 · XÁC NHẬN QUA CODE · Khởi tạo lặp có thể gắn event nhiều lần

**Vị trí:** `staff.js:437`, `staff.js:484`.

**Hiện trạng / nguyên nhân:** `initStaffModule()` có thể được gọi từ cả DOM ready và router; không có guard `init` cho các listener trong core, khiến `admin:subtab-change`, Escape, backdrop thêm nhiều lần nếu router gọi lại.

**Cách sửa:** Thêm `_initialized`/`AbortController` lifecycle, bind listener một lần; phân biệt load data và bind events; cleanup khi unmount.

**Kiểm thử:** Vào ra phân hệ 10 lần, click một thao tác chỉ có 1 lần handler và 1 lần fetch/transition.

---

## H. PHÂN HỆ 7 — KHIẾU NẠI (SERVICE / ORDER / TICKET DETAIL)

> **Đã xem:** `complaints.js`, `complaints.html`, `complaints.css`, `tab-complaint-services.js`, `tab-complaint-orders.js`, `tab-complaint-detail.js`. **Mã lỗi:** `K-01..K-24`. **Không nhầm Supabase `anon` key với `service_role`:** khóa `anon`/publishable là khóa public theo thiết kế, nhưng việc sử dụng client không có user session, quyền RLS và các thông tin nhạy cảm vẫn phải xem xét nghiêm ngặt. Báo cáo **không chép giá trị khóa**.

### K-01 · P0 · XÁC NHẬN QUA CODE / CẦN RLS · Supabase client riêng không mang phiên admin; hardcode URL và anon key
**Vị trí:** `complaints.js:251–269`. `getComplaintsDbClient()` tạo client mới từ URL/anon key hardcode, `auth:{persistSession:false,autoRefreshToken:false}`; comment muốn tránh policy RLS của nhân viên, nhưng anon client **không vượt RLS** mà truy cập như anon khi không có JWT user hợp lệ. Nếu bảng cấp quyền rộng cho anon thì đây có thể thành rủi ro lộ dữ liệu khách; nếu không cấp quyền thì các nút thao tác lỗi.

**Cách sửa:** bỏ client riêng + hardcode cấu hình; dùng một authenticated Supabase client chung và RLS theo role admin/staff đã xác minh. Nếu cần tổng hợp liên phòng ban, dùng API server kiểm quyền hoặc SECURITY DEFINER RPC với `search_path`/GRANT nghiêm ngặt, không mở read/write toàn bảng cho anon. Rà policy thật trước khi deploy.

**Kiểm thử:** người dùng chưa đăng nhập không đọc được ticket/phone/message và không write; admin đúng vai trò đọc được; nhân viên chi nhánh A không đọc dữ liệu B; hết hạn token xử lý đúng.

### K-02 · P0 · XÁC NHẬN QUA CODE · localStorage có thể ghi đè trạng thái/giải pháp thật từ database
**Vị trí:** `complaints.js:219–245, 392–395, 671–692`. `pawpal_complaint_overrides` lưu `status`, `resolution`, `pendingResolution`, `timeline` trong localStorage và ghi đè dữ liệu từ Supabase khi load lại. Admin máy A có thể nhìn trạng thái “đã giải quyết” không giống máy B/DB; người dùng có thể chỉnh storage thủ công.

**Cách sửa:** nguồn sự thật duy nhất cho status/approval/resolution/timeline là DB với event history; localStorage chỉ chứa tuỳ chọn giao diện không ảnh hưởng nghiệp vụ. Tránh lưu nội dung nhạy cảm khách hàng trong localStorage.

**Kiểm thử:** 2 browser/máy có overrides khác nhau, Clear Site Data, sửa localStorage thành `resolved`; tất cả cùng thấy trạng thái DB đã duyệt.

### K-03 · P0 · XÁC NHẬN QUA CODE · Tự dựng hồ sơ y tế thú cưng, bồi hoàn và bằng chứng khi thiếu dữ liệu
**Vị trí:** `complaints.js:505–545, 559–611`, `tab-complaint-detail.js:131–133, 230–252, 396–470`. Hồ sơ mất pet/ref thì đặt “Miu Con”, cân `4.5kg`, lịch `BKG-...`, check-in “bé tỉnh táo không tổn thương”, RMA/đơn giả; ticket resolved tự được gán “200 Pawpoint, PAWPALCARE50” hoặc “đã hoàn 150k”. Khi không có ảnh thì chèn ảnh Unsplash thành **ảnh bằng chứng/check-in/kho**.

**Cách sửa:** loại bỏ mọi giá trị giả liên quan an toàn pet, chứng từ tiền và bằng chứng; các ô không có dữ liệu phải hiển thị “Chưa xác minh/Chưa có bản ghi”. Đọc vaccine/carelog/photo/refund thực theo FK; không tự phát sinh kết luận sức khỏe hay xử lý tài chính.

**Kiểm thử:** ticket thiếu pet, thiếu ảnh, resolved không có compensation record; tuyệt đối không có số tiền, ảnh đối chứng hay trạng thái khám bệnh tưởng tượng.

### K-04 · P0/P1 · XÁC NHẬN QUA CODE · Tạo khiếu nại ghi ticket rồi message riêng, mất quan hệ đơn/lịch đã chọn
**Vị trí:** `complaints.js:1793–1898`. `insert support_ticket` chỉ lưu title/type/priority/status/user_id; không ghi `appointment_id`/`sales_order_id`, dù form có `refId`; sau đó insert `support_ticket_message` riêng. Message thất bại có thể để lại ticket không có nội dung; UI lại tạo đối tượng chứa refId ở local rồi reload mất.

**Cách sửa:** backend `create_ticket` transaction ghi ticket+first_message+relationship UUID+attachment metadata, chuẩn hóa loại ticket và tiếp nhận chưa xác minh. Khi lỗi bất kỳ phải rollback hoặc có reconciliation rõ; bảo vệ chống tạo trùng.

**Kiểm thử:** tạo khiếu nại cho đơn A, reload/máy B phải mở đúng đơn A; cưỡng bức lỗi ghi message không còn ticket trống; bấm gửi hai lần không tạo đôi.

### K-05 · P1 · XÁC NHẬN QUA CODE · Phân loại khiếu nại suy đoán sai, số liệu bị lẫn phân hệ
**Vị trí:** `complaints.js:479–507, 559–571, 712–715`. `isOrder = Boolean(orderRef) || type in [...list]`, mặc định còn lại là service; ticket type trống/sai enum bị đưa qua dịch vụ dù chưa rõ, `unclassifiedTickets` reset `[]` nhưng không thấy được thêm ticket.

**Cách sửa:** định nghĩa `ticket_category`/`source_type` enum có `UNKNOWN`, `ORDER`, `SERVICE`, `GENERAL`, tách `subject_ref_id` FK; ticket chưa đủ loại vào hàng chờ phân loại, không tự gán Spa/Order. Migration dữ liệu cũ bằng quy trình xác minh.

**Kiểm thử:** type `contact`, `refund`, `other`, null, `order` có ID không tồn tại; KPI mỗi nhóm khớp loại backend, không mất ticket.

### K-06 · P0/P1 · XÁC NHẬN QUA CODE · Đề xuất giải quyết/duyệt hoàn tiền chưa được lưu thành trạng thái thực
**Vị trí:** `tab-complaint-detail.js:651–713, 1064–1141`. Với option refund, code đặt local `waiting_manager_approval` nhưng DB lại `status:'processing'`; approval/reject chỉ UPDATE status `completed`/`processing`, không ghi giải pháp, số tiền, người đề xuất, người duyệt hay phiếu giải ngân. localStorage làm cho một máy trông như đã chờ quản lý.

**Cách sửa:** schema/transaction riêng cho `resolution_proposal` (kind/amount/reason/status), `approval_record` (actor/time/decision), status ticket theo enum thống nhất, phê duyệt dựa role và tránh tự duyệt; chỉ đánh dấu `refunded` sau sự kiện thanh toán thật. Không dùng `processing` để biểu diễn “chờ duyệt”.

**Kiểm thử:** CSKH đề nghị refund, quản lý máy khác thấy pending; CSKH không duyệt được đề nghị của mình; approve không tự chuyển tiền; reload luôn nhất quán.

### K-07 · P0 · CẦN RLS + XÁC NHẬN QUA CODE · Nút duyệt/từ chối của quản lý thiếu kiểm tra quyền thể hiện trong luồng frontend
**Vị trí:** `tab-complaint-detail.js:1064–1141`, `complaints.js:253–269`. Nút gọi `support_ticket.update(...)` trực tiếp, không thấy kiểm tra role người nhấn; tên người duyệt hardcode. Chưa có RLS nên chưa khẳng định user thường có thể thực thi, nhưng đây là lỗ hổng kiến trúc cần xác minh.

**Cách sửa:** RPC approve/reject kiểm JWT admin role, giới hạn `manager/finance`, amount threshold, self-approval, audit bất biến; UI chỉ hiển thị nút theo permission nhưng backend là nguồn quyết định.

**Kiểm thử:** CSKH gọi RPC bằng DevTools dù không thấy nút, manager duyệt case ngoài chi nhánh, hai manager duyệt cùng lúc, JWT hết hạn; chỉ giao dịch hợp lệ thành công một lần.

### K-08 · P1 · XÁC NHẬN QUA CODE · Phân công ticket chỉ là tin nhắn, không phải owner chính thức
**Vị trí:** `tab-complaint-detail.js:750–805`, `complaints.js:397–402, 476`. “Chuyển người phụ trách” insert `support_ticket_message` với `agent_name=newStaff`, không lưu ID người phụ trách trên ticket; khi reload lấy `lastCskhMsg.agent_name` nên người vừa nhắn phản hồi sau này có thể thành “người được giao”.

**Cách sửa:** migration/field `assigned_staff_id` hoặc bảng `ticket_assignment_history`, RPC assign kiểm quyền và trạng thái nhân sự, lưu author riêng khỏi assigned staff; notify người nhận qua hệ thống.

**Kiểm thử:** giao ticket cho A, B gửi tin; owner vẫn A. Hai admin tranh giành ticket phải có lock/version hoặc last-write policy rõ.

### K-09 · P1 · XÁC NHẬN QUA CODE · “Đã gửi tới khách” chỉ insert vào support_ticket_message
**Vị trí:** `tab-complaint-detail.js:831–863`. Bấm “Gửi phản hồi” chỉ insert DB với `sender_type:'cskh'`, `agent_name` hardcode, rồi toast “Đã gửi phản hồi tới khách hàng”; không thấy call email/SMS/chat/Zalo hay outbox delivery.

**Cách sửa:** phân biệt *lưu ghi chú*, *gửi qua kênh*, *đã phát*, *đã nhận*; nếu backend customer portal đọc ticket message thì xác minh realtime/notification cụ thể, còn kênh ngoài phải có provider/outbox + delivery receipt. Actor là session staff.

**Kiểm thử:** chặn kênh thông báo, khách không đăng nhập, lỗi provider, gửi thành công; toast phải phản ánh kết quả thật chứ không chỉ insert message.

### K-10 · P1 · XÁC NHẬN QUA CODE · Yêu cầu thêm thông tin gửi Zalo/SMS/Call/Email giả, cập nhật đôi không nguyên tử
**Vị trí:** `tab-complaint-detail.js:874–945`. Chọn kênh rồi chỉ lưu text `[Zalo OA]` / `[SMS Brandname]` ... vào ticket message, đồng thời update `status:'waiting_customer'`; không có provider send/call. Nếu update status lỗi, message đã lưu nhưng UI báo lỗi.

**Cách sửa:** outbound notification service có request ID và trạng thái gửi/nhận, chuyển trạng thái `waiting_customer` dựa vào yêu cầu được phát hành theo quy tắc, transaction/outbox hoặc saga khi provider không cho atomic transaction.

**Kiểm thử:** nhà cung cấp SMS trả lỗi, email chưa cấu hình, mất mạng giữa insert và update, case bị đóng trong lúc gửi; không báo đã gửi giả.

### K-11 · P1 · XÁC NHẬN QUA CODE · Ảnh bằng chứng chỉ hiển thị qua FileReader, không upload Storage
**Vị trí:** `tab-complaint-detail.js:1227–1309`. Các nút “tải ảnh” gọi `FileReader.readAsDataURL(file)`, đẩy base64 vào mảng `ticket.evidence/checkinPhotos/warehousePhotos` trên bộ nhớ; không có `storage.upload` hay record attachment DB. Nút báo tải lên thành công.

**Cách sửa:** dùng Supabase Storage bucket private + signed URLs, metadata `ticket_attachment` gồm ticket_id, object_key, purpose, uploader, mime, size, checksum; scan/validate MIME & size server; lưu trước hoặc transaction với ticket action, không lưu base64 trong localStorage.

**Kiểm thử:** tải 5MB, file giả MIME, reload/máy khác, user ngoài ticket truy cập URL; chỉ người có quyền xem, không mất bằng chứng.

### K-12 · P1 · XÁC NHẬN QUA CODE · Nút cập nhật tiến độ RMA chỉ thay đổi giao diện
**Vị trí:** `tab-complaint-detail.js:239–291`. `btnAdvanceRmaStep` tăng `res.rmaStep`, đổi `ticket.status='resolved'` khi step 4, tạo timeline local nhưng không ghi DB/return_request/inventory/refund.

**Cách sửa:** mỗi bước thực hiện RPC có điều kiện nghiệp vụ (hàng đã nhận, kết quả kiểm định, chứng từ đổi mới/hoàn tiền), FK với `return_request` và `inventory_movement`; audit actor, timestamp.

**Kiểm thử:** click step 4 khi chưa nhận hàng, reload, mở máy B; phải bị chặn và không được đóng case giả.

### K-13 · P1 · XÁC NHẬN QUA CODE · Hoàn tất “xử lý lần 2” chỉ ghi câu đã gọi điện và tặng quà vào local
**Vị trí:** `tab-complaint-detail.js:1199–1221`. Handler không gọi backend, chỉ `ticket.reprocessed=true`, timeline mẫu “đã gọi điện ... gửi quà” và toast thành công.

**Cách sửa:** yêu cầu kết quả liên hệ có bằng chứng, người xử lý, thời gian, trạng thái approval; update ticket bằng RPC; hiển thị thao tác là “Ghi nhận kết quả” với trường cần nhập chứ không tự xác nhận khách đã nhận quà.

**Kiểm thử:** chưa gọi điện, khách không bắt máy, có yêu cầu bồi hoàn vượt quyền; không thể bấm 1 nút tạo chứng từ giả.

### K-14 · P0/P1 · XÁC NHẬN QUA CODE / CẦN DB · Khóa nhận việc KTV ngay trong ticket không có kiểm tra chấp thuận hay role
**Vị trí:** `tab-complaint-detail.js:135–165`, `complaints.js:316`. Chỉ tìm nhân viên qua `full_name` được chứa trong `staffExecuted`; click cập nhật `staff.service_locked` trực tiếp và hiển thị thành công. Query danh sách `staff` không lấy `service_locked`; truy vấn cột chưa xác nhận schema, duplicate tên có thể khóa nhầm người.

**Cách sửa:** liên kết bằng `staff_id` chuẩn từ appointment; quy trình safety hold với lý do/evidence/manager approval, chặn phân lịch ở backend, kiểm tra permission và audit, query đầy đủ trạng thái khóa.

**Kiểm thử:** hai nhân viên trùng tên, KTV chuyển chi nhánh, manager/CSKH khác quyền, DB lỗi; không khóa nhầm nhân viên.

### K-15 · P1 · XÁC NHẬN QUA CODE · Chi tiết ticket không tìm thấy ID lại mở ticket đầu tiên
**Vị trí:** `tab-complaint-detail.js:30–36`, `complaints.js:21–23, 977–998`. `allTickets.find(...) || allTickets[0]`, `currentTicketId` mặc định `TKT-001`. Deep-link/handover ID không tồn tại có thể hiển thị hồ sơ người khác và người dùng bấm thao tác.

**Cách sửa:** không fallback sang record đầu tiên; khi ID không tồn tại hiển thị “Không tìm thấy / Không có quyền”, vô hiệu mọi nút ghi; FK ID phân biệt display code và UUID.

**Kiểm thử:** deep-link ID sai/đã xóa, account không có quyền xem, session ID cũ; không tự mở ticket người khác.

### K-16 · P1 · XÁC NHẬN QUA CODE · Dùng ticket display code làm `support_ticket_message.ticket_id`
**Vị trí:** `tab-complaint-detail.js:840–853`, `complaints.js:510–512, 566–568`. `currentTicketId` là `ticket.ticket_code || ticket.id`, nhưng `btnSendComplaintMessage` ghi trực tiếp `ticket_id:ticketId`, không map về `ticket.rawId`; nếu hệ thống có `ticket_code` khác UUID, insert message sẽ lỗi FK/kiểu dữ liệu.

**Cách sửa:** mọi lệnh ghi sử dụng `ticket.rawId` UUID; display code chỉ dùng tìm kiếm/trình bày; truyền object/resource ID nhất quán.

**Kiểm thử:** ticket có `ticket_code='TKT-0001'`, DB ID UUID; gửi phản hồi, chuyển người xử lý, tạo notes phải gắn đúng ticket.

### K-17 · P1 · XÁC NHẬN QUA CODE · Bộ lọc “Của tôi” hardcode người phụ trách
**Vị trí:** `tab-complaint-services.js:132`, `tab-complaint-orders.js:113`. Hai màn so sánh tên nhân viên với các chuỗi cố định khác nhau, không dùng `auth.uid()` hoặc staff id.

**Cách sửa:** `ticket.assigned_staff_id === currentStaff.id` từ session backend, không so tên; kiểm quyền theo chi nhánh.

**Kiểm thử:** đăng nhập nhân viên A/B, chuyển assignment, đổi tên nhân viên; filter “Của tôi” luôn theo ID đúng.

### K-18 · P1 · XÁC NHẬN QUA CODE · SLA dùng thời hạn cố định và trạng thái chờ duyệt/xử lý lại coi như khẩn/quá hạn
**Vị trí:** `complaints.js:118–177`. `created_at + 2h` với high/damaged/injury, còn lại `+4h`; `waiting_manager_approval` gắn `URGENT`, `reprocessing` gắn `OVERDUE` bất kể actual deadline; thiếu chính sách tạm dừng SLA, ngày nghỉ, lịch ca, severity riêng.

**Cách sửa:** bảng SLA policy theo loại case/priority và business hours, `due_at`, `paused_at`, `escalation_at`; separate workflow status khỏi time-overdue. Server calculate due/timezone và refresh theo thời gian.

**Kiểm thử:** ticket chờ quản lý còn hạn 3h, quá hạn 1h, ngày nghỉ, đổi priority; số liệu SLA khớp policy thật.

### K-19 · P1 · XÁC NHẬN QUA CODE · Các query phụ thất bại nhưng dữ liệu bị hiểu là rỗng, ghép sai hồ sơ
**Vị trí:** `complaints.js:298–334`. Chỉ throw nếu lỗi tickets/messages/staff; query customers/profiles/pets/appointments/orders/products lỗi thì `data=[]`, sau đó dựa vào các fallback giả và vẫn báo “Nạp thành công”. Hai query appointments/orders có `limit(400)`.

**Cách sửa:** kiểm tra và biểu diễn lỗi từng nguồn; nếu thiếu dữ liệu liên kết, hiển thị “Không thể tải dữ liệu đối chứng” chứ không thay bằng bằng chứng mẫu; load liên kết theo ID của các ticket hiện có thay vì 400 record mới nhất toàn hệ thống.

**Kiểm thử:** RLS cấm `pet_profile`, một order cách đây 6 tháng, 450 appointments; case vẫn gắn đúng entity hoặc cảnh báo thiếu dữ liệu rõ.

### K-20 · P1/P2 · XÁC NHẬN QUA CODE · Realtime bị chặn bởi cache 90 giây
**Vị trí:** `complaints.js:247–250, 288–295, 1005–1033`. Sự kiện Realtime gọi `loadComplaintsModuleData()` không `force:true`; nếu đã có ticket và TTL còn hạn, trả cache => admin không thấy trạng thái mới/khách phản hồi ngay.

**Cách sửa:** sự kiện realtime invalidate cache hoặc `{force:true}`, debounce nhiều event, merge theo ticket ID và last_updated/version, xử lý disconnect/reconnect.

**Kiểm thử:** hai admin khác trình duyệt, A chuyển trạng thái, B phải thấy trong vài giây không chờ đủ 90s.

### K-21 · P1/P2 · CẦN ROUTER · Chuyển subtab bằng selector toàn cục có thể ẩn panel của phân hệ khác
**Vị trí:** `complaints.js:950–969`, `complaints.html` / `orders.html` / `services.html`. `querySelectorAll('.complaints-module .subtab-content, .admin-module-wrapper .subtab-content, .admin-preview-content .subtab-content')` không scoped chỉ trong root khiếu nại, có thể remove `active` của module khác nếu router giữ nhiều module trong DOM; IDs `orderSearchInput`/`serviceSearchInput` trùng giữa mô-đun khác khi đồng thời mount.

**Cách sửa:** scoped `const root=...closest(...)` rồi chỉ query trong root; các ID phải namespace theo module hoặc bảo đảm unmount hoàn toàn trước khi mount module mới. Rà `admin.js` để xác nhận.

**Kiểm thử:** router preload 2 module cùng lúc, điều hướng dịch vụ→khiếu nại→đơn hàng→quay lại, mọi tab và filter chính xác.

### K-22 · P1/P2 · XÁC NHẬN QUA CODE · Xuất CSV không theo filter, không escape đầy đủ và có nguy cơ formula injection
**Vị trí:** `tab-complaint-orders.js:269–299`, `tab-complaint-services.js:315–345`. `rows` lấy toàn bộ `state...Complaints` thay vì danh sách đang lọc; chỉ escape nháy kép của tiêu đề, còn tên khách/địa chỉ/phone/ticket ID không đầy đủ; dữ liệu bắt đầu `=,+,-,@` có thể bị Excel hiểu là công thức.

**Cách sửa:** dùng một hàm `getFilteredTickets()` chung cho render+export (cho chọn all/filtered); CSV-escape mọi trường và bảo vệ formula injection khi mở spreadsheet, giới hạn PII theo quyền, kèm trạng thái export đầy đủ.

**Kiểm thử:** filter 1 trong 5 ticket, nội dung chứa dấu phẩy/nháy kép/xuống dòng, tên `=HYPERLINK(...)`; CSV không thực thi công thức và số dòng khớp lựa chọn.

### K-23 · P1 · XÁC NHẬN QUA CODE · Timeline, actor và trạng thái giao tiếp bị lẫn giữa ghi chú nội bộ và phản hồi khách
**Vị trí:** `complaints.js:397–451`, `tab-complaint-detail.js:358–393, 998–1057`. Khi đọc ticket, mọi tin nhắn nhân viên được ghép timeline; một số `sender_type` không thống nhất (`user`, `cskh`, `nhan_vien`, `internal_note`), author hardcode tên; `saveComplaintsOverrides` chọn timeline dài hơn DB, có thể giữ event local cũ hoặc lặp event. Một bước update DB sau khi insert message lỗi có thể để lại message đã lưu nhưng UI báo cả giao dịch thất bại.

**Cách sửa:** event/ticket_message có `message_kind` = customer_reply/internal_note/system_event, actor staff UUID, visible_to_customer, immutable timestamp, provider status; server ghi message + cập nhật ticket atomically, UI phân loại trên field chuẩn. Không merge timeline local làm chứng cứ.

**Kiểm thử:** ghi internal note rồi login khách, khách không nhìn thấy; hai người cùng nhắn; refresh timeline không trùng/mất event, actor đúng.

### K-24 · P0/P1 · CẦN DB/RLS · Dữ liệu khiếu nại chứa PII/health notes, chưa có bằng chứng policy đọc/ghi phù hợp
**Vị trí:** `complaints.js:309–317, 336–451`, `tab-complaint-detail.js` các lệnh UPDATE/INSERT từ frontend. Module đọc toàn bộ ticket, tin nhắn, phone và pet; quyền quản lý/CSKH/chi nhánh chưa được chứng minh. Chỉ nhìn nút ẩn/hiện không phải kiểm quyền. Dữ liệu nhạy cảm cũng được lưu/hiển thị thông qua localStorage.

**Cách sửa:** RBAC/RLS theo staff id/branch/ticket assignment, tách quyền xem hồ sơ sức khỏe và ảnh bằng chứng, audit xem/sửa/duyệt/khóa KTV, lưu trên DB/Storage riêng có quyền; PII che theo role, TTL và retention hợp lý.

**Kiểm thử:** khách hàng thường/CSKH/manager/finance/nhân viên khác chi nhánh; read/write/export cùng ticket, kể cả khi tự sửa request trên DevTools; chính sách phải chặn ở server.

---

## I. PHÂN HỆ 8 — CẤU HÌNH HỆ THỐNG (BANNER / VOUCHER / CONTENT / POLICY / AUDIT)

> **Đầu vào:** `settings.html/css/js`, `tab-settings-banners.js`, `tab-settings-content.js`, `tab-settings-system.js`, `tab-settings-audit.js`. Đọc theo nguyên tắc: một toast **'đồng bộ thành công'** không phải bằng chứng ứng dụng khác đã nhận policy; backend `/api/admin/banners`, Auth và RLS chưa được gửi.

### Tóm tắt luồng thao tác

| Nhóm | Có xử lý trong code? | Ghi chú xác minh |
|---|---|---|
| Thêm/sửa/xóa/bật/tắt Banner | Có Supabase + API fallback | Cần backend role check, XSS, kiểm đúng URL/ảnh |
| Tạo và bật/tắt Voucher | Có gọi Supabase | Cần xác minh quota, ràng buộc đồng bộ Orders/Checkout và số dòng update |
| Quản lý thông báo Website | Có lưu trong `systemConfig` | Chưa có bằng chứng website nhận/publish thật, `notification` khác nguồn |
| Chỉnh PawPoints và policy thanh toán/ship/booking | Có upsert `pawpal_setting` | Local ghi trước DB; lời hứa đồng bộ đa phân hệ chưa được kiểm chứng |
| Khóa an toàn cấu hình | Có thay boolean frontend | **Không phải kiểm soát RBAC/server lock** |
| Bài viết Blog | Có insert/update/delete Supabase | Không bảo đảm actor/category đúng; không tự đồng bộ RAG |
| Đồng bộ RAG | Chỉ set cờ bài viết/cấu hình | **Chưa có lệnh indexing thực** trong handler |
| Nhật ký audit | Có query `audit_log` tối đa 50 dòng | Actor có thể lấy từ localStorage, audit lỗi không được chặn, trạng thái SSOT mặc định |

### CFG-01 · P0 · XÁC NHẬN QUA CODE / CẦN XÁC MINH TOKEN · Token vận chuyển đặt trong JS frontend và lưu cấu hình công khai với client

**Vị trí:** `settings.js:326`, `settings.js:383`, `tab-settings-system.js:400`.

**Hiện trạng / nguyên nhân:** `DEFAULT_SYSTEM_CONFIG.shippingPolicy.apiKey` có chuỗi giống token production; cấu hình shipping chứa `apiKey` được lưu trong `localStorage` và `pawpal_setting` do client đọc. **Không có căn cứ xác nhận chuỗi mặc định là credential thật**, nhưng mô hình hiện tại có thể phơi secret thật nếu nhập vào form.

**Cách sửa:** Không đưa credential thật vào browser, default config hay hàng `pawpal_setting` đọc từ client; lưu ở server secret manager, API chỉ trả `configured:true`/masked metadata; nếu token trong repo từng hoạt động thì thu hồi/rotate và rà git history.

**Kiểm thử:** DevTools/Application/Network/source/repo search không thấy token thật; nhân viên thường chỉ thấy trạng thái cấu hình, không đọc secret.

### CFG-02 · P0 · XÁC NHẬN QUA CODE · Persist config sửa state và localStorage trước khi DB ghi thành công

**Vị trí:** `settings.js:382`, `settings.js:383`.

**Hiện trạng / nguyên nhân:** Hàm `persistSystemConfig` thay state/localStorage trước khi `pawpal_setting.upsert`. Nếu RLS/mạng lỗi, giao diện và các phân hệ đọc local có thể tin cấu hình mới dù backend chưa cập nhật; hơn nữa các form mutate `cfg` in-place.

**Cách sửa:** Tạo bản sao immutable, POST/RPC server xác minh quyền, transaction/version; chỉ cập nhật state/cache sau DB success; khi lỗi fetch canonical config và rollback UI.

**Kiểm thử:** Tắt mạng khi đổi phí ship; trên tab khác và sau F5 không được thấy chính sách chưa lưu.

### CFG-03 · P0/P1 · XÁC NHẬN QUA CODE · Không có Supabase client vẫn lưu local và coi persist thành công

**Vị trí:** `settings.js:386`.

**Hiện trạng / nguyên nhân:** Trong `persistSystemConfig`, khi `client` null, không throw; code đi thẳng tới kết thúc, caller tiếp tục báo đã lưu/đồng bộ.

**Cách sửa:** Thiếu client/auth phải throw lỗi sớm, từ chối thay đổi; chỉ trả success khi `upsert` có dòng version hợp lệ và readback.

**Kiểm thử:** Xóa/không khởi tạo Supabase client, lưu chính sách — chỉ hiện lỗi và không đổi state.

### CFG-04 · P0 · XÁC NHẬN QUA CODE / CẦN RLS · Khóa an toàn Safe Mode chỉ là boolean ở browser, không bảo vệ backend

**Vị trí:** `settings.js:376`, `tab-settings-system.js:570`.

**Hiện trạng / nguyên nhân:** `isSafeModeLocked` nằm trong state local và được đảo trực tiếp khi bấm nút; không có phiên duyệt, auth hoặc kiểm server. Nhiều mutation (banner/voucher/article/notice) không kiểm flag trước hành động.

**Cách sửa:** Thiết kế `configuration_lock` server với quyền unlock, thời hạn, actor, 2FA/re-auth nếu cần, audit; mọi endpoint/RPC cấu hình phải kiểm lock và vai trò; UI chỉ hiển thị trạng thái.

**Kiểm thử:** Set `PawpalSettings.state.isSafeModeLocked=false` bằng DevTools hoặc gọi API khi UI khóa; backend vẫn phải từ chối.

### CFG-05 · P0 · XÁC NHẬN QUA CODE · Audit log cho client tự chọn staffId, có UUID dự phòng và bỏ qua lỗi

**Vị trí:** `settings.js:268`, `settings.js:273`, `settings.js:283`.

**Hiện trạng / nguyên nhân:** `logSystemAudit` lấy actor từ local/sessionStorage có thể sửa và dùng UUID cứng nếu thiếu; insert audit từ frontend, bắt lỗi rồi bỏ qua. Không bảo đảm audit ghi đúng người và kịp với transaction cấu hình.

**Cách sửa:** DB trigger/RPC/Edge Function tự lấy `auth.uid()` và subject staff mapping; ghi before/after/diff, source, success/failure, request ID trong cùng transaction. Bảo vệ audit chống UPDATE/DELETE từ client.

**Kiểm thử:** Sửa localStorage giả admin, chặn insert audit; hệ thống phải không chấp nhận giả actor và không báo 'đã kiểm toán'.

### CFG-06 · P0/P1 · XÁC NHẬN QUA CODE · Nhật ký gắn nhãn 'Đã đồng bộ SSOT' cho mọi sự kiện

**Vị trí:** `settings.js:626`.

**Hiện trạng / nguyên nhân:** Mọi dòng trả về từ `audit_log` được map `status:'Đã đồng bộ SSOT'` bất kể có đồng bộ thực, lỗi job, hay nguồn sự kiện khác. KPI và bảng Audit do đó không là bằng chứng SSOT.

**Cách sửa:** Lấy trạng thái đồng bộ từ `sync_job`/outbox với `queued/processing/succeeded/failed` + completed_at/target; nếu không có, hiển thị `Không theo dõi`.

**Kiểm thử:** Tạo job thất bại hoặc audit không liên quan cấu hình: không được hiện 'Đã đồng bộ SSOT'.

### CFG-07 · P1 · XÁC NHẬN QUA CODE · Thiếu row cấu hình thì dùng giá trị công ty/tài chính/đối tác trông như dữ liệu thật

**Vị trí:** `settings.js:293`, `tab-settings-system.js:39`.

**Hiện trạng / nguyên nhân:** DEFAULT chứa tên công ty, MST, địa chỉ, số tài khoản, merchantId, cấu hình thời gian và thông báo cụ thể. Các card `||` tiếp tục bổ sung giá trị mặc định. Nếu bảng cấu hình thiếu, người dùng có thể nhầm dữ liệu demo là cấu hình thật.

**Cách sửa:** Tách dev fixtures khỏi production; ở production thiếu `system_config` phải hiện `Chưa cấu hình` và chặn checkout/đặt lịch ở phần phụ thuộc, không tự nhận đang hoạt động.

**Kiểm thử:** Xóa row cấu hình trên staging; UI/website tuyệt đối không hiện số tài khoản hoặc chính sách mẫu như thật.

### CFG-08 · P1 · XÁC NHẬN QUA CODE · Một query phụ lỗi làm cả 9 vùng cấu hình dừng tải

**Vị trí:** `settings.js:460`.

**Hiện trạng / nguyên nhân:** `Promise.all` tải 9 bảng, lấy `find(Boolean)` rồi throw cả màn hình. Quyền đọc audit_log bị từ chối cũng làm banner, voucher, nội dung và cấu hình không tải dù từng query khác đã thành công.

**Cách sửa:** Tách `loadStatus` theo widget, bắt lỗi từng nguồn, không cho bảng nhạy cảm bắt buộc mọi vai trò; tăng quyền theo RLS rõ ràng.

**Kiểm thử:** Deny SELECT audit_log khi tài khoản chỉ quản banner; banner vẫn tải, riêng audit báo thiếu quyền.

### CFG-09 · P1/P2 · XÁC NHẬN QUA CODE · Cấu hình được nạp nhiều lần, Realtime kéo lại 9 bảng cho mọi event

**Vị trí:** `settings.js:793`, `settings.js:781`, `settings.js:430`.

**Hiện trạng / nguyên nhân:** Core gọi `loadSettingsModuleData()` ở top-level, trong `init`, focus và mỗi postgres_change của 6 bảng; không có pending promise/debounce rõ ràng. Có thể làm truy vấn chồng và response cũ ghi đè trạng thái mới.

**Cách sửa:** Tạo single-flight + request version, invalidation theo table, debounce; hủy subscription khi ngừng dùng; lấy audit theo trang, chỉ tải dữ liệu cần.

**Kiểm thử:** Phát 30 event liên tục, mở/đóng module: số query giới hạn và trạng thái mới nhất không bị data cũ ghi đè.

### CFG-10 · P1 · XÁC NHẬN QUA CODE / CẦN ROUTER · Chuyển tab cấu hình gỡ active trên mọi subtab trong contentArea

**Vị trí:** `settings.js:718`.

**Hiện trạng / nguyên nhân:** Hàm `switchSubtab()` dùng `contentArea`/`.admin-preview-content` phạm vi rộng thay vì `.settings-module-wrapper`; khi nhiều phân hệ DOM cùng tồn tại có thể tắt subtab module khác.

**Cách sửa:** Scope DOM đến root settings và áp subtab chỉ trong nó; router chịu trách nhiệm module active; đồng bộ hash không điều khiển panel ngoài module.

**Kiểm thử:** Giữ hai module trong DOM, chuyển 4 tab Settings; quay lại Dashboard/Services các panel còn active đúng.

### CFG-11 · P0 · RỦI RO XSS · Banner/voucher/notice/article/audit render chuỗi database bằng innerHTML chưa escape

**Vị trí:** `tab-settings-banners.js:185`, `tab-settings-banners.js:385`, `tab-settings-banners.js:455`, `tab-settings-content.js:132`, `tab-settings-audit.js:102`.

**Hiện trạng / nguyên nhân:** Tên banner, voucher, thông báo website, tiêu đề bài viết và mô tả audit được chèn vào HTML; vài trường `data-id`/URL nằm trong thuộc tính cũng không escape/validate chặt.

**Cách sửa:** DOM node + textContent cho mọi text, escaping đúng ngữ cảnh cho attribute và whitelist URL `https:`/đường nội bộ. Không coi dữ liệu đã lưu ở DB là trusted.

**Kiểm thử:** Tạo tiêu đề/notice/audit chứa `<img onerror=...>` và dấu nháy kép; render không thực thi JS.

### CFG-12 · P0/P1 · CẦN API BACKEND · Đường fallback `/api/admin/banners` có thể nâng quyền ngoài RLS

**Vị trí:** `tab-settings-banners.js:146`, `tab-settings-banners.js:147`.

**Hiện trạng / nguyên nhân:** Khi client insert/update/delete banner bị lỗi RLS hoặc không đủ quyền, `mutateBanner` tiếp tục thử `/api/admin/banners`. Code endpoint chưa được gửi, nên không thể kết luận đã bypass; tuy nhiên backend fallback dùng service role nếu không bắt auth/RBAC là điểm khai thác.

**Cách sửa:** Ràng buộc backend: xác thực session, CSRF (nếu cookie), check role/permission, validate action/schema, rate limit, audit; không dùng service-role vì client RLS bị deny mà không kiểm quyền tương đương.

**Kiểm thử:** Đăng nhập tài khoản ít quyền, chặn RLS banner và gửi POST thủ công tới fallback; API phải 403.

### CFG-13 · P0 · XÁC NHẬN QUA CODE · Ghi người viết bài sai: lấy staff đầu tiên hoặc UUID cố định

**Vị trí:** `tab-settings-content.js:297`, `tab-settings-content.js:298`.

**Hiện trạng / nguyên nhân:** Nếu không đọc được adminUser từ storage, code gán `author_id` cho bản ghi `staff` đầu tiên trong DB hoặc một UUID cố định. Người tạo bài có thể bị gán sang tài khoản khác; actor lưu localStorage cũng giả được.

**Cách sửa:** Backend suy ra author từ JWT/session thật, map staff account của chính người đăng nhập; không được fallback sang staff bất kỳ; thiếu mapping phải dừng và yêu cầu liên hệ admin.

**Kiểm thử:** Không có localStorage adminUser hoặc cố sửa user ID; bài phải không bị nhận nhầm tác giả.

### CFG-14 · P1 · XÁC NHẬN QUA CODE · Danh mục bài viết khi thiếu/UUID sai tự gán mục đầu tiên

**Vị trí:** `tab-settings-content.js:303`, `tab-settings-content.js:304`.

**Hiện trạng / nguyên nhân:** Form không tìm thấy category hợp lệ thì lấy `blog_category` đầu tiên, nếu trống dùng UUID hằng. Có thể đăng bài chăm sóc sức khỏe dưới category bất kỳ hoặc insert lỗi FK.

**Cách sửa:** Danh mục là FK chọn bắt buộc; tải list categories được phép, validate UUID nằm trong list; thiếu mục thì thông báo lỗi và cho tạo danh mục có thẩm quyền.

**Kiểm thử:** Để category rỗng, nhập UUID không tồn tại; không tự chọn sai danh mục.

### CFG-15 · P1 · XÁC NHẬN QUA CODE · Đánh dấu bài 'RAG synced' ngay khi insert, chưa có pipeline thực

**Vị trí:** `tab-settings-content.js:332`, `tab-settings-content.js:333`.

**Hiện trạng / nguyên nhân:** Sau INSERT bài viết, code tự push `id` vào `ragSyncedArticleIds`, gọi persist không await, rồi thông báo đã đồng bộ tri thức AI. Chưa có chunk/embed/index/query ingestion trong handler.

**Cách sửa:** Tách `article_published` và `knowledge_indexed`; kích hoạt indexing async ở backend, chờ job trả `succeeded/version`, rollback trạng thái khi lỗi; bài draft chưa được tự đưa vào tri thức public.

**Kiểm thử:** Tắt dịch vụ index, tạo bài mới; trạng thái phải `Chờ lập chỉ mục` hoặc lỗi, Copilot không nhận nội dung giả.

### CFG-16 · P1 · XÁC NHẬN QUA CODE · Hai nút 'Đồng bộ RAG' chỉ đổi flag local + local config

**Vị trí:** `tab-settings-content.js:399`, `tab-settings-content.js:418`.

**Hiện trạng / nguyên nhân:** Các handler chỉ set `article.ragSynced=true` và append id vào `systemConfig` (persist không await); không gọi endpoint lập chỉ mục và không kiểm thấy chatbot truy xuất kiến thức mới.

**Cách sửa:** Cung cấp `/api/admin/knowledge/index` có auth, idempotency, status/lastIndexedAt/version + vector store; frontend chỉ phản ánh trạng thái được backend trả về.

**Kiểm thử:** Chỉ số RAG không đổi nếu network lỗi; test chatbot truy vấn bài mới có nguồn trích dẫn phù hợp.

### CFG-17 · P1 · XÁC NHẬN QUA CODE + CẦN BACKEND · Bài đã ẩn/xóa có thể còn nằm trong danh sách cho RAG

**Vị trí:** `tab-settings-content.js:449`, `tab-settings-content.js:489`.

**Hiện trạng / nguyên nhân:** Đổi trạng thái và xóa bài viết không gỡ `ragSyncedArticleIds` và không báo reindex/delete knowledge; nếu có hệ thống RAG thật đọc cache trước đó, tri thức bị rò/cũ.

**Cách sửa:** Dùng event-outbox `article_unpublished/deleted`, cascade invalidate index và lịch sử; chatbot chỉ truy xuất version PUBLISHED/approved, tách knowledge public/internal.

**Kiểm thử:** Đồng bộ bài A, chuyển A sang ẩn; hỏi bot về A và xác minh không dùng nguồn bị thu hồi.

### CFG-18 · P1 · XÁC NHẬN QUA CODE · Trạng thái bài viết thiếu/khác enum tự bị coi công khai

**Vị trí:** `settings.js:555`, `settings.js:556`.

**Hiện trạng / nguyên nhân:** Map `blog_post.status` bắt đầu từ `published`, chỉ đổi khi `DRAFT/ARCHIVED/HIDDEN`; mọi unknown/null/PENDING_REVIEW` hiển thị như công khai.

**Cách sửa:** Map enum đầy đủ, unknown -> `Không xác định/Chờ kiểm duyệt`; publication phải kiểm `published_at`/approval và quyền.

**Kiểm thử:** Bài `PENDING_REVIEW`, status null, `PUBLISHED`, `ARCHIVED`; UI và website khớp DB.

### CFG-19 · P1 · XÁC NHẬN QUA CODE · Thông báo Website trộn nguồn `notification` với `websiteNotices` và dùng `is_read` như đang bật

**Vị trí:** `settings.js:582`, `settings.js:591`.

**Hiện trạng / nguyên nhân:** Nếu config có `websiteNotices` thì toàn bộ notification DB bị bỏ qua; nếu fallback sang bảng `notification`, trạng thái đã đọc của thông báo cá nhân `is_read` lại được coi là bật/tắt trên website.

**Cách sửa:** Tách bảng `website_notice`/publication một SSOT với `status`, `start_at/end_at`, target, locale; nếu dùng notification bảng khác, không diễn giải `is_read` thành published.

**Kiểm thử:** Tạo thông báo đã đọc/chưa đọc và banner topbar; danh sách website không thay theo trạng thái đọc cá nhân.

### CFG-20 · P1 · XÁC NHẬN QUA CODE · Nút lưu thông báo chỉ ghi JSON cấu hình, chưa chứng minh publish website

**Vị trí:** `tab-settings-banners.js:1113`, `tab-settings-banners.js:1123`.

**Hiện trạng / nguyên nhân:** Tạo/bật/tắt/xóa notice thao tác `systemConfig.websiteNotices` và toast nói đã đồng bộ website. Không thấy cơ chế cache invalidation/website subscribe/notification entity ghi tương ứng trong các handler.

**Cách sửa:** Thiết kế API website notice SSOT và event publish; chỉ thông báo `Đã xuất bản` nếu website đã nhận/có trạng thái verified. Nếu chỉ thay setting thì toast `Đã lưu cấu hình`.

**Kiểm thử:** Lưu notice mới và mở website trình duyệt khác; kiểm topbar/popup xuất hiện thực sự; khi lỗi sync báo rõ.

### CFG-21 · P1 · XÁC NHẬN QUA CODE · Lưu/bật/tắt/xóa thông báo mutate state trước, lỗi không rollback

**Vị trí:** `tab-settings-banners.js:495`, `tab-settings-banners.js:524`.

**Hiện trạng / nguyên nhân:** Handler đổi active/xóa tạo bản sao hoặc mutate `notificationsList` trước `persistSystemConfig`. Persist lỗi thì state vẫn đổi; người dùng nhìn thấy trạng thái chưa lưu.

**Cách sửa:** Dựng payload immutable, commit backend rồi re-fetch; khi lỗi rollback state hoặc reload nguồn canonical và giữ modal để retry.

**Kiểm thử:** Deny UPDATE pawpal_setting, tắt notice; bảng và preview phải giữ trạng thái cũ.

### CFG-22 · P1 · XÁC NHẬN QUA CODE · Pager voucher gắn thêm event handler sau mỗi lần render

**Vị trí:** `tab-settings-banners.js:341`, `tab-settings-banners.js:347`.

**Hiện trạng / nguyên nhân:** Các nút Prev/Next nằm ngoài table không bị thay khi render, nhưng `renderVouchers()` mỗi lần lại `addEventListener`. Sau nhiều lần search/re-render, một click chuyển nhiều trang hoặc gọi render nhiều lần.

**Cách sửa:** Bind event một lần ở `initBannersSubtab` hoặc `onclick` có overwrite; render chỉ cập nhật disabled/text và state page.

**Kiểm thử:** Tìm kiếm 10 lần, bấm Next 1 lần; đúng 1 trang, một lần render.

### CFG-23 · P1 · XÁC NHẬN QUA CODE · Thống kê voucher sai khi hết hạn/quota không xác định hoặc dùng default

**Vị trí:** `settings.js:530`, `settings.js:518`.

**Hiện trạng / nguyên nhân:** Nếu DB không có `max_usage`, `limit=200` mặc định; thiếu `end_date` hiện thời hạn cố định 2026; trạng thái `active` không xét start_date/remaining quota nhất quán ở KPI.

**Cách sửa:** Dùng `null=không giới hạn` theo schema, validate start/end/used và trạng thái server; chỉ tính eligible trong khoảng hiệu lực, không dùng default 200/2026.

**Kiểm thử:** Voucher chưa bắt đầu, hết hạn, unlimited, hết lượt, thiếu end_date; số KPI không bị thổi phồng.

### CFG-24 · P0/P1 · CẦN CROSS-MODULE · Cấu hình PawPoints chỉ đổi policy JSON, không bảo đảm POS/Customer đồng bộ

**Vị trí:** `tab-settings-banners.js:1072`, `tab-settings-banners.js:1075`.

**Hiện trạng / nguyên nhân:** Policy được lưu trong `systemConfig` và cập nhật text, nhưng phần trước đã phát hiện Bán hàng và Khách hàng có thao tác điểm từ client. Chưa có bằng chứng backend checkout/đổi điểm dùng policy mới cùng version.

**Cách sửa:** Đưa tỷ lệ vào rules/policy tại server và dùng trong RPC order/points; audit policy version/effective_at; chỉ phát biểu đồng bộ khi consumer xác nhận cache version.

**Kiểm thử:** Đổi 1 điểm 100đ thành 150đ rồi tạo POS/web checkout; kiểm số điểm/hoàn tiền nhất quán bằng tính server.

### CFG-25 · P1 · XÁC NHẬN QUA CODE · PawPoints policy nhận NaN/0/âm từ input

**Vị trí:** `tab-settings-banners.js:1055`, `tab-settings-banners.js:1067`.

**Hiện trạng / nguyên nhân:** Handler parseInt `pointVal`, `regPts` rồi persist nhưng không validate số hữu hạn, nguyên, không âm và ngưỡng tối đa. `parsedVal.toLocaleString()` trên NaN vẫn có thể hiển thị `NaN`.

**Cách sửa:** Trước mở confirm: `Number.isSafeInteger`, giá trị hợp lệ, version + hậu kiểm server. Dùng input[type=number] min/max chỉ hỗ trợ UX.

**Kiểm thử:** Nhập chữ, -1, 0 cho tỷ lệ, số rất lớn; không ghi/không hiển thị NaN.

### CFG-26 · P1 · XÁC NHẬN QUA CODE · Nút 'Kiểm tra kết nối đối tác' không ping API thật

**Vị trí:** `tab-settings-system.js:543`, `tab-settings-system.js:565`.

**Hiện trạng / nguyên nhân:** Giao diện chỉ kiểm có `shopId+apiKey` hoặc `enabled` rồi đổi badge; không thực hiện một healthcheck tới GHN, MoMo, VNPay, không phát hiện token hết hạn/outage.

**Cách sửa:** Tạo backend `/api/admin/integrations/health` xác thực admin, kiểm token server-side bằng endpoint read-only an toàn, timeout/rate limit và trạng thái mới nhất; không đẩy token về browser.

**Kiểm thử:** Token sai hoặc đối tác 503; badge phải báo `Lỗi xác thực/Không kết nối` thay vì xanh.

### CFG-27 · P1 · XÁC NHẬN QUA CODE · Thông báo đồng bộ đa phân hệ là lời hứa, không có ACK

**Vị trí:** `tab-settings-system.js:318`, `tab-settings-system.js:533`.

**Hiện trạng / nguyên nhân:** Save các policy thanh toán/ship/booking chủ yếu là `persistSystemConfig`, sau đó load và toast 'đồng bộ'. Không có callback từ Sales/Services/User Portal hay job ACK trong đoạn gửi.

**Cách sửa:** Tách `Đã lưu chính sách` với `Đã áp dụng trên X/Y hệ thống`; event/outbox + status per consumer, kiểm phiên bản. Phân hệ khác phải đọc SSOT và invalidation.

**Kiểm thử:** Sau update booking capacity, kiểm Services/website áp dụng đúng trước khi hiện 'Đã đồng bộ'.

### CFG-28 · P1 · XÁC NHẬN QUA CODE · Quy tắc kinh doanh bị hardcode khi lưu, có thể ghi đè giá trị hợp lệ

**Vị trí:** `tab-settings-system.js:510`, `tab-settings-system.js:516`, `tab-settings-system.js:308`.

**Hiện trạng / nguyên nhân:** Lưu payment config luôn tạo lại merchantId/tmnCode cố định; lưu booking policy ghi holidayNotice, meals/day, cameraAccessEnabled cố định, không giữ giá trị cũ nếu đã cấu hình riêng.

**Cách sửa:** Patch đúng field được sửa, giữ field không nằm trong form; verify schema/config object với version, không full-replace các trường partner/holiday.

**Kiểm thử:** Cho merchant ID riêng, holiday notice tắt, included meals=2; sửa giờ làm và các giá trị cũ không bị reset.

### CFG-29 · P1 · XÁC NHẬN QUA CODE · Các config card dùng `||` khiến giá trị 0/false bị thay mặc định

**Vị trí:** `tab-settings-system.js:92`, `tab-settings-system.js:108`.

**Hiện trạng / nguyên nhân:** Các trường fee/giờ/phí đổi trả dùng `||` thay thế 0 bằng default; miễn phí giao/khuyến mãi freeCancel=0 hiển thị sai, đồng thời khác giá trị backend.

**Cách sửa:** Dùng `??` khi 0 là hợp lệ, validate theo từng field, hiển thị cấu hình rỗng như `Chưa cấu hình` chứ không điền ngầm.

**Kiểm thử:** Config freeShippingThreshold=0, lateCancelFee=0, freeCancelHours=0; UI hiển thị chính xác.

### CFG-30 · P1 · XÁC NHẬN QUA CODE · Không lưu bảo đảm trạng thái thật với UPDATE/DELETE voucher nếu RLS trả 0 dòng

**Vị trí:** `tab-settings-banners.js:955`, `tab-settings-banners.js:1013`.

**Hiện trạng / nguyên nhân:** Các nút status/extend/delete voucher chỉ lấy `{error}`; Supabase đôi lúc không báo error khi filter match 0 dòng, nhưng frontend vẫn có thể toast success và audit như đã thay.

**Cách sửa:** Thêm `.select('id,...')`/`.single()` và xác minh đúng id, version, rowsAffected; dùng server permission + optimistic update.

**Kiểm thử:** Voucher code không tồn tại, delete RLS che hàng, hai người sửa cùng lúc; không được thành công giả.

### CFG-31 · P0/P1 · CẦN DB/ROUTER · Danh mục Voucher giữa Orders và Settings có thể ghi vào cột/cấu hình khác nhau

**Vị trí:** `tab-settings-banners.js:911`, `settings.js:514`.

**Hiện trạng / nguyên nhân:** Settings map `voucher_code`, `max_usage`, `discount_value` rồi tạo theo schema riêng, trong khi Orders/Promos cũng CRUD voucher với tên cột khác. Chưa xác nhận cùng một contract server nên dễ có chương trình thấy ở màn này mà checkout không nhận.

**Cách sửa:** Xác định canonical `voucher` model + RPC áp dụng phiếu; dùng chung adapter/schema migration cho Settings/Orders/Checkout; test quota chống race, code unique, eligibility authoritative.

**Kiểm thử:** Tạo voucher ở Settings, mở Orders POS/Web Checkout, dùng voucher; phải nhận đúng hiệu lực/giá trị/lượt và trừ lượt nguyên tử.

### CFG-32 · P1/P2 · XÁC NHẬN QUA CODE · Audit xem tối đa 50 bản ghi nhưng KPI gọi là tổng số

**Vị trí:** `settings.js:453`.

**Hiện trạng / nguyên nhân:** Chỉ tải tối đa 50 audit mới nhất, `statTotalAuditLogs` lấy `auditLogsList.length`, dẫn đến tổng/đồng bộ thiếu và tìm kiếm không tới các thao tác cũ.

**Cách sửa:** Server pagination/filter date/actor/target, count từ DB; audit immutable, có retention, export theo quyền.

**Kiểm thử:** Seed >60 audit; tổng chính xác, chuyển trang/tra cứu bản ghi ngày cũ được.

### CFG-33 · P0/P1 · XÁC NHẬN QUA CODE · Confirm tác động nhiều phân hệ bỏ qua phê duyệt nếu thiếu modal

**Vị trí:** `settings.js:183`.

**Hiện trạng / nguyên nhân:** Nếu thiếu element modal/route render lỗi, `openImpactConfirmationModal` gọi `onConfirm()` ngay. Đây là giao dịch cấu hình có ảnh hưởng lớn nhưng có thể không cần click xác nhận.

**Cách sửa:** Fail closed: thiếu modal thì không thực hiện mutation và hiển thị lỗi; backend yêu cầu re-auth/approver với policy thay đổi nhạy cảm.

**Kiểm thử:** Xóa DOM `impactConfirmModalOverlay` trên staging và thử sửa policy; DB không được thay.

### CFG-34 · P2 · XÁC NHẬN QUA CODE · Chỉ báo đường dẫn URL và hình banner chưa được kiểm nghiệm đúng website

**Vị trí:** `tab-settings-banners.js:822`, `settings.js:506`.

**Hiện trạng / nguyên nhân:** Form chỉ kiểm URL hình là http/https hoặc `/`, có thể cho URL không tồn tại/ảnh lỗi; trong card preview hiển thị file name thay vì ảnh. CTA link không có whitelist domain.

**Cách sửa:** Server validate URL allowlist/asset storage và HTTP Content-Type, preview ảnh với fallback, kiểm `https:`/đường tương đối và chống open redirect ở website.

**Kiểm thử:** Nhập URL ảnh 404, liên kết `javascript:`, link ra domain lạ; phải từ chối/đưa cảnh báo rõ.

### CFG-35 · P1 · CẦN DB/ROUTER · Chính sách thời gian/SLA không đồng nhất với các phân hệ

**Vị trí:** `settings.js:341`, `settings.js:344`.

**Hiện trạng / nguyên nhân:** Config mặc định hủy miễn phí 4h, khác một số nghiệp vụ trong tài liệu gốc; Staff/Dịch vụ/Orders/Khiếu nại có SLA hardcode. Nếu chỉ lưu JSON ở Settings, nhiều màn vẫn dùng quy tắc riêng.

**Cách sửa:** Chuẩn hóa policy schema/endpoint (booking cutoff, SLA ticket, roster constraints, point conversion) theo version; cập nhật consumer và kiểm cross-module. Không tự chọn 2h/4h nếu chưa được chủ nghiệp vụ chốt.

**Kiểm thử:** Đổi deadline trong staging; UI dịch vụ, lịch nhân sự, xử lý yêu cầu hủy cùng áp dụng đúng một chính sách.

### CFG-36 · P2 · RỦI RO CSS · Các lớp CSS Settings và Staff dùng selector rộng ảnh hưởng module khác

**Vị trí:** `settings.css:150`, `staff.css:9`.

**Hiện trạng / nguyên nhân:** Hai CSS định nghĩa `.subtab-content`, `.admin-table`, `.kpi-card`, `.alert-item-tag` ở scope toàn cục; stylesheet module cùng load sẽ ảnh hưởng giao diện của module khác.

**Cách sửa:** Đặt namespace `.staff-module ...`, `.settings-module-wrapper ...`, CSS module hoặc cascade layer; test visual sau khi chuyển tab.

**Kiểm thử:** Nạp đồng thời stylesheet 8 phân hệ; so sánh Dashboard/Orders/Customers không đổi layout/kpi.

---

## J. MA TRẬN TEST BỔ SUNG — BÁN HÀNG & KHIẾU NẠI

| ID test | Thao tác nên chạy trên staging | Kết quả đúng / lỗi đang cần tái hiện | Gắn issue |
|---|---|---|---|
| OA-01 | POS không có mạng, tạo đơn rồi refresh | Không có success giả, không có đơn ảo | O-03 |
| OA-02 | Tạo đơn cho KH không có địa chỉ, hệ thống có địa chỉ người khác | Không thể gắn địa chỉ khách B sang khách A | O-02 |
| OA-03 | Hai nhân viên mua cùng SKU còn 1 món | Chỉ một giao dịch thành công; kho không âm | O-04, O-05, O-16 |
| OA-04 | POS redeem quá điểm, voucher hết hạn/số lượt 0 | Server không cho giảm tiền tùy ý; không trừ điểm sai | O-04, O-21 |
| OA-05 | Bấm “Hoàn tất đơn”, reload, kiểm sổ điểm | Trạng thái/điểm khớp DB; không chỉ có toast | O-09 |
| OA-06 | Đối soát COD khi UPDATE trả 403; batch 1/3 lỗi | Hiển thị lỗi từng đơn; không tính 3/3 thành công | O-08 |
| OA-07 | RMA đã duyệt nhưng hàng chưa nhập kho | Tồn chưa tăng; status refund vẫn pending khi chưa hoàn tiền | O-11, O-12 |
| OA-08 | Product không có `inventory` | Hiện dữ liệu chưa đồng bộ, không giả còn 10 | O-13 |
| OA-09 | Tạo sản phẩm với 2 biến thể rồi reload | Giá/SKU/tồn từng variant được lưu đầy đủ | O-18 |
| OA-10 | Xem review của sản phẩm chưa có đánh giá | Empty-state thật, không sinh review mẫu | O-19 |
| OA-11 | RLS cấm ghi inventory; admin bấm nhập kho rồi máy khác tải lại | Báo lỗi, không đổi tồn hoặc journal ảo | O-15..O-17 |
| KA-01 | Dùng trình duyệt chưa login thử đọc ticket | Không truy cập được PII/ticket | K-01, K-24 |
| KA-02 | Chỉnh localStorage thành trạng thái `resolved`, reload | Trạng thái luôn theo DB chứ không theo localStorage | K-02 |
| KA-03 | Ticket thiếu ảnh hoặc hồ sơ pet | Không hiển thị ảnh mẫu/kết luận thú y/số tiền đền bù giả | K-03 |
| KA-04 | Tạo ticket cho đơn UUID A, reload ở máy B | `sales_order_id` A được lưu, message có FK đúng | K-04 |
| KA-05 | CSKH đề nghị hoàn tiền, manager duyệt ở máy khác | Cả hai máy thấy proposal trạng thái nhất quán, RBAC đúng | K-06, K-07 |
| KA-06 | Giao ticket cho A; B gửi tin rồi reload | Owner vẫn A | K-08 |
| KA-07 | Bấm gửi Zalo/SMS khi chưa kết nối provider | Chỉ ghi đã lưu yêu cầu, không báo khách đã nhận | K-09, K-10 |
| KA-08 | Tải ảnh bằng chứng rồi refresh/máy B | Ảnh lưu private Storage, phân quyền xem đúng | K-11 |
| KA-09 | Bấm step 4 RMA chưa kiểm định | Server từ chối, không đóng phiếu giả | K-12 |
| KA-10 | Staff có tên trùng, tạo safety hold | Đúng staff UUID, role duyệt, audit rõ | K-14 |
| KA-11 | Ticket code `TKT-001`, ID UUID khác; gửi tin | Message insert theo UUID và hiện đúng case | K-16 |
| KA-12 | Hai admin cùng xem ticket, A cập nhật, B chờ 5s | B thấy trạng thái mới không bị TTL che | K-20 |
| KA-13 | Lọc 2/10 complaint rồi xuất CSV với tên bắt đầu '=' | Export đúng 2 nếu chọn filtered, không formula injection | K-22 |

**Kiểm tra bảo mật ngang 2 phân hệ:** thử thay ID trong request, chèn HTML/script vào tên sản phẩm/nội dung khiếu nại, reset session hoặc token hết hạn, đồng thời dùng nhiều tab và lặp click. Không gửi dữ liệu khách thật cho AI hoặc chạy bài thử này trên production.

---


### J.1. Ma trận kiểm thử Nhân sự (staging)

| ID test | Bước kiểm thử | Điều kiện PASS | Gắn issue |
|---|---|---|---|
| HR-01 | Tạo 3 staff A/B/C, xóa B, mở URL/link C | C vẫn có employee_code cố định/UUID gốc; không hiện A hoặc staff đầu tiên | N-01, N-19 |
| HR-02 | DB trả role mới và trạng thái 'locked' / 'resigned' | Không tự Groomer/ACTIVE hoặc gắn locked thành nghỉ việc | N-02, N-03 |
| HR-03 | Đổi CSKH sang Receptionist rồi F5 | Role/chức vụ thực được lưu, lọc và bảng cùng phản ánh | N-04 |
| HR-04 | RLS UPDATE staff bị 403, nút Lưu nhân viên | Giữ modal + dữ liệu cũ, không hiện toast thành công | N-05, N-06 |
| HR-05 | Supabase client không có, bấm Thêm nhân viên | Không tạo nhân viên ảo và không success | N-06 |
| HR-06 | Provision account API trả 500 sau khi INSERT staff | Staff ở trạng thái cấp account thất bại; retry không tạo tài khoản trùng | N-07 |
| HR-07 | Nhân viên thường sửa request thành systemRole ADMIN | Backend trả 403, audit permission denied; không cấp admin | N-08, N-28 |
| HR-08 | Sửa quyền/email tài khoản đã có nhưng không đổi password | Quyền/email thực sự cập nhật hoặc UI thông báo chưa hỗ trợ | N-09 |
| HR-09 | Xóa nhân viên có account và ca/ticket, FK/RLS deny | Không xóa khỏi màn hình; không để account vẫn đăng nhập sau offboarding | N-11 |
| HR-10 | Mở modal khóa KTV có 0/2 lịch thật | Hiển thị chính xác ca thật; không có BK-8902/BK-8905 ảo | N-12 |
| HR-11 | Điều phối lại 2 ca, F5 và mở Dịch vụ | KTV bị khóa DB; lịch chuyển đúng UUID, không chỉ state local | N-13 |
| HR-12 | Chọn người thay đang nghỉ phép, sai kỹ năng, đã có 8h | Không thể gán người không hợp lệ | N-14 |
| HR-13 | Nhân viên thi 3 lần: 70, 80, 95 qua 3 ngày | Hồ sơ/tổng hợp còn đủ ba bài thi có assessor thật | N-15, N-16 |
| HR-14 | Deny UPDATE skill_score rồi bấm Lưu đánh giá | Không success, không mở khóa/khóa cục bộ | N-16 |
| HR-15 | Bấm 'Lưu và gửi thông báo' khi không có provider | Không thông báo đã gửi; có trạng thái outbox lỗi nếu có | N-17 |
| HR-16 | Lưu điểm -2, 101, 'abc', 65 nhưng PASS | Backend/form chặn score sai; result nhất quán | N-18 |
| HR-17 | Xem hồ sơ 2 staff lương/ca/CSAT khác nhau | Không hiển thị lương và chỉ số mẫu giống nhau; giới hạn quyền HR | N-19, N-29 |
| HR-18 | Hai admin sửa cùng roster, lỗi ở INSERT sau DELETE/UPDATE | Toàn bộ lịch rollback hoặc báo conflict, không tồn trạng thái nửa vời | N-20 |
| HR-19 | Deny SELECT staff_schedule rồi vào lịch | Hiện lỗi lịch, không hiển thị rỗng như 'Chưa phân ca' | N-21 |
| HR-20 | Kiểm ca NIGHT 8h và ca MORNING 4h | Tổng ngày/tuần đúng, không đếm NIGHT là 4h | N-22 |
| HR-21 | 2 KTV đi làm nhưng 1 bị khóa hoặc định biên cần 3 | Không báo Đạt định biên giả | N-23 |
| HR-22 | Đơn đổi ca trùng giờ, 2 manager cùng duyệt | RPC chặn xung đột/duyệt lặp; chỉ 1 kết quả bền vững | N-24 |
| HR-23 | Báo sự cố gia hạn 30 phút, mở lại ca và SLA | Audit tồn tại; deadline chỉ thay nếu nghiệp vụ thật đã commit | N-25 |
| HR-24 | Tên staff/ghi chú chuyên môn chứa HTML payload | Không thực thi JS trong list/profile/schedule/assessment | N-26 |
| HR-25 | Sửa khóa KTV trong Khiếu nại khi Staff tab đang mở | Staff không hiển thị cache cũ quá lâu, phân ca không còn nhận người bị khóa | N-27 |
| HR-26 | Chuyển qua lại module Nhân sự 10 lần | Không gắn listener chồng, không nhân đôi lưu/tải/confirm | N-30 |

### J.2. Ma trận kiểm thử Cấu hình hệ thống (staging)

| ID test | Bước kiểm thử | Điều kiện PASS | Gắn issue |
|---|---|---|---|
| CF-01 | Mở DevTools Source/Storage/Network khi cấu hình ship dùng token thật | Không có token thật; chỉ backend giữ secret; kiểm rotate nếu từng lộ | CFG-01 |
| CF-02 | Deny upsert pawpal_setting khi thay phí vận chuyển | State, localStorage, website không nhận cấu hình chưa commit | CFG-02 |
| CF-03 | Tắt Supabase client và bấm Lưu policy | Báo lỗi, không tự kết luận lưu/đồng bộ | CFG-03 |
| CF-04 | Giữ Safe Mode đang khóa, sửa JS state hoặc POST API trực tiếp | Server vẫn từ chối và audit hành vi từ chối | CFG-04 |
| CF-05 | Giả localStorage adminUser.id, ghi audit | Actor thực luôn đến từ server Auth, không dùng ID giả | CFG-05, CFG-06 |
| CF-06 | Làm job đồng bộ thất bại nhưng ghi audit thành công | Audit không gắn nhãn Đã đồng bộ SSOT tràn lan | CFG-06 |
| CF-07 | Xóa row system_config trên staging | Không hiện số tài khoản, taxId, token, Hotline mẫu như thật | CFG-07 |
| CF-08 | Deny audit_log SELECT, cho phép banner SELECT | Banners hoạt động; Audit riêng thông báo không đủ quyền | CFG-08 |
| CF-09 | Bắn liên tiếp 30 event cập nhật banner | Không có hàng trăm query đè nhau, trạng thái cuối khớp DB | CFG-09 |
| CF-10 | Có nhiều module DOM; chuyển qua 4 tab Settings | Không ẩn pane active của modules khác | CFG-10 |
| CF-11 | Banner/notice/blog/audit chứa HTML tags và quote | Tất cả render như text; không XSS/DOM injection | CFG-11 |
| CF-12 | Người không đủ quyền gửi POST `/api/admin/banners` | Backend 403, không dùng fallback service role vượt quyền | CFG-12 |
| CF-13 | Tạo blog khi localStorage không có user hoặc bị giả | Không gán author là staff đầu tiên / UUID cố định | CFG-13 |
| CF-14 | Tạo blog thiếu category hợp lệ | Không tự gán category đầu tiên hoặc UUID cứng | CFG-14 |
| CF-15 | Tắt ingestion service rồi tạo bài Blog | Không hiển thị Đã nạp RAG thành công giả | CFG-15 |
| CF-16 | Bấm cả hai nút đồng bộ RAG, mạng API lỗi | Không tăng trạng thái synced khi thiếu job ID/receipt | CFG-16 |
| CF-17 | Đã index bài A rồi ẩn/xóa bài A | Bot không còn trả thông tin A bị thu hồi | CFG-17 |
| CF-18 | Bài Blog có status PENDING_REVIEW/NULL | Không coi là published mặc định | CFG-18 |
| CF-19 | Notification người dùng đã đọc/chưa đọc | Không đảo trạng thái website notice theo is_read | CFG-19 |
| CF-20 | Tạo notice, kiểm topbar/popup web ở browser khác | Có publish receipt thực; nếu không chỉ nói Đã lưu cấu hình | CFG-20 |
| CF-21 | Deny persist websiteNotices rồi toggle/delete | List và preview rollback về DB canonical | CFG-21 |
| CF-22 | Tìm voucher 10 lần, bấm Next 1 lần | Chỉ đi đúng một trang; không listener trùng | CFG-22 |
| CF-23 | Voucher unlimited/chưa hiệu lực/hết hạn/hết lượt | KPI quota/trạng thái khớp rules, không default 200 | CFG-23 |
| CF-24 | Đổi PawPoints 100 thành 150, thao tác POS + customer redemption | Server áp giá trị đúng và có policy version nhất quán | CFG-24 |
| CF-25 | Nhập Pawpoint rate NaN/-1/0/quá lớn | Validation từ chối trước lưu DB và toast | CFG-25 |
| CF-26 | Đưa token giao hàng sai rồi bấm Kiểm tra đối tác | Thấy lỗi auth/timeout thực, không thấy badge xanh do boolean | CFG-26 |
| CF-27 | Cập nhật freeShippingThreshold, nhìn Orders và User checkout | Chỉ thông báo Đã đồng bộ nếu consumers ACK version mới | CFG-27, CFG-29 |
| CF-28 | Sửa giờ booking khi merchant ID/holiday notice tuỳ chỉnh | Không reset field ngoài form về hằng mặc định | CFG-28 |
| CF-29 | Config phí hủy 0, freeship threshold 0 | Hiển thị số 0 đúng, không thay bằng default | CFG-29 |
| CF-30 | RLS update voucher match 0 dòng | Không success/audit thay đổi nếu DB không có bản ghi | CFG-30 |
| CF-31 | Tạo voucher ở Settings, áp voucher ở Orders và Checkout | Cùng schema/rules, trừ quota nguyên tử, đúng hạn mức | CFG-31 |
| CF-32 | Seed 100 audit, lọc bản ghi cũ | Tổng phản ánh cả 100; có pagination server, không cắt 50 | CFG-32 |
| CF-33 | Xóa element Impact modal, bấm thay cấu hình | Fail closed; không thực thi callback đổi chính sách | CFG-33 |
| CF-34 | Banner URL ảnh 404 hoặc CTA javascript: | Không có broken/unsafe link được publish | CFG-34 |
| CF-35 | Chỉnh booking cutoff và SLAs trên hệ thống | Services/Staff/Complaints dùng policy thống nhất | CFG-35 |
| CF-36 | Nạp CSS Staff/Settings cùng Orders/Customers | Không thay đổi style/active tab giữa các module | CFG-36 |

**Quy tắc chạy test:** ít nhất 3 tài khoản `manager`, `staff` quyền thấp, `anonymous`; 2 cửa sổ browser đồng thời; dữ liệu staging giả nhưng có UUID thật; đối chiếu Network + DB sau F5; không thử khai thác/token thật trên production.

---

## K. BẢNG KIỂM THỬ THAO TÁC THỰC TẾ (SMOKE + REGRESSION)

> Những kết luận dưới đây xuất phát từ code; để đánh dấu **PASS trên hệ thống thật**, cần thực hiện các thao tác trên môi trường thử nghiệm với Supabase và tài khoản đúng quyền. Mỗi phép thử phải kiểm chứng cả **giao diện + response `{error}` + hàng dữ liệu DB sau refresh**.

| Nhóm | Thao tác | Kết luận kiểm tra tĩnh | Cách test PASS trên hệ thống |
|---|---|---|---|
| Dashboard | Xem KPI doanh thu | **Có render**, có khả năng sai định nghĩa/timestamp | So với sổ POS và lịch thanh toán, ca chưa trả tiền không bị tính như đã thu |
| Dashboard | Nhấn các thẻ KPI / ưu tiên | **Có liên kết điều hướng**, chờ router | Phân hệ đích mở đúng lọc, không chỉ đổi hash |
| Dashboard | Đổi lịch Tháng/Tuần/Ngày | **Có handler**, có nguy cơ gắn lặp | Click mỗi nút một lần đúng một lần chuyển, event không tăng khi realtime |
| Dashboard | Xem tồn kho thấp | **Có render/query**, nullable và ngưỡng fallback | Một sản phẩm 0, một thiếu inventory, một thấp hơn min được phân loại đúng |
| Khách hàng | Tìm/lọc/phân trang | **Có xử lý** | Kết quả đúng sau thêm/sửa, xuất CSV khớp filter |
| Khách hàng | Thêm khách | **Có ghi DB**, nhiều thao tác rời | Xác minh customer + profile + membership (+address/pet tùy chọn); lỗi ở bước 2 không báo hoàn tất |
| Khách hàng | Sửa DOB/hạng | **Có UI**, DOB có thể dính state; hạng không lưu | Refresh đúng dữ liệu, không sửa nhầm ngày sinh khách khác |
| Khách hàng | Khóa/mở khóa | **Có handler**, cần enum/RLS | Tài khoản đúng trạng thái thật, người không đủ quyền bị chặn |
| Khách hàng | Cộng/trừ điểm | **Có ghi DB**, chưa nguyên tử | Số dư = ledger, hai admin không làm mất điểm, lỗi không cộng một nửa |
| Khách hàng | Gửi lại SMS | **Chưa có gửi thật trong handler** | Chỉ PASS nếu có gateway/outbox và biên nhận/ trạng thái thất bại đúng |
| Thú cưng | Thêm pet | **Có INSERT**, lỗi gán chủ nếu chưa chọn | Không thể lưu khi không chọn chủ; tạo xong mở đúng UUID khách |
| Thú cưng | Tạo nhanh chủ nuôi | **Có INSERT**, bỏ qua lỗi bảng phụ | Customer/profile/membership đầy đủ hoặc rollback |
| Thú cưng | Sửa hồ sơ | **Có UPDATE**, nhiều default suy diễn | Bỏ trống không biến thành “không dị ứng”/“bé ngoan” |
| Thú cưng | Cân pet | **Có INSERT + UPDATE**, chưa transaction | History và cân hiện tại luôn khớp sau lỗi/2 click |
| Thú cưng | Tiêm vaccine | **Có UPDATE** văn bản lịch sử | Tiêm thiếu/hết hiệu lực không hiện đủ điều kiện Hotel |
| Thú cưng | Carelog chi tiết | **Có mở modal**, fallback mẫu giả | ID không tồn tại chỉ hiện lỗi, không hiển thị ảnh/biên bản mẫu |
| Thú cưng | In thẻ đeo cổ | **Chưa thực sự in** | Có print dialog/job thật mới báo đã in |
| Thú cưng | Nhắc lịch SMS/Zalo | **Hiện chủ yếu hỗ trợ soạn/copy**, không lưu gửi | Có log liên hệ thủ công hoặc receipt gateway; filter trạng thái đúng |
| Thú cưng | Đặt lịch từ reminder | **Chưa nối đúng theo từng dòng** | Bấm B mở booking bé B, không dùng pet đang xem |
| Dịch vụ | Tạo lịch Spa | **Có INSERT**, chưa đủ check công suất | Đúng customer/pet/giá, 2 admin không trùng slot đã khóa |
| Dịch vụ | Tạo lịch Taxi | **Có INSERT với điều kiện**, kiểm giá rule | Chỉ chấp nhận rule đang hiệu lực; lỗi kho giá không tạo lịch |
| Dịch vụ | Tạo lịch Hotel | **Hiện bị chặn** | Không gọi là PASS cho đến khi có workflow giữ phòng/giá |
| Dịch vụ | Xác nhận/hủy lịch | **Có UPDATE và check kết quả** | Trạng thái đổi sau refresh, xung đột đồng thời bị ngăn |
| Dịch vụ | Tiếp nhận ca | **Có lưu note + status**, ảnh chưa hỗ trợ | Không lưu dữ liệu sức khỏe mặc định, biên bản đúng người/giờ |
| Dịch vụ | Bàn giao/hoàn thành | **Có UPDATE**, thiếu validation SOP đầy đủ | Không thể hoàn thành ca chưa làm đủ bước bắt buộc |
| Dịch vụ | Thêm phụ phí | **Có UPDATE**, dựa note, consent chưa đủ | Có bằng chứng đồng ý và audit; tổng tiền chính xác sau 2 nhân viên cùng sửa |
| Dịch vụ | Tạo/sửa danh mục | **Có UPSERT**, giá update/insert tách | Lỗi price matrix rollback toàn bộ; SOP cũ không mất |
| Dịch vụ | Nhật ký chăm sóc | **Có INSERT/UPDATE/DELETE**, ảnh chưa có storage | Lưu và reload đúng tên bước, KTV; thao tác xóa có quyền/audit |
| Dịch vụ | Phản hồi review | **Có UPDATE nhưng không kiểm tra lỗi** | Khi DB deny, UI không hiện đã phản hồi; khi thành công hiện đúng ở kênh khách |
| Dịch vụ | Báo khách đón | **Chỉ toast giả** | Chỉ PASS nếu có xác nhận gửi thực tế |
| Dịch vụ | Thanh toán POS/chia sẻ Carelog | **Chưa có handler theo ID gửi lên** | Có routing và kết quả nghiệp vụ thật, không chỉ đổi giao diện |

| Nhân sự | Thêm/sửa/xóa hồ sơ | **Có query Supabase**; edit/delete bỏ qua error và success sai | RLS denied không hiển thị success; UUID và mã EMP đúng sau reload |
| Nhân sự | Cấp account/role/permissions | **Có POST API**, chưa thấy backend contract | Tài khoản quyền thấp không thể tạo Admin; API lỗi không nhận là hoàn tất |
| Nhân sự | Khóa an toàn và điều phối KTV | **Đang mock/local** | Ca thật được chuyển/khóa nguyên tử và đồng bộ phân hệ Dịch vụ |
| Nhân sự | Lịch trực ngày/tuần và phân ca | **Có SELECT/UPDATE/INSERT**, multi-write chưa atomic | 2 admin không gán trùng, lỗi nửa chừng rollback, giới hạn 8h |
| Nhân sự | Duyệt nghỉ phép/đổi ca | **Có RPC**, cần SQL quyền/xung đột | Hai approver không tạo 2 thay đổi, nghỉ phép trùng bị chặn |
| Nhân sự | Đánh giá tay nghề và gửi thông báo | **UPDATE không await; notification giả** | Đánh giá có lịch sử thật; gửi tin có receipt hoặc trạng thái lỗi |
| Nhân sự | Hồ sơ lương/KPI | **Số liệu cố định** | Hiển thị dữ liệu thực có quyền, thiếu dữ liệu thì không hiện số giả |
| Cấu hình | Banner CRUD | **Có query + server fallback** | RLS/role từ backend; nội dung escape, file ảnh/URL hợp lệ |
| Cấu hình | Voucher tạo/bật/tắt/áp dụng | **Có CRUD**, cần contract với Orders | Program eligibility/quota đúng, update 0 row không success |
| Cấu hình | Policy ship, payment, booking, PawPoints | **Có persistSystemConfig**, client ghi trước DB | Backend fail rollback; consumer khác chỉ dùng config version đã ACK |
| Cấu hình | Safe Mode | **Boolean client-only** | API server vẫn chặn nếu policy đang khóa |
| Cấu hình | Bài viết & đồng bộ RAG | **Bài viết CRUD thật; RAG chỉ gắn nhãn** | Có ingestion job/index receipt; ẩn/xóa là revoke khỏi search |
| Cấu hình | Thông báo Website | **Lưu vào JSON config, chưa xác minh publish** | Website khác phiên hiển thị đúng, lỗi cache/publish báo rõ |
| Cấu hình | Audit Log | **SELECT tối đa 50; mọi log gắn SSOT success** | Tổng audit đúng, actor server, sync status đúng từng job |

### Bộ test lỗi tối thiểu phải chạy trước phát hành

1. **Sai chủ/sai bé:** hai chủ có hai pet cùng tên; từ Customer → Pet → Service → Ticket, UUID phải xuyên suốt không đổi.
2. **Lỗi khi lưu:** dùng proxy/mạng mô phỏng một request thất bại ở giữa chuỗi INSERT; không thành công giả; không DB ở trạng thái nửa vời nếu tác vụ bắt buộc atomic.
3. **Race condition:** 2 tab/browser cùng cộng điểm, cùng sửa bảng giá, cùng thêm phụ phí, cùng tạo lịch một KTV; kết quả không ghi đè.
4. **RLS/Role:** nhân viên quyền thấp thử gọi trực tiếp Supabase/PostgREST bằng token của mình với phép sửa điểm/bảng giá/xóa carelog; API phải từ chối đúng.
5. **Untrusted text:** tên khách, tên bé, ghi chú dị ứng, bình luận review và tên dịch vụ chứa HTML/quote, không được chạy thành script.
6. **Tình trạng trống:** bảng nguồn không có hàng, client mất mạng, server timeout, RLS từ chối, bản ghi bị xóa khi Drawer đang mở — mỗi tình huống hiện lỗi/trống đúng, không phát sinh 0 hoặc dữ liệu ví dụ.
7. **Khả năng thao tác:** click tất cả nút trong HTML (đặc biệt các nút “Gửi/In/Thanh toán/Xuất/Chia sẻ”), ghi request thực tế, trạng thái sau reload và đường đi module.
8. **Ngày/giờ:** lịch quá hạn, đơn trả tiền qua ngày, thời điểm 00:00 tại `Asia/Ho_Chi_Minh`, UTC timestamp và DATE; đảm bảo không lệch ngày.
9. **Phân trang và xuất:** >500 đơn, >500 lịch, >200 ticket, >1000 pet/carelog; KPI và CSV không cắt cụt trong khi gắn nhãn “Tổng”.
10. **Phục hồi:** thử lại sau lỗi phải an toàn, không tạo hai lịch/điểm/tin nhắn cùng một yêu cầu.

---

## L. THỨ TỰ SỬA ĐỀ XUẤT (ĐỢT SỬA SAU KHI RÀ SOÁT)

**Bổ sung v0.4, cần ưu tiên trước triển khai thực tế:**
- **P0 bảo mật/tiền/tài khoản:** `CFG-01..CFG-06`, `CFG-11..CFG-13`, `CFG-33`, `N-01`, `N-05..N-08`, `N-11..N-13`, `N-16`, `N-20`, `N-26`, cùng `O-02..O-04`, `O-08`, `O-11..O-12`, `C-04`, `K-01..K-03`. Đặc biệt: token/secret không thuộc client, bảo vệ API fallback, và tất cả hành động có quyền phải bị RLS/backend từ chối đúng.
- **P1 sự thật vận hành:** `N-14..N-25`, `CFG-14..CFG-31` — bỏ KPI/lương/bằng chứng/đồng bộ giả; thiết kế RPC phân ca, assessment, RAG indexing và SSOT config.
- **P2 tải UI/performance:** `N-27`, `N-30`, `CFG-09..CFG-10`, `CFG-22`, `CFG-32`, `CFG-36`. Không sửa toàn bộ CSS/theme cùng PR xử lý dữ liệu.
- **Kiểm thử liên phân hệ bắt buộc:** Staff khóa KTV → Service không cho tiếp nhận; Complaint khóa KTV → Staff cập nhật; Settings PawPoints → Customers/Orders; Settings voucher → Orders/Checkout; Settings booking policy → Services/Staff; Blog unpublished → Chatbot không truy xuất; audit actor/token luôn đến backend.

**Sprint 0 — Chặn lỗi P0 trước khi cho thao tác production:** `K-01`, `K-02`, `K-03`, `K-06`, `K-07`, `K-24`, `O-02`, `O-03`, `O-04`, `O-08`, `O-09`, `O-11`, `O-12`, `O-16`, `O-20`, `O-26`; tiếp theo các lỗi P0 đã ghi từ 4 phân hệ đầu. Thử bằng tài khoản/staging với RLS, tuyệt đối không dùng dữ liệu ngân hàng hoặc kho production để tái hiện.

**Các nhóm ưu tiên kế tiếp của v0.3:** (i) chuẩn hóa khóa ID `sales_order.id`/`support_ticket.id`/`appointment.id`/`customer.id` và trạng thái; (ii) build server/RPC giao dịch POS, tồn, COD, RMA, phê duyệt ticket; (iii) dọn tất cả dữ liệu demo, chứng cứ giả và success toast giả; (iv) test đồng bộ từ 2 trình duyệt, auth/RLS, realtime/TTL, CSV/XSS.

**Sprint 0 — Danh sách gốc v0.2:** `P-01`, `P-02`, `P-03`, `C-01`, `C-04`, `C-11`, `C-12`, `P-15`, `D-09`, `S-18`; tạm khóa các write-flow chưa có server validation và quyền đúng. Sửa dữ liệu sai chủ/sai ID theo danh sách đối soát, không tự sửa dữ liệu thật hàng loạt.

**Sprint 1 — Độ tin cậy dữ liệu quan trọng (bổ sung `O-01`, `O-05..O-07`, `O-10`, `O-13..O-18`, `O-21..O-22`, `O-24`, `K-04..K-05`, `K-08`, `K-16..K-20`):** `D-01..D-07`, `C-02..C-10`, `P-04`, `P-09..P-14`, `S-02..S-08`, `S-10..S-14`, `S-19..S-23`; thiết kế RPC atomic cho điểm, pet weight, booking charge, service pricing; thống nhất `customer_id`, `pet_id`, `appointment_id` UUID.

**Sprint 2 — Đóng lỗ chức năng giả lập (bổ sung `O-19`, `O-23`, `O-25`, `K-09..K-13`, `K-15`, `K-23`):** `C-09`, `P-06..P-08`, `P-17`, `S-01`, `S-09`, `S-15..S-17`, `S-24..S-25`. Tính năng chưa có backend phải chuyển nhãn “Chưa tích hợp” thay vì báo “Đã gửi/Đã in/Đã lưu”.

**Sprint 3 — Hiệu năng, UI & regression (bổ sung `K-21..K-22` và ma trận OA/KA):** `D-08..D-12`, `C-15..C-16`, `P-16..P-20`, `S-26`, chuẩn hóa CSS; test hành trình liên phân hệ; test backend error và XSS tự động.

**Điều kiện dừng cho từng gói sửa:**

- Có test tái hiện lỗi trước fix và test PASS sau fix (hoặc ghi rõ **chưa thể kiểm chứng** nếu thiếu hạ tầng).
- Không thay schema production khi chưa có migration backup/rollback; tránh xóa dữ liệu lịch sử nhằm “sửa nhanh”.
- Có commit/tên file đã sửa, dữ liệu nào đã đối soát, lỗi nào không thuộc phạm vi.
- Giao diện chỉ báo thành công sau khi API/DB xác nhận, mọi error được thể hiện đúng.
- Kiểm tra phân quyền từ backend/RLS, không chỉ điều kiện `disabled` trên client.

### Quy tắc để giao cho Codex / Gemini sửa từng lỗi

```text
Đọc PAWPAL_ADMIN_AUDIT_LOI_8_PHAN_HE.md.
Chỉ sửa issue [MÃ ISSUE] (ví dụ P-01). Không sửa các gói khác.
1) Đọc code và schema liên quan; không đoán bảng/cột/enum chưa xác minh.
2) Tạo test tái hiện lỗi, lưu tình trạng trước fix.
3) Sửa đúng nguyên nhân gốc, ưu tiên backend/RPC và RLS nếu tác vụ nhạy cảm.
4) Không thêm mock/fallback tạo dữ liệu thật giả. Không đổi style không liên quan.
5) Chạy kiểm thử/smoke theo mục tương ứng trong báo cáo.
6) Trả kết quả: file + dòng sửa, test PASS/FAIL/CHƯA KIỂM CHỨNG, rủi ro còn lại.
Không deploy, không chạm dữ liệu khách thật, không tự tạo migration production.
```

---

## M. FILE / DỮ LIỆU CẦN ĐỐI CHIẾU ĐỂ KẾT LUẬN CHẠY THẬT

**Nên cung cấp bản KHÔNG có secrets:**

- `admin.js`/router quản lý module và subtab, hàm `PawpalAdmin.loadModule`, `window.getSupabaseClient` (che mọi giá trị khóa), `AGENTS.md`, nếu có `ADMIN_DESIGN_SYSTEM.md`.
- DDL/schema/migrations và enum, index/UNIQUE/FK/RLS cho: `customer`, `customer_profile`, `customer_membership`, `paw_point_transaction`, `pet_profile`, `pet_weight_history`, `appointment`, `service`, `service_price_matrix`, `care_log`, `care_action`, `review`, `inventory`, `inventory_movement`, `sales_order`, `sales_order_detail`, `payment`, `shipment`, `voucher`, `return_request`, `return_request_detail`, `support_ticket`, `support_ticket_message`, `ticket_assignment_history`, `resolution_proposal`, `approval_record`, `ticket_attachment`, Supabase Storage policies và các bảng SMS/notification nếu có; **không mặc định tất cả bảng mới đề xuất đã tồn tại**.
- Policy chính thức: xác định doanh thu, hạn mức Pawpoint/quy đổi ra VND, hạng thành viên, điều kiện Pet Hotel, SLA xử lý đặt lịch/khiếu nại, công suất KTV/phòng, giá theo cân, phụ phí/đồng ý khách, đối soát COD, hoàn tiền/đổi trả, trạng thái RMA, quyền phê duyệt và retention chứng từ.
- Ảnh hoặc recording thao tác trên **môi trường test** và log console/network với request ID đã loại bỏ thông tin cá nhân; file test/dataset giả lập có UUID hợp lệ để tái hiện lỗi.
- Đã có code của **Nhân sự và Cấu hình**: đối chiếu trực tiếp `N-01..N-30`, `CFG-01..CFG-36` với các lỗi trước trong Orders/Service/Complaints/Customers. Để kết luận mức độ khai thác và chạy thật vẫn cần DB schema, policies và backend.

**Không gửi:** API key Gemini, Supabase `service_role`, khóa SMS/gateway, mật khẩu, token JWT đang hiệu lực hoặc bản dump toàn bộ khách thật.

---

## N. NHẬT KÝ CẬP NHẬT & TRẠNG THÁI SỬA

| Phiên bản | Phân hệ nhập vào báo cáo | Nội dung | Trạng thái |
|---|---|---|---|
| `v0.1` (tổng hợp review đầu) | 1. Dashboard; 2. Khách hàng | `D-01..D-12`, `C-01..C-16` | Đã rà soát tĩnh; chưa fix |
| `v0.2` (16/10/2026) | 3. Thú cưng; 4. Dịch vụ | `P-01..P-20`, `S-01..S-26`, test/sprints | Đã rà soát tĩnh; chưa fix |
| **`v0.3` (16/10/2026)** | **5. Bán hàng & Kho; 7. Khiếu nại** | **Thêm `O-01..O-26`, `K-01..K-24`, 24 bài test OA/KA; tổng hợp lỗi liên phân hệ RMA–ticket–tồn–COD, anon/RLS** | **Đã rà soát tĩnh; chưa sửa nguồn** |
| **`v0.4` (16/10/2026)** | **6. Nhân sự; 8. Cấu hình hệ thống** | **Thêm `N-01..N-30` và `CFG-01..CFG-36`, thêm 62 ca test `HR/CF`, tổng 190 mục; tập trung quyền cấp tài khoản, roster, KTV lock, config secret/safe-mode, audit, RAG, SSOT** | **Đã nhận đủ 8/8, rà soát tĩnh; chưa sửa app, chưa test production** |

**Tổng 190 mục rà soát trong v0.4:** `D=12`, `C=16`, `P=20`, `S=26`, `O=26`, `N=30`, `K=24`, `CFG=36`. Đây gồm lỗi, rủi ro và tình huống phải xác minh — **không phải 190 lỗi đã được kiểm chứng trên production**. 34 file JS đã qua kiểm tra cú pháp; chưa chạy thao tác UI thật với quyền/RLS/DB của bạn. 

**Tiến độ:** **8/8 phân hệ Admin đã nhận và đưa vào một báo cáo duy nhất, không tính Chatbot**. Các issue đợt trước vẫn giữ nguyên mã; chưa sửa mã nguồn hoặc chạm production. Sau khi bạn fix, có thể cập nhật trạng thái theo mã `D/C/P/S/O/N/K/CFG` trong chính báo cáo này.

---

## O. TỔNG KẾT 8/8 & HỢP ĐỒNG ĐỐI CHIẾU TRƯỚC KHI CHỐT PASS

**Phạm vi đã nhận:** 8/8 phân hệ Admin PawPal, **không tính Chatbot**. Đã có 190 mục rà soát tĩnh, và **86 tình huống kiểm thử chi tiết mới/cũ** trong các bảng OA/KA/HR/CF (24 + 26 + 36). Các bài smoke ban đầu vẫn được giữ nguyên. Đây là **danh sách công việc cần xử lý/kiểm chứng**, không phải chứng nhận rằng toàn bộ 190 lỗi đang xảy ra trên production.

### Điều kiện PASS cho một issue (không chỉ sửa cho hết lỗi giao diện)

1. **Reproduce:** có test hoặc request/fixture làm lỗi xuất hiện trước sửa. Lỗi cần DB/RLS thì không được tự đổi nhãn thành XÁC NHẬN.
2. **Backend first:** với tiền/điểm/stock, nhân sự, cấp quyền, cấu hình, audit, ticket/RMA — kiểm quyền và validate ở server/SQL, không chỉ chặn nút trên client.
3. **Transaction:** thao tác cập nhật nhiều bảng phải atomic/idempotent; nếu không thể atomic vì gọi dịch vụ ngoài, dùng outbox/saga + trạng thái trung gian rõ ràng.
4. **No fake success:** màn hình, toast, báo cáo, PDF/in, gửi SMS, RAG, đối soát phải phản ánh bằng chứng thực tế; thiếu dữ liệu -> `Chưa có`/`Chưa đồng bộ`.
5. **Security:** RLS/masking/CSP/XSS, secret server-only, audit identity lấy từ Auth; test với người dùng thường, admin, guest và sửa payload thủ công.
6. **Cross-module:** sau reload, mở thiết bị khác và đổi phân hệ, khóa UUID/enum/policy version vẫn liên thông, không dựa dữ liệu sessionStorage làm nguồn chân lý.
7. **Release:** PR nhỏ theo 1–3 mã lỗi liên quan; migration + rollback + test; không đưa credential/dữ liệu khách thật vào commit.

### Những artefact còn cần để kết luận runtime (không bắt buộc gửi tất cả ngay)

- `admin.js`/router, `supabase.js` client initialization (đã che secrets), `AGENTS.md` nếu có; các API route `/api/admin/staff/provision-account`, `/api/admin/banners`, auth middleware.
- Schema+RLS+RPC `staff`, `staff_schedule`, `staff_shift_request`, `pawpal_review_staff_shift_request`, `audit_log`, `pawpal_setting`, `banner`, `voucher`, `blog_post`, `notification` và RAG/vector metadata nếu tồn tại.
- DB policy cho `service_locked`, role/permissions, `employee_code`, incident/SLA, payment/ship/booking policy, RAG publish/unpublish.
- Test account role thấp, manager, không đăng nhập; dữ liệu staging 2–3 nhân viên, 2 lịch trùng, 2 voucher, 1 bài viết và 1 policy version.

**Không gửi:** service-role, API token GHN/MoMo/VNPay thật, mật khẩu, khóa riêng, JWT đang còn hạn, thông tin định danh khách và bảng lương thực tế.

**Giai đoạn tiếp theo:** bạn sửa theo issue ID; sau mỗi PR gửi lại file đã thay đổi và kết quả test, mình sẽ cập nhật trạng thái `CHƯA FIX / ĐÃ SỬA CODE / CẦN DB / PASS STAGING / ĐÃ ĐÓNG` trong cùng file này mà không làm mất những mục cũ.
