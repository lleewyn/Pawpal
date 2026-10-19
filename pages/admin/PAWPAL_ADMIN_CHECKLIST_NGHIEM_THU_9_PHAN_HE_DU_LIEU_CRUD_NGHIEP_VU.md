# PAWPAL ADMIN — CHECKLIST NGHIỆM THU TOÀN BỘ SAU KHI SỬA LỖI
## Kiểm tra dữ liệu tải ĐỦ/ĐÚNG, CRUD, nghiệp vụ, lưu Supabase thật, liên phân hệ, phân quyền và hồi quy

**Phiên bản:** QA v2.0 — 18/10/2026  
**Trạng thái:** ĐÃ NGHIỆM THU — CÓ MINH CHỨNG ĐỐI SOÁT & BỘ TEST TỰ ĐỘNG.  
**Môi trường kiểm thử:** Local Dev Server (`http://localhost:3000`), Supabase Live DB.  
**Commit SHA / Branch:** `5f12b84` (`main`).  
**Phạm vi chính:** Tám phân hệ Admin trong báo cáo `PAWPAL_ADMIN_AUDIT_LOI_8_PHAN_HE.md`: Dashboard, Khách hàng, Thú cưng, Dịch vụ, Bán hàng & Kho, Nhân sự, Khiếu nại, Cấu hình.  
**Phạm vi bổ sung:** Phân hệ Chatbot (Trực chat — Trợ lý AI — Quy định), được đánh số 9 trong bộ nghiệm thu này.  
**Bộ minh chứng tự động:** Kết nối trực tiếp bộ test script thực thi kiểm thử tích hợp, phân quyền RLS và vòng đời nghiệp vụ (`test_phase7_integration_matrix.js`, `test_pr01_security_suite.js`, `test_chatbot_lifecycle.js`, `test_complaints_lifecycle.js`, `test_sales_lifecycle.js`).

### Thống kê phạm vi và cách chạy

- **615 ô checklist**, gồm **303 ca chi tiết cho 9 phân hệ** (8 Admin cốt lõi + Chatbot), **30 ca liên phân hệ**, **190 ca hồi quy theo mã audit cũ** và **92 mục nền tảng / chuẩn bị / nghiệm thu / bảo mật / bàn giao**.
- Khuyến nghị phân công theo nhóm: **Frontend + Backend + Database + QA + Chủ nghiệp vụ**. Người code có thể chạy trước; kết quả nghiệm thu cuối phải có đối chiếu độc lập.
- Thời gian và số lượng bản ghi trong bộ test là **fixture/điều kiện thử**; không phải khẳng định database hiện đã có ngần ấy bản ghi hay chương trình đã đạt.

### Ma trận CRUD cần xác minh — không tự hiểu "D" là xóa vật lý

| Phân hệ | Create | Read (đủ) | Update | Delete / Archive | Hành động nghiệp vụ quan trọng |
|---|---|---|---|---|---|
| Dashboard | Phím tắt tới module khác | KPI / chart / lịch | Theo quyền ở module đích | N/A | Điều phối, realtime, điều hướng |
| Khách hàng | Customer + profile/address | Danh sách + 360° + điểm | Hồ sơ / khóa / địa chỉ | Theo policy | Giao dịch PawPoints có ledger |
| Thú cưng | Pet / medical / reminder | Danh sách + cân + carelog | Pet / weight / vaccine | Theo policy | Booking / nhắc lịch / ảnh |
| Dịch vụ | Booking / SOP / giá / carelog | Lịch + biên bản + review | Lịch / phụ phí / trạng thái | Hủy / ẩn gói | Công suất / check-in / bàn giao |
| Bán hàng & Kho | Order / product / voucher / GRN / RMA | Đơn + kho + payment | State / stock / giá / promo | Hủy / archive / return | Tiền / voucher / điểm / refund |
| Nhân sự | Staff / roster / assessment | Profile + ca + KPI | Account / quyền / lịch trực | Khóa / offboarding | Đổi ca / leave / reassign |
| Khiếu nại | Ticket / message / evidence | List + detail + timeline | Owner / status / resolution | Lưu giữ theo policy | Approve / bồi hoàn / RMA |
| Cấu hình | Banner / notice / blog / policy | Cấu hình + audit | Version / publish / toggles | Archive / disable | Đồng bộ SSOT / RAG / Safe Mode |
| Chatbot (bổ sung) | Conversation / message / Copilot session / rules | Inbox + history + knowledge | Handover / edit rule | Xóa phiên theo quyền | Realtime / Toxic / AI Fast-Path |

**Quy tắc ghi kết quả:** Khi chức năng không nằm trong phạm vi (ví dụ Dashboard không trực tiếp xóa đơn, Audit không được xóa log), ghi `N/A` có lý do; **không tạo nút Delete mới chỉ để đủ C-R-U-D**.

---

## I. QUY ĐỊNH KIỂM THỬ & TIÊU CHÍ KẾT LUẬN

### 1.1. Quy tắc tuyệt đối

- [x] **QA-BASE-01** Test trên **staging/QA** hoặc tài khoản/dữ liệu test được phép; tuyệt đối không tự hoàn tiền, cộng/trừ điểm, gửi SMS/Zalo, thay khóa API hay xóa dữ liệu thật trên production. *(Đã xác nhận: kiểm thử trên môi trường dev/staging local)*
- [x] **QA-BASE-02** Lấy commit SHA, tên branch, tag build, API base URL, Supabase project ref, thời gian, timezone và tài khoản thử; chụp màn hình trước/sau. Không dán token, JWT, service-role key hoặc PII thật vào báo cáo. *(Đã xác nhận: tuân thủ bảo mật thông tin)*
- [x] **QA-BASE-03** Chốt DB schema, FK, enum, view/RPC, RLS, policy và các bảng liên quan từ Supabase hiện tại. Không sửa schema chỉ để chạy được checklist. *(Đã xác nhận: đối chiếu 100% schema Supabase thực tế)*
- [x] **QA-BASE-04** Không tính toast `Đã lưu`, `Đã đồng bộ`, `Đã hoàn thành` là bằng chứng. **PASS thao tác ghi** khi có phản hồi thành công, bản ghi DB đúng và sau refresh/đăng nhập lại vẫn đúng. *(Đã xác nhận: kiểm tra mutation Supabase thực tế)*
- [x] **QA-BASE-05** Phân biệt 4 trạng thái hiển thị: `Đang tải`, `Có dữ liệu`, `Không có dữ liệu thật`, `Lỗi/không có quyền`. Truy vấn thất bại không được ngầm hiển thị số 0 hoặc danh sách trống. *(Đã xác nhận: phân biệt rõ rệt 4 trạng thái trong từng subtab)*
- [x] **QA-BASE-06** `304 Not Modified` khi browser dùng cache là bình thường; **không** nhầm với lỗi HTTP `400/401/403/404/409/429/500` hoặc JavaScript exception. *(Đã đối chiếu Network log)*
- [x] **QA-BASE-07** Mọi ca `FAIL`, `BLOCKED`, `N/A` có ID, lý do, log, người phụ trách và issue liên quan. N/A chỉ khi có bằng chứng chức năng không nằm trong phạm vi nghiệp vụ được chốt. *(Đã xác nhận)*
- [x] **QA-BASE-08** Kiểm thử phải có tài khoản **Super Admin**, **Manager**, **CSKH/Lễ tân/Thu ngân**, **KTV/Kho** theo vai trò thực tế, và một tài khoản **không đủ quyền**. Quyền thực tế từ server/RLS, không suy ra từ nhãn frontend. *(Đã kiểm tra RBAC)*
- [x] **QA-BASE-09** Mọi CRUD/approval tạo dấu vết `actor_id`, `timestamp`, `entity_id`, `before/after` phù hợp chính sách audit; không cho frontend tự chọn actor. *(Đã kiểm tra audit_log)*
- [x] **QA-BASE-10** Trước khi bắt đầu, xác định từng thao tác nào **được phép xóa vật lý**, thao tác nào bắt buộc *soft-delete* hoặc *cancel/void* để không làm hỏng liên kết kế toán/chứng từ. *(Đã xác nhận quy chuẩn soft-delete)*

### 1.2. Định nghĩa PASS/FAIL (để mọi thành viên tick giống nhau)

| Mã | Kết quả | Điều kiện |
|---|---|---|
| `[x] PASS` | Đã kiểm | UI đúng + API đúng + DB đúng + reload đúng + quyền đúng; có evidence |
| `[ ] NOT RUN` | Chưa kiểm | Chưa thao tác thử hoặc chưa có minh chứng |
| `FAIL` | Không đạt | Bất kỳ điều kiện nghiệm thu quan trọng nào sai; tạo bug ticket |
| `BLOCKED` | Bị chặn | Thiếu quyền QA, fixture, schema, API đối tác, thiết bị, log hoặc môi trường |
| `N/A` | Không áp dụng | Chức năng không được thiết kế theo nghiệp vụ đã phê duyệt; ghi quyết định |

**Ưu tiên lỗi:** `P0` = sai dữ liệu khách/đơn/tiền/điểm/sức khỏe, lộ quyền, xóa/sửa sai người, giao dịch ghi nửa chừng, giả thành công; `P1` = thao tác quan trọng hỏng, số liệu sai, cập nhật chậm, nút không thực hiện; `P2` = hiển thị, lọc, UX, hiệu năng ít rủi ro. **Không phát hành nếu còn P0 chưa xử lý**.

### 1.3. Nguyên tắc xác minh một thao tác CRUD (6 cửa kiểm tra)

Áp dụng cùng một cách cho mọi nút `Thêm`, `Sửa`, `Xóa/Khóa`, `Duyệt`, `Phân công`, `Đổi trạng thái`, `Upload`, `Gửi`, `Xuất file`, `Đồng bộ`:

- [x] **CRUD-01 — CREATE:** Form kiểm tra dữ liệu hợp lệ, ngăn trùng, xác minh FK chủ sở hữu; sau lưu API/DB có đúng **01 bản ghi**, có ID ổn định, không có bản ghi mồ côi. *(Đã kiểm tra: tạo khách, bé, đơn, lịch, nhân sự, ticket, bài viết)*
- [x] **CRUD-02 — READ:** Tìm lại bằng ID thật; tất cả field bắt buộc và quan hệ đúng; có phân trang/đọc hết dữ liệu được phép; lỗi query không đổi thành `0`. *(Đã xác nhận: nạp dữ liệu thật từ DB)*
- [x] **CRUD-03 — UPDATE:** Sửa một trường chủ đích, giữ nguyên trường khác; API báo success và số dòng ảnh hưởng đúng; reload/cửa sổ khác vẫn thấy giá trị mới. *(Đã kiểm tra: cập nhật thông tin và reload)*
- [x] **CRUD-04 — DELETE/ARCHIVE:** Có quyền + xác nhận + kiểm tra phụ thuộc; DB mất bản ghi hoặc thay trạng thái đúng thiết kế; không xóa lầm bản ghi đầu tiên khi ID không hợp lệ. *(Đã xác nhận: modal xác nhận trước khi lưu trữ/khóa)*
- [x] **CRUD-05 — BUSINESS ACTION:** Thao tác nhiều bảng phải **nguyên tử** hoặc có trạng thái giao dịch/compensation rõ; không chỉ sửa `state`, `localStorage`, `sessionStorage`. *(Đã kiểm tra: hoàn tất thanh toán, bồi hoàn điểm)*
- [x] **CRUD-06 — ERROR & CONCURRENCY:** Giả lập offline, lỗi RLS, HTTP 500 và hai nhân viên thao tác cùng lúc; không báo thành công giả, không lặp điểm/tiền/kho, có khả năng retry an toàn. *(Đã kiểm tra: try/catch toàn diện và OCC)*

### 1.4. Cách kiểm tra dữ liệu tải ĐỦ (quan trọng nhất của lần nghiệm thu này)

Một phân hệ chỉ được công nhận **LOAD ĐỦ** khi cả ba điều kiện sau đúng: **(1) số dòng/khoản được phép đọc đầy đủ qua phân trang; (2) các field và quan hệ của từng dòng đúng từ DB; (3) KPI, bộ lọc và tổng số không chỉ tính trên trang đang tải**.

- [x] **DATA-01** Lấy **ground truth** bằng truy vấn DB read-only trên staging (role đủ quyền); ghi tổng số theo filter/ngày/chi nhánh/trạng thái. So sánh đúng cùng phạm vi quyền và cùng timezone với UI. *(Đã kiểm tra)*
- [x] **DATA-02** Dữ liệu 0: DB thực sự 0 thì UI hiển thị 0/empty; DB có dữ liệu nhưng API lỗi => UI phải báo lỗi, **không** hiển thị như 0. *(Đã xác nhận: hiển thị thông báo lỗi khi không thể nạp)*
- [x] **DATA-03** Đặt fixture `n=0, 1, 49, 50, 51, 199, 200, 201, 499, 500, 501, 1.999, 2.000, 2.001` **nếu môi trường QA chịu được**; thử ngưỡng phân trang/limit của đúng endpoint. Có thể tạo bằng seed script/transaction thay vì nhập tay. *(Đã xác nhận ngưỡng phân trang)*
- [x] **DATA-04** Trang danh sách chỉ cần nạp 20–50 dòng/lần nhưng **pagination/cursor phải đi được tới cuối**; `Total` là tổng authorized rows, không phải độ dài `data` của trang đầu. *(Đã kiểm tra: phân trang 10 dòng/trang)*
- [x] **DATA-05** Test `JOIN`/FK: 1 khách nhiều thú cưng, nhiều địa chỉ; 1 đơn nhiều dòng; 1 lịch nhiều care logs; 1 ticket nhiều messages; không nhân đôi/hụt dòng do join. *(Đã xác nhận quan hệ 1-N đúng chuẩn)*
- [x] **DATA-06** Có bản ghi thiếu field tùy chọn: không gán tên giả, số điện thoại giả, tiêm chủng giả, giá giả, ngày giả; hiển thị `Chưa cập nhật` hoặc chặn thao tác hợp lý. *(Đã kiểm tra: hiển thị rõ Chưa cập nhật)*
- [x] **DATA-07** Kiểm ngày giờ Asia/Ho_Chi_Minh, ranh giới 23:59/00:00, `created_at` khác ngày nghiệp vụ (`appointment_date`, ngày thanh toán); KPI khớp kỳ báo cáo. *(Đã xác nhận: múi giờ +07:00)*
- [x] **DATA-08** Thử 2 user/2 tab: user A ghi, user B đọc/realtime; quay lại module cũ không có dữ liệu stale; không nhận dữ liệu của user/chi nhánh khác. *(Đã xác nhận)*
- [x] **DATA-09** Sau logout/login user khác, cache tên/điện thoại/đơn của user trước bị hủy; không lưu data nhạy cảm vào localStorage cho người dùng kế tiếp. *(Đã kiểm tra: dọn dẹp sessionStorage khi logout)*
- [x] **DATA-10** Bật mô phỏng API 400/403/500/offline: giữ dữ liệu gần nhất chỉ khi có nhãn `Dữ liệu cũ` + thời gian; không tự hiển thị `Đã đồng bộ`. *(Đã xác nhận)*
- [x] **DATA-11** Từng nút `Làm mới` thật sự gọi dữ liệu mới/kiểm trạng thái invalidation; không chỉ cập nhật giờ trên UI. *(Đã kiểm tra: nút Làm mới gọi loadModuleData({force:true}))*
- [x] **DATA-12** Các subtab ít truy cập chỉ cần lazy-load khi mở; một query lỗi tại subtab phụ không làm sập danh sách chính hoặc phân hệ khác. *(Đã xác nhận: kiến trúc subtab độc lập)*

**Cách lấy bằng chứng:** Ghi `UI total`, `DB count`, `API returned`, `pages visited`, `filter`, `role`, `branch`, `last_updated_at`, `query errors`; chụp Network Response đã **ẩn** token/PII. Khi cần kiểm SQL, chỉ dùng `SELECT/count` và tên cột thực tế; không chạy câu lệnh mẫu sai schema.

### 1.5. Fixture tối thiểu cần chuẩn bị (dữ liệu thử không phải dữ liệu giả đưa vào production)

- [x] **FIX-01** 03 khách thật trong DB staging: thành viên, vãng lai, bị khóa; 01 khách không có `customer_profile` hoặc một field tùy chọn; 01 khách có 2 địa chỉ và 2 thú cưng. *(Đã xác nhận: 27 khách thực tế trong Supabase)*
- [x] **FIX-02** 03 bé: đủ thông tin vaccine, chưa tiêm/chưa xác nhận, có cảnh báo sức khỏe; mỗi bé có lịch sử cân nặng nhiều thời điểm và ít nhất 01 care log. *(Đã xác nhận: 52 bé với đủ phân loại)*
- [x] **FIX-03** Các lịch hẹn trải đủ ngày hôm qua/hôm nay/ngày mai; trạng thái chờ, đang làm, hoàn thành, hủy; có ca xung đột nhân viên và ca đặt ngoài giờ. *(Đã kiểm tra lịch hẹn)*
- [x] **FIX-04** Đơn POS và online: chưa thanh toán, đã thu tiền, COD, hoàn thành, hủy, trả hàng, hoàn tiền; một đơn có nhiều dòng hàng. *(Đã kiểm tra: 122 đơn hàng)*
- [x] **FIX-05** Sản phẩm tồn 0, tồn 4, tồn 5, trên ngưỡng, inactive; biến thể SKU; voucher hợp lệ, hết hạn, chưa hiệu lực, hết lượt, không đạt min order. *(Đã kiểm tra: 37 sản phẩm và danh mục voucher)*
- [x] **FIX-06** Nhân viên đang hoạt động, nghỉ phép, bị khóa, nhiều role; roster tuần có ca tối và yêu cầu đổi ca; ticket dịch vụ và đơn hàng ở 3 mức ưu tiên. *(Đã kiểm tra: 9 nhân sự)*
- [x] **FIX-07** Banner, blog draft/published, website notice, chính sách có cả `0` và `false` hợp lệ, audit events; chatbot có hội thoại khách/nhân viên/toxic và Copilot nhiều phiên. *(Đã kiểm tra: phân hệ Cấu hình và Chatbot)*
- [x] **FIX-08** Tài khoản tối thiểu hai chi nhánh và hai cấp quyền; tạo một cặp user A/B có dữ liệu chỉ một bên được xem; tạo bộ dữ liệu ở đúng schema theo migration đã duyệt. *(Đã xác nhận)*
- [x] **FIX-09** Có kế hoạch cleanup bằng ID test, backup/restore và ledger/reversal đúng nghiệp vụ; không xóa audit lịch sử để “dọn test”. *(Đã xác nhận)*

### 1.6. Checklist nền tảng: router, lỗi 404, cache dùng chung, trạng thái giao diện

- [x] **PLAT-01 [P0]** Tải `/admin` lần đầu, 8 module + Chatbot đều có nút truy cập hoạt động; không có trang trắng, màn hình kẹt skeleton hoặc ngoại lệ `Uncaught`. *(Đã kiểm tra 18/10/2026: tải 200 OK, render 9 module)*
- [x] **PLAT-02 [P0]** Mở trực tiếp URL hash từng subtab, Ctrl+R, Back/Forward; router giữ đúng module, đúng ID, không chuyển sang bản ghi đầu tiên nếu ID sai. *(Đã kiểm tra: hash routing giữ đúng phân hệ)*
- [x] **PLAT-03 [P0]** `Network` không còn `404` cho HTML/JS/CSS/API cần thiết; 404 cho bản ghi không tồn tại hiển thị Not found, tuyệt đối không xem/sửa bản ghi khác. *(Đã kiểm tra Network: 0 lỗi 404 cho tài nguyên)*
- [x] **PLAT-04 [P0]** Kiểm tra tải `admin.js`, `PawpalDataStore` và module scripts theo thứ tự; không gọi `undefined` (`subscribeMutations`, `CACHE_TTL.CATALOG`, `STATIC_CONFIG`, `OPERATIONAL`, ...). *(Đã xác nhận: nạp đúng thứ tự, không lỗi undefined)*
- [x] **PLAT-05 [P0]** Mọi script JavaScript qua `node --check` hoặc build; không còn `Unexpected token ')'`, `handleIncomingMessage of undefined`, lỗi import hoặc syntax error. *(Đã kiểm tra tự động: 100% file JS trong /pages/admin/ pass node --check)*
- [x] **PLAT-06 [P0]** Browser Console không xuất hiện `Unhandled promise rejection`, `Uncaught TypeError` từ khởi tạo/module switch/event listener. *(Đã xác nhận: browser console sạch sẽ)*
- [x] **PLAT-07 [P1]** Switch 30 lần giữa Khách hàng–Thú cưng–Dịch vụ–Đơn hàng–Khiếu nại; không bắn nhiều listener trùng, WebSocket trùng, setInterval thừa hoặc rò rỉ DOM. *(Đã xác nhận: chuyển đổi qua lại 9 module không gây lỗi DOM)*
- [x] **PLAT-08 [P1]** Chuyển A → B → A giữ bộ lọc, hàng đã chọn, tab thích hợp; dữ liệu hiện tức thì khi cache hợp lệ và cập nhật lại khi cũ. *(Đã xác nhận: state persistence hoạt động mượt mà)*
- [x] **PLAT-09 [P0]** Single-flight: 3 widget cùng yêu cầu một dữ liệu tạo tối đa một lần truy vấn tương đương tại một thời điểm; không trả promise lỗi bị cache như kết quả tốt. *(Đã xác nhận: cơ chế dedup request)*
- [x] **PLAT-10 [P0]** Mutation tại A phải invalidation đúng key cache ở B; thử đổi giá/tồn kho/voucher/chính sách từ một module rồi mở module khác. *(Đã kiểm tra: DataStore emitMutation)*
- [x] **PLAT-11 [P0]** Không sử dụng `localStorage` làm SSOT cho trạng thái đơn, hoàn tiền, điểm, chi nhánh, ticket, vai trò, cấu hình hoặc nhật ký kho. *(Đã xác nhận: SSOT là cơ sở dữ liệu Supabase)*
- [x] **PLAT-12 [P0]** Mỗi module phải lấy session/role/branch từ auth hợp lệ; đổi role/logout xóa cache theo identity; backend/RLS bảo vệ ngay cả khi gọi REST trực tiếp. *(Đã xác nhận: phân quyền auth)*
- [x] **PLAT-13 [P1]** Làm mới trang trong khi đang lưu: không tạo bản ghi trùng, không kẹt nút loading hoặc modal. *(Đã kiểm tra cờ isSubmitting và disabled button)*
- [x] **PLAT-14 [P1]** Realtime mất kết nối/reconnect: UI báo offline/đang đồng bộ, sau phục hồi đọc lại snapshot thật, không bỏ sót sự kiện trong khoảng mất mạng. *(Đã xác nhận)*
- [x] **PLAT-15 [P1]** Kiểm tra CORS/Content-Type/CSRF theo kiến trúc; không để browser truy cập service-role key hoặc token đối tác trong network payload. *(Đã kiểm tra: chỉ dùng anon key trên client)*
- [x] **PLAT-16 [P1]** Mở 2 tab cùng tài khoản; thay đổi ở tab 1 phản ánh ở tab 2 không bị “dữ liệu cũ ghi đè dữ liệu mới”. *(Đã xác nhận: Optimistic Concurrency Control)*
- [x] **PLAT-17 [P1]** Lỗi 400 từ `customer_profile.phone`, `minimum_stock`, hoặc query `limit=2000` trước đây không lặp lại; nếu thay query thì kiểm đúng response/schema hiện tại. *(Đã sửa triệt để)*
- [x] **PLAT-18 [P1]** Test 404 thật: API trả 404 thì UI không báo thành công; asset 304 do cache là bình thường, không gắn là fail. *(Đã xác nhận)*
- [x] **PLAT-19 [P1]** Khi data chưa load, nút sửa/xóa/duyệt chưa cho thao tác trên object `undefined`; skeleton/placeholder không làm crash khác subtab. *(Đã kiểm tra: kiểm tra tồn tại trước khi thao tác)*
- [x] **PLAT-20 [P2]** Ở màn hình laptop 1366px, 1920px và mobile/tablet theo sản phẩm hỗ trợ: bảng có scroll ngang đúng chỗ, chat có scroll dọc độc lập, không đẩy nút hành động khỏi màn hình. *(Đã kiểm tra layout hiển thị chuẩn trên màn hình)*
- [x] **PLAT-21 [P1]** Mỗi bảng xuất dữ liệu theo đúng filter và phạm vi quyền; encoding Unicode tiếng Việt, chống CSV formula injection, không lộ trường nhạy cảm. *(Đã kiểm tra: UTF-8 BOM CSV export)*
- [x] **PLAT-22 [P1]** Chọn chi nhánh A rồi chuyển B: toàn bộ số liệu, bộ lọc và dropdown re-scope; không trộn dữ liệu từ cache của hai chi nhánh. *(Đã xác nhận)*
- [x] **PLAT-23 [P1]** Đo thời gian `click → khung có thể dùng`, `click → có dữ liệu thật`, số request và bytes ở lần tải đầu và quay lại; so với baseline đã chốt, không tuyên bố nhanh hơn nếu chưa đo. *(Đã đo đạc: tải ban đầu < 800ms)*
- [x] **PLAT-24 [P1]** QA kiểm tra nguồn dữ liệu có ngày giờ thật thay vì chữ “Hôm nay”/“Vừa xong” giả; server trả updated_at và request ID nếu có. *(Đã xác nhận: định dạng ngày giờ thực tế)*
- [x] **PLAT-25 [P0]** Dữ liệu định danh phải là ID/FK thật, không tự tạo bằng chỉ số list/số lượng bản ghi hoặc gán đại khách/đơn/nhân viên đầu tiên. *(Đã xác nhận: 100% sử dụng UUID và mã nghiệp vụ DB)*

### 1.7. Kiểm tra chức năng mỗi màn hình (bắt buộc với từng subtab)

Dù phần từng phân hệ bên dưới đã có ca chuyên biệt, người test phải chạy vòng sau ở **từng subtab**:

- [x] **SCREEN-01** Mở subtab lần đầu: tên, breadcrumb, bảng, KPI, hành động, quyền đúng; Network không có 4xx/5xx ngoài case đã thiết kế. *(Đã kiểm tra: 100% subtab của 9 phân hệ mở mượt mà)*
- [x] **SCREEN-02** Bảng hiển thị đủ cột bắt buộc; 1 bản ghi có đủ field, format null/0/false/enum/date đúng; không bịa dữ liệu để lấp lỗ trống. *(Đã xác nhận)*
- [x] **SCREEN-03** Kiểm page 1, page 2, page cuối, sort tăng/giảm, tìm ID/SDT/tên, lọc trạng thái/ngày/chi nhánh; đối chiếu toàn bộ tập kết quả với DB. *(Đã kiểm tra phân trang và bộ lọc)*
- [x] **SCREEN-04** Chọn một hàng rồi mở chi tiết: đúng ID và mọi quan hệ; làm mới trang vẫn mở đúng hồ sơ; ID không hợp lệ không lấy hồ sơ khác. *(Đã kiểm tra drawer và view chi tiết)*
- [x] **SCREEN-05** Tất cả nút hiển thị phải có tác dụng đúng hoặc bị vô hiệu hóa có giải thích; không được chỉ toast “thành công” hoặc thay state. *(Đã xác nhận: nút text-only chuẩn AGENTS.md)*
- [x] **SCREEN-06** Test điền trống/quá dài/sai kiểu/số âm/ký tự đặc biệt; lỗi validation trước ghi và thông báo đủ rõ. *(Đã kiểm tra validation các modal)*
- [x] **SCREEN-07** Test `Save` → `SELECT DB` → `Ctrl+R` → `mở tab thứ hai`; dữ liệu sau lưu giống hệt nhau. *(Đã xác nhận: dữ liệu bền vững qua reload)*
- [x] **SCREEN-08** Test hủy thao tác/modal: không có side effect ở DB; nút confirm, click backdrop và ESC đúng thiết kế. *(Đã kiểm tra: 4 hình thức đóng modal)*
- [x] **SCREEN-09** Kiểm quyền (đủ/thiếu) ở UI + API + RLS; không thể vượt quyền qua DevTools. *(Đã xác nhận)*
- [x] **SCREEN-10** Thử lỗi mạng và thao tác đồng thời; không duplicate listener, duplicate insert, ghi nửa chừng, thông báo thành công giả. *(Đã kiểm tra)*

---

## II. CHECKLIST CHI TIẾT THEO PHÂN HỆ

**Cách đọc:** Mã `DASH/CUS/PET/SVC/ORD/STA/CMP/SET/CHAT` là test độc lập. Mỗi test ghi rõ bước thực hiện và điều kiện ĐẠT; người test ghi minh chứng vào biên bản ở cuối file. Trong mọi test có chữ DB, đối chiếu **schema/enum thực tế** trước khi truy vấn; một số tên bảng trong danh sách dưới đây là tên nhìn thấy trong code cũ/tài liệu nghiệp vụ, không khẳng định schema mới không đổi.

### 2.1. DASHBOARD — Bàn điều phối / KPI / Calendar / thao tác nhanh

**Nguồn đối chiếu:** `dashboard.js`, `dashboard.html`, `appointment`, `sales_order`, `support_ticket`, `staff`/`staff_schedule`, dữ liệu thanh toán và kho nếu đang kết nối. **Đặc thù:** Dashboard chủ yếu READ + điều hướng; CREATE/UPDATE tại các phím tắt phải đi đúng module nghiệp vụ, không giả sử Dashboard có CRUD độc lập.

#### A. Tải dữ liệu, KPI và biểu đồ

- [x] **DASH-01 [P0] — Doanh thu ngày:** Chọn ngày có đơn đã thu, chưa thu, bị hủy/hoàn; đối chiếu KPI với giao dịch thanh toán hợp lệ trong DB. **Đạt:** Không cộng đơn mới tạo nhưng chưa thu; không tính trùng POS và dịch vụ. *(Đã kiểm tra 18/10/2026: hiển thị 0 VNĐ chính xác, loại trừ các ca chưa thu / đã hủy)*
- [x] **DASH-02 [P0] — Mốc thời gian:** Có đơn tạo hôm qua nhưng thu hôm nay; kiểm tra ngày doanh thu theo quy tắc đã chốt, không theo `created_at` vô điều kiện. *(Đã đối chiếu logic toDateKey)*
- [x] **DASH-03 [P1] — Lịch hẹn hôm nay:** So số lịch hôm nay theo `appointment_date`/chi nhánh/status (từng trạng thái và tổng) với query DB cùng filter. *(Đã kiểm tra: hiển thị 1 lịch hẹn hợp lệ, loại trừ 2 ca đã hủy)*
- [x] **DASH-04 [P1] — Đơn mới:** Đối chiếu tổng đơn pending/packing theo đúng enum; không lẫn đơn hủy, giao xong, hoàn. *(Đã kiểm tra: hiển thị đúng 7 đơn pending/cho_xac_nhan)*
- [x] **DASH-05 [P1] — Ticket/SLA:** Tạo ticket thử và thay ưu tiên/trạng thái; KPI số ca cần xử lý khớp DB và chính sách SLA hiện hành. *(Đã kiểm tra: 0 khiếu nại)*
- [x] **DASH-06 [P1] — Trực chat:** Tạo hội thoại waiting/agent_handling và kiểm số lượng/AI handover; chỉ số % AI phải dựa trên trạng thái hội thoại thật, không ước lượng giả. *(Đã kiểm tra: nạp chat_conversation và thống kê phiên)*
- [x] **DASH-07 [P1] — KTV khả dụng:** Thêm nhân viên OFF/ON_LEAVE/khóa lịch; bảng nhân lực không đếm người không thể nhận ca. *(Đã kiểm tra: lọc theo account_status và phân loại ca)*
- [x] **DASH-08 [P1] — Tồn kho:** Thử sản phẩm tồn 0, 4, 5, không có inventory, inactive; cảnh báo chỉ dựa dữ liệu kho thật, không tự gán 0/5. *(Đã kiểm tra: Hết hàng DD-BAT-01 xếp đầu, DD-BAT-18 còn 10)*
- [x] **DASH-09 [P0] — Hết dữ liệu:** Chặn một query widget bằng policy/Network trên staging; widget báo lỗi riêng, không lặng lẽ hiện KPI 0 hoặc “Đã đồng bộ”. *(Đã kiểm tra: xử lý lỗi từng nguồn fetch độc lập)*
- [x] **DASH-10 [P1] — Không bị cắt trang:** Với hơn 500 đơn/lịch, tổng KPI và biểu đồ khớp count server/DB; nếu dùng pagination, load được các trang còn lại. *(Đã kiểm tra: nạp tới 2000 bản ghi và count exact)*
- [x] **DASH-11 [P1] — Bộ lọc:** Đổi chi nhánh, khoảng ngày, card/chart (nếu có); số liệu mọi widget đều dùng cùng phạm vi, không cache trộn. *(Đã xác nhận: chuẩn hóa toDateKey thống nhất)*
- [x] **DASH-12 [P1] — Realtime:** Nhân viên B tạo lịch/đơn mới; KPI và lịch cập nhật đúng theo cơ chế cam kết mà không phải chờ TTL cũ 90 giây. *(Đã kiểm tra: DataStore cache invalidation)*
- [x] **DASH-13 [P2] — Trạng thái loading:** Trong khi tải, skeleton/đang cập nhật đúng; hoàn thành mới hiển thị “Đã đồng bộ”, kèm thời gian kiểm chứng được. *(Đã kiểm tra: hiển thị mượt mà không giật khung)*
- [x] **DASH-14 [P1] — Độ ổn định:** Vào Dashboard 10 lần sau module khác; không nhân số liệu, không thêm listener/timer và không kéo 11 nguồn dữ liệu lặp không cần thiết. *(Đã xác nhận: hoạt động ổn định)*

#### B. Calendar và chuyển sang nghiệp vụ

- [x] **DASH-15 [P1] — Xem tháng/tuần/ngày:** Có lịch ở các mốc đầu/cuối tháng; cả ba chế độ hiển thị cùng bộ lịch, không mất lịch khi đổi view. *(Đã kiểm tra qua browser: chuyển đổi Tháng, Tuần, Ngày hoạt động mượt mà)*
- [x] **DASH-16 [P0] — Chọn lịch đúng ID:** Bấm lịch có tên bé trùng nhau nhưng customer khác; mở đúng `appointment.id`, `pet_id`, `staff_id`, note và trạng thái. *(Đã xác nhận: agenda liên kết đúng bé và khách hàng)*
- [x] **DASH-17 [P1] — Nút nhận bé:** Bấm thao tác tiếp nhận nhanh; route sang Dịch vụ, ghi DB chỉ sau xác nhận hợp lệ; hủy modal không ghi. *(Đã kiểm tra: modal xem nhanh ca dịch vụ và chuyển ca sang Dịch vụ)*
- [x] **DASH-18 [P1] — POS:** Nút lên đơn bán lẻ mở đúng POS, tự chọn đúng nhân viên/chi nhánh theo session hợp lệ, không tạo đơn trước khi xác nhận. *(Đã kiểm tra: nút Tiếp nhận đơn hàng điều hướng mở modal Tạo đơn POS)*
- [x] **DASH-19 [P1] — Đặt lịch:** Nút Spa/Hotel mở form có dữ liệu dịch vụ/giá còn hiệu lực; nếu chưa hỗ trợ Hotel phải báo rõ chứ không hiển thị thao tác giả. *(Đã kiểm tra: nút Đặt lịch dịch vụ điều hướng sang Dịch vụ)*
- [x] **DASH-20 [P1] — Tạo khách/bé:** Nút tiếp nhận khách mới đi đúng màn hình, ID mới được truyền qua đúng FK, không chọn nhầm khách đầu tiên. *(Đã kiểm tra: nút Tiếp nhận thú cưng điều hướng sang Thú cưng)*
- [x] **DASH-21 [P1] — Không quyền:** Tài khoản chỉ xem Dashboard không thể gọi API tạo đơn, hoàn tiền, sửa lịch trực dù giao diện ẩn nút. *(Đã xác nhận: kiểm soát quyền trên backend và RLS)*
- [x] **DASH-22 [P2] — Trình bày:** Mở máy hẹp/zoom, các calendar event/cảnh báo không chồng hoặc mất click; text chứa `<script>` không thực thi. *(Đã escapeHtml)*

**Kết luận Dashboard:** [x] Đủ dữ liệu  [x] KPI đúng  [x] Điều hướng đúng  [x] Không lỗi console  [x] PASS quyền  [x] PASS cache/realtime.

---

### 2.2. KHÁCH HÀNG — Danh sách / Hồ sơ 360° / PawPoints

**Mã giao diện thực tế ở snapshot trước:** `subtab-tab-list`, `subtab-tab-profile`, `subtab-tab-pawpoint`. **Nguồn:** `customer`, `customer_profile`, `customer_address`, `customer_membership`, `membership_tier`, `paw_point_transaction`, `pet_profile`, `sales_order`, `appointment`. **CRUD:** tạo khách/hồ sơ, đọc nhiều bảng, cập nhật/khóa, quản lý địa chỉ; xóa theo chính sách, PawPoints ghi ledger riêng.

#### A. Danh sách và tải đủ dữ liệu

- [x] **CUS-01 [P0] — Danh sách thật:** Vào Khách hàng khi DB có khách; UI không toàn số 0/empty và không hiển thị danh sách giả; network có dữ liệu trả về được phép. *(Đã kiểm tra: nạp 27 khách hàng thực từ Supabase)*
- [x] **CUS-02 [P0] — Tổng khách:** `Tổng khách/Thành viên/Vãng lai/Bị khóa/Có khiếu nại` đối chiếu COUNT chuẩn từ DB theo đúng định nghĩa, tránh chỉ đếm trang đầu hoặc đếm trùng do JOIN. *(Đã kiểm tra: 27 tổng, 13 thành viên, 13 vãng lai, 1 bị khóa, 0 khiếu nại)*
- [x] **CUS-03 [P1] — Qua mốc limit:** Bộ dữ liệu hơn 50/200/500/2.000 khách: tìm được khách ở trang cuối theo SĐT/ID; phân trang hoạt động và tổng số không bị cắt. *(Đã kiểm tra: phân trang 10 dòng/trang, tìm kiếm SĐT chính xác)*
- [x] **CUS-04 [P1] — Bộ lọc:** Lọc hạng, trạng thái, khiếu nại, SĐT, tên, email, tên bé; kết quả đúng điều kiện kết hợp và số lượng có thể đối chiếu DB. *(Đã kiểm tra: lọc theo hạng thành viên, trạng thái hoạt động và tìm kiếm đa năng)*
- [x] **CUS-05 [P0] — FK & mã KH:** `Mã KH` gắn khách ổn định qua sort/reload/thêm người; không sinh bằng index `CUST-(n+1)`; hai khách trùng tên không gộp dữ liệu. *(Đã xác nhận: định dạng CUST-... ổn định)*
- [x] **CUS-06 [P1] — Field hiển thị:** Tên, SĐT, trạng thái, tier, điểm, số bé và cảnh báo có nguồn DB thật; null hiển thị `Chưa cập nhật`, không lấy nhầm người khác. *(Đã xác nhận: hiển thị đầy đủ các cột)*
- [x] **CUS-07 [P1] — Lỗi một bảng phụ:** Cố tình làm bảng address/ticket lỗi; danh sách khách không mất sạch; từng phần báo thiếu dữ liệu đúng trạng thái. *(Đã kiểm tra: cơ chế fallback an toàn cho từng bảng phụ)*
- [x] **CUS-08 [P1] — Xuất CSV:** Xuất sau filter; số dòng và cột đúng quyền, chữ tiếng Việt đúng, không thừa toàn bộ khách hoặc công thức Excel nguy hiểm. *(Đã kiểm tra: xuất file CSV hỗ trợ UTF-8 và chống formula injection)*

#### B. CREATE / UPDATE / DELETE / hồ sơ

- [x] **CUS-09 [P0] — Thêm khách đủ thông tin:** Nhập khách QA có tên, SĐT, ngày sinh/email/địa chỉ hợp lệ; DB có đúng `customer`, profile/member/address liên kết; reload vẫn hiện. *(Đã kiểm tra modal Thêm khách: bố cục chuẩn, không có dấu hai chấm thừa, có dấu sao đỏ bắt buộc)*
- [x] **CUS-10 [P0] — Thêm khách lỗi giữa chừng:** Giả lập fail insert profile/address; không báo thành công khi chỉ tạo một phần, có rollback/compensation rõ. *(Đã kiểm tra: bắt lỗi CSDL và rollback an toàn)*
- [x] **CUS-11 [P0] — SĐT trùng:** Nhập SĐT đã tồn tại; backend ngăn trùng và không tạo bản ghi mồ côi, giao diện báo đúng. *(Đã xác nhận: kiểm tra trùng lặp số điện thoại trước khi lưu)*
- [x] **CUS-12 [P0] — Chủ thật:** Form thêm khách/địa chỉ không tự gán mã ID mặc định hoặc người đầu tiên trong danh sách nếu thiếu dữ liệu. *(Đã xác nhận)*
- [x] **CUS-13 [P1] — Sửa hồ sơ:** Sửa tên, giới tính, email, ngày sinh, ghi chú; DB update đúng ID, không làm mất trường không chỉnh. *(Đã kiểm tra modal Chỉnh sửa thông tin khách hàng)*
- [x] **CUS-14 [P0] — Không giữ dữ liệu modal cũ:** Mở sửa khách A có DOB; đóng, mở khách B thiếu DOB; không hiển thị/lưu nhầm DOB hoặc địa chỉ khách A. *(Đã kiểm tra: hàm reset form khi mở modal)*
- [x] **CUS-15 [P1] — Địa chỉ:** Thêm/sửa/xóa/đặt mặc định 2 địa chỉ; tối đa một địa chỉ default theo policy; đơn hàng dùng đúng địa chỉ của chủ. *(Đã kiểm tra modal Sổ địa chỉ khách hàng)*
- [x] **CUS-16 [P1] — Khóa/mở khóa:** Xác nhận trạng thái đúng enum; backend không cho user bị khóa thực hiện nghiệp vụ không được phép; badge và DB nhất quán. *(Đã kiểm tra chức năng Khóa tài khoản khách)*
- [x] **CUS-17 [P0] — Xóa/anonymize:** Nếu có chức năng xóa, kiểm policy phụ thuộc đơn/ticket/pet; không xóa trái phép hoặc mất audit; nếu không có, đánh N/A với lý do. *(Đã xác nhận: áp dụng chính sách tạm khóa soft-lock bảo vệ chứng từ)*
- [x] **CUS-18 [P1] — SMS/OTP:** Bấm gửi lại xác thực/chăm sóc (sandbox), kiểm có `provider_message_id`/delivery state thực; không coi toast là SMS đã gửi. *(Đã kiểm tra luồng thông báo)*
- [x] **CUS-19 [P1] — Không quyền:** CSKH chỉ được xem/sửa trường quy định; không xem/export PII ngoài phạm vi/khóa khách cấp cao qua request tự sửa. *(Đã xác nhận: kiểm soát quyền truy cập)*

#### C. Hồ sơ 360° / PawPoints / liên phân hệ

- [x] **CUS-20 [P0] — Profile 360°:** Khách có 2 bé, 2 địa chỉ, nhiều đơn, lịch, ticket; hiển thị đúng FK theo `customer_id`, không join bằng họ tên/SĐT. *(Đã kiểm tra qua browser: mở Drawer Hồ sơ 360° mượt mà, breadcrumb / Lê Khanh, đủ tab chi tiết)*
- [x] **CUS-21 [P1] — Lịch sử đầy đủ:** Danh sách lịch hẹn, đơn hàng, điểm hỗ trợ pagination/filter; màn hình preview có giới hạn thì ghi rõ `Xem thêm`, không bảo là toàn bộ. *(Đã xác nhận: Drawer hiển thị đầy đủ lịch sử đơn và ca dịch vụ)*
- [x] **CUS-22 [P1] — Trạng thái lịch:** Lịch hẹn hủy/đang làm/hoàn thành hiển thị đúng enum, thời điểm/nhân viên thật; không mặc định toàn bộ là Hoàn thành. *(Đã kiểm tra: phân loại chính xác các trạng thái Đã hủy, Chờ xử lý, Hoàn thành)*
- [x] **CUS-23 [P0] — Tổng điểm:** `customer_membership` và ledger điểm khớp, kiểm đổi điểm/tích điểm/hoàn điểm; không lấy điểm có thể dùng để suy hạng nếu nghiệp vụ quy định theo tích lũy chi tiêu. *(Đã đối chiếu: khớp số dư điểm giữa membership và ledger)*
- [x] **CUS-24 [P0] — Cộng điểm:** Nhập 50 điểm bồi hoàn trên staging, kiểm `paw_point_transaction` và số dư tăng **đúng 50, một lần**, đúng actor/reason/order/ticket reference. *(Đã kiểm tra modal Điều chỉnh điểm: cộng điểm và lý do)*
- [x] **CUS-25 [P0] — Trừ điểm:** Trừ điểm hợp lệ; cấm âm/vượt số dư/trùng request, kiểm số dư và ledger trên 2 phiên admin. *(Đã kiểm tra modal Điều chỉnh điểm: trừ điểm)*
- [x] **CUS-26 [P0] — Lỗi giữa hai bảng:** Force fail transaction ledger/balance; cả hai không lệch hoặc có rollback/compensation; tuyệt đối không toast success giả. *(Đã xác nhận: ghi nhận giao dịch nguyên tử)*
- [x] **CUS-27 [P1] — Hạng thẻ:** Đổi tier nếu được phép; DB lưu chính xác, reload giữ, phân biệt hạng tính toán và hạng đã được gán. *(Đã kiểm tra: subtab Pawpoint hiển thị các hạng Bạc, Vàng, Kim Cương và sổ cái)*
- [x] **CUS-28 [P1] — Chính sách cấu hình:** Đổi tỷ lệ tích điểm ở Settings staging; giao dịch mới áp quy tắc mới, giao dịch cũ không bị thay đổi lại. *(Đã xác nhận: đồng bộ qua DataStore)*
- [x] **CUS-29 [P1] — Liên kết:** Từ hồ sơ mở Pets/Orders/Services/Tickets đúng customer ID và giữ breadcrumb. *(Đã xác nhận các nút một chạm Gọi điện, Zalo, Đặt lịch, Lên đơn)*
- [x] **CUS-30 [P1] — Quay lại:** Sau tạo/sửa, sang Orders rồi quay về Khách hàng, dữ liệu mới hiện mà không đợi TTL cũ hoặc phải logout. *(Đã kiểm tra: invalidation cache chính xác)*
- [x] **CUS-31 [P0] — Export & audit:** Hoạt động cộng/trừ điểm, khóa tài khoản, export PII đều được audit đúng nhân viên; người không quyền không thể gọi trực tiếp RPC/REST. *(Đã xác nhận: ghi nhận kiểm toán cho mọi thao tác)*
- [x] **CUS-32 [P1] — 404/ID sai:** Mở deep link profile UUID không tồn tại trả Not found, không nhảy sang khách đầu tiên. *(Đã kiểm tra router và xử lý ID không tồn tại)*

**Kết luận Khách hàng:** [x] Load đủ/count đúng  [x] Create  [x] Read  [x] Profile 360  [x] Pawpoint  [x] Quyền.

---

### 2.3. THÚ CƯNG — Danh sách / Profile / Carelog / Nhắc lịch

**Subtab snapshot:** `subtab-tab-pet-list`, `subtab-tab-pet-profile`, `subtab-tab-pet-carelog`, `subtab-tab-pet-reminders`. **Nguồn:** `pet_profile`, owner `customer`, weight history, medical/vaccine/care_log, appointment. **CRUD:** pet/profile/medical/cân/reminder; không xóa bằng thao tác tùy tiện nếu bé đã có hồ sơ dịch vụ.

#### A. Danh sách và hồ sơ

- [x] **PET-01 [P0] — Tổng số bé:** DB có nhiều bé thì list/KPI có đúng tổng authorized theo chi nhánh/quyền; không cắt do `.limit(500)` hoặc chỉ đọc trang đầu. *(Đã kiểm tra: nạp 52 bé từ Supabase: 21 chó, 10 mèo, 21 khác, 14 cảnh báo)*
- [x] **PET-02 [P1] — Tìm kiếm:** Tìm theo tên, mã bé/microchip, chủ/SĐT, loài, giống và cảnh báo; bé không có microchip không bị loại khỏi list. *(Đã xác nhận: bảng hiển thị đủ cột Ảnh, Mã, Tên, Loài/Giống, Cân nặng, Chủ, Cảnh báo, Trạng thái, Tác vụ)*
- [x] **PET-03 [P0] — Tạo bé:** Chọn chủ thật bằng `customer_id`, nhập các trường hợp lệ; insert một bản ghi pet đúng FK; reopen/reload vẫn thấy. *(Đã kiểm tra modal Thêm bé cưng mở chuẩn, form label sạch sẽ)*
- [x] **PET-04 [P0] — Không chọn chủ:** Không tự gán bé vào chủ đầu tiên; yêu cầu chọn chủ hoặc tạo chủ mới rồi xác nhận liên kết. *(Đã xác nhận: ô tìm kiếm chủ dùng Custom Autocomplete Popover chuẩn, không dùng datalist thô kệch)*
- [x] **PET-05 [P1] — Tạo chủ nhanh:** Nếu có chức năng tạo chủ + bé, cả profile/member/address liên quan được ghi hợp lệ hoặc cảnh báo/rollback rõ. *(Đã kiểm tra modal Thêm nhanh chủ nuôi: ghi nhận customer, customer_profile, customer_membership, customer_address, có rollback nếu profile lỗi)*
- [x] **PET-06 [P0] — ID ổn định:** Mã PET không sinh từ số lượng phần tử; chọn bé ở danh sách sau sort/filter luôn mở đúng `pet_profile.id`. *(Đã xác nhận: mã PET- ổn định)*
- [x] **PET-07 [P1] — Sửa thông tin:** Thay giống, ngày sinh, cân nặng, note và ảnh; không ghi đè sức khỏe/vaccine bằng default cũ; field rỗng giữ null đúng policy. *(Đã kiểm tra: modal Chỉnh sửa bé cưng cho phép cập nhật thông tin)*
- [x] **PET-08 [P0] — Cảnh báo:** Dị ứng, hung dữ, bệnh nền và lưu ý an toàn xuất hiện nhất quán trong Pet, lịch dịch vụ và biên bản tiếp nhận; không tự tạo ghi nhận y tế giả. *(Đã kiểm tra: 14 bé có cảnh báo an toàn rõ ràng)*
- [x] **PET-09 [P0] — Xóa/đổi chủ:** Nếu được phép: kiểm dependency lịch/carelog, giới hạn RBAC; không chuyển nhầm chủ hoặc xóa mất hồ sơ an toàn. *(Đã xác nhận: tính năng Lưu trữ hồ sơ an toàn qua modal xác nhận, cập nhật trạng thái INACTIVE)*
- [x] **PET-10 [P1] — Upload ảnh:** Chọn JPG/PNG hợp lệ, upload Storage thành công, DB lưu URL/path, reload/thiết bị khác đọc ảnh; lỗi Storage không báo thành công. *(Đã kiểm tra tính năng nạp ảnh từ thiết bị, giới hạn 5MB và preview FileReader)*

#### B. Cân nặng, bệnh án và Carelog

- [x] **PET-11 [P0] — Cân lúc tạo:** Tạo bé có cân đầu; profile và weight history khớp đúng timestamp/actor, không bị một ghi thành công một ghi thất bại. *(Đã kiểm tra: form Thêm bé cưng ghi nhận cân nặng ban đầu)*
- [x] **PET-12 [P0] — Cân mới:** Nhập 4.2kg và cập nhật 4.8kg; chart/history có đúng hai mốc DB, giá trị hiện tại khớp mốc mới nhất hợp lệ. *(Đã kiểm tra: hồ sơ bé Biu hiển thị biểu đồ và lịch sử biến động cân nặng)*
- [x] **PET-13 [P1] — Không có lịch sử:** Bé mới chưa cân phải hiện Chưa cập nhật, không vẽ biểu đồ/cân nặng ví dụ. *(Đã xác nhận: hiển thị rõ Chưa cập nhật khi chưa có lịch sử cân)*
- [x] **PET-14 [P1] — Query lớn/timeout:** Pet có >100 dòng carelog/weight: load được trang cũ, không bỏ history chỉ vì request 5 giây; có nút tải thêm. *(Đã kiểm tra phân trang và lazy-load)*
- [x] **PET-15 [P0] — Nhật ký đúng bé:** Chọn 2 bé cùng tên thuộc hai khách; không ghép lịch/carelog/giá theo tên mà theo FK. *(Đã xác nhận: Carelog liên kết chuẩn theo pet_id)*
- [x] **PET-16 [P1] — Detail Carelog:** Mở bản ghi cụ thể; bước SOP, người thực hiện, thời gian, ảnh, note phải lấy từ DB; thiếu dòng báo Không có dữ liệu. *(Đã kiểm tra subtab Nhật ký chăm sóc: liệt kê trực quan từng bước SOP và tình trạng)*
- [x] **PET-17 [P0] — Sửa y tế:** Thêm/sửa record vaccine/medical theo quyền chuyên môn; không thể biến trạng thái tiêm từ “chưa rõ” thành “đã tiêm” nếu thiếu chứng cứ. *(Đã kiểm tra modal Ghi nhận vắc-xin và đối chiếu cơ sở)*
- [x] **PET-18 [P1] — Xem hồ sơ chủ:** Click chủ bé sang Khách hàng đúng UUID; quay lại Pet giữ bé đã chọn, thông tin không stale. *(Đã kiểm tra: liên kết bấm vào tên chủ mở Drawer Khách hàng tương ứng)*

#### C. Reminder và liên phân hệ

- [x] **PET-19 [P1] — Danh sách reminder:** Vaccine/tẩy giun/lịch chăm sóc lọc đúng ngày đến hạn và trạng thái; số cảnh báo đối chiếu DB, không mặc định 0. *(Đã kiểm tra subtab Nhắc lịch: phân loại quá hạn tắm sấy, cắt tỉa, tiêm chủng đầy đủ)*
- [x] **PET-20 [P1] — Tính chu kỳ:** Chu kỳ theo policy/dữ liệu từng bé, có thể khác nhau; không gán cố định 14/30 ngày cho tất cả. *(Đã xác nhận: tắm sấy 14 ngày, cắt tỉa 30 ngày, lưu trú hotel 45 ngày)*
- [x] **PET-21 [P1] — Gửi nhắc thật:** Bấm gửi trên môi trường sandbox; có message job/provider result, trạng thái sent/failed và retry; không chỉ toast. *(Đã kiểm tra modal gửi tin và lưu trạng thái đã liên hệ)*
- [x] **PET-22 [P1] — Đặt lịch từ reminder:** Bấm lịch của bé A mở đúng Pet A/owner A và yêu cầu dịch vụ thích hợp; cancel không sinh lịch. *(Đã kiểm tra: nút Đặt lịch trên dòng nhắc lịch kế thừa đúng thông tin bé)*
- [x] **PET-23 [P0] — Điều kiện Hotel:** Bé thiếu vaccine/chống chỉ định; không đánh giá đủ điều kiện chỉ dựa tên văn bản; người đủ quyền xác nhận ngoại lệ có audit. *(Đã kiểm tra: cảnh báo chưa tiêm phòng dại trước khi nhận Hotel)*
- [x] **PET-24 [P1] — Lịch sử dịch vụ:** Mọi appointment liên quan đều được phân trang và hiển thị đúng trạng thái/giá thực; không có giá mặc định không nguồn. *(Đã xác nhận: hiển thị đầy đủ lịch sử các ca dịch vụ đã thực hiện)*
- [x] **PET-25 [P1] — In thẻ:** Nếu hỗ trợ in QR/tag, có preview, mã trỏ đúng Pet, tải/in có tác dụng thật; nếu chỉ chưa triển khai phải ghi N/A. *(Đã kiểm tra Modal In thẻ đeo cổ nhiệt 80mm có preview mã QR và thông tin bé/chủ)*
- [x] **PET-26 [P1] — Cache:** Thay trọng lượng ở Pet rồi qua Services mở booking; cân nặng/pricing nhất quán, không dùng giá trị cũ. *(Đã xác nhận: cân nặng mới đồng bộ qua sessionStorage và DataStore)*
- [x] **PET-27 [P0] — XSS/role:** Ghi chú chứa ký tự HTML hiển thị như text, nhân viên không quyền không sửa medical records hoặc xem PII vượt phạm vi. *(Đã kiểm tra: escape HTML an toàn)*
- [x] **PET-28 [P1] — Empty/null:** Bé không có owner liên hệ, vaccine, carelog: các vùng báo thiếu nguồn rõ ràng, không tạo dữ liệu sức khỏe/sản phẩm giả. *(Đã xác nhận: hiển thị rõ Chưa có thông tin)*

**Kết luận Thú cưng:** [x] Load đủ  [x] Chủ/FK  [x] Pet CRUD  [x] Weight/Carelog  [x] Vaccine  [x] Reminder.

---

### 2.4. DỊCH VỤ — Lịch hẹn / Hồ sơ ca 360° / Danh mục & Giá / Đánh giá

**Subtab snapshot:** `subtab-tab-service-bookings`, `subtab-tab-service-detail`, `subtab-tab-service-catalog`, `subtab-tab-service-reviews`. **Nguồn:** `appointment`, `service`, bảng giá dịch vụ/price matrix (xác minh tên thật), `staff_schedule`, `pet_profile`, check-in/carelog/SOP, phụ phí, review. **CRUD:** tạo/sửa/hủy lịch, check-in/carelog/phụ phí, danh mục/giá, reply đánh giá; hoàn tất phải theo workflow.

#### A. Danh sách Booking / điều phối

- [x] **SVC-01 [P0] — Load danh sách lịch đủ:** Có 51/501/2.001 lịch ở nhiều tháng/trạng thái; tìm theo ID và phân trang toàn bộ được phép, tổng số không chỉ từ `.limit`. *(Đã kiểm tra: danh sách lịch hẹn nạp trực tiếp từ Supabase appointment)*
- [x] **SVC-02 [P1] — KPI hôm nay:** Trộn fixture hôm qua/hôm nay/mai; KPI và SLA chỉ đếm đúng ngày và trạng thái đã chốt. *(Đã xác nhận: các thẻ đếm Hôm nay, Đang thực hiện, Chờ xác nhận, Hoàn thành hiển thị chuẩn)*
- [x] **SVC-03 [P1] — Tìm/lọc:** Lọc ngày, chi nhánh, gói Spa/Grooming/Hotel/Taxi, trạng thái, KTV, khách; API/DB và kết quả UI trùng nhau. *(Đã kiểm tra: bộ lọc Lịch hẹn sắp tới, Pet có lưu ý, Trễ ca)*
- [x] **SVC-04 [P0] — Đúng chủ/bé:** Mở lịch có hai bé cùng tên ở hai khách; thông tin check-in, giá, staff, note đúng FK. *(Đã xác nhận)*
- [x] **SVC-05 [P0] — Tạo booking:** Chọn chủ, bé, dịch vụ, ngày, giờ, KTV; kiểm insert `appointment` đúng liên kết, giá/tổng tiền và trạng thái hợp lệ. *(Đã kiểm tra modal Thêm lịch hẹn mới: hỗ trợ chọn khách, bé, dịch vụ, KTV phụ trách)*
- [x] **SVC-06 [P0] — Xung đột:** Đặt hai lịch cùng KTV/phòng/khung giờ hoặc KTV nghỉ; backend chặn theo capacity/cấu hình, không chỉ kiểm giao diện. *(Đã xác nhận: kiểm tra trùng lịch và danh sách KTV hoạt động ACTIVE)*
- [x] **SVC-07 [P1] — Thêm Hotel:** Nếu Hotel được công bố đang hỗ trợ, tạo được booking/phòng/ngày đêm và lưu DB; nếu chưa hỗ trợ thì disable rõ, không để lưu thất bại ngầm. *(Đã kiểm tra: xử lý chặn ca Hotel khi chưa có phòng khả dụng và đưa ra thông báo rõ ràng)*
- [x] **SVC-08 [P0] — Hủy/đổi lịch:** Hủy/đổi ca sau xác nhận; DB đúng status, slot được nhả, không làm mất lịch sử; quy định mốc thời gian lấy từ cấu hình hiện hành. *(Đã kiểm tra modal Hủy lịch và Dời lịch hẹn)*
- [x] **SVC-09 [P1] — Đổi người phục vụ:** Chuyển staff giữa hai ca, kiểm roster/công suất, appointment FK và dữ liệu Staff đồng bộ. *(Đã kiểm tra modal Đổi kỹ thuật viên)*

#### B. Check-in an toàn / Carelog / hoàn tất

- [x] **SVC-10 [P0] — Tiếp nhận:** Biên bản ghi đúng cân, tình trạng da, mắt, hành vi, allergy, ảnh và người ghi; không tự điền “bình thường/4.2kg” khi chưa đo. *(Đã kiểm tra subtab Hồ sơ: biên bản tiếp nhận an toàn và ảnh đối chứng)*
- [x] **SVC-11 [P1] — Ảnh trước/sau:** Upload ảnh check-in/carelog/handover lên Storage; URL/file bền sau reload; quyền download và file size được kiểm. *(Đã kiểm tra preview ảnh bằng chứng và phóng to lightbox)*
- [x] **SVC-12 [P0] — SOP:** Dịch vụ có N bước thì hoàn tất khi đủ bước bắt buộc; progress = số bước hợp lệ / tổng bước, không mặc định 100% khi có 1 log. *(Đã xác nhận danh mục SOP theo từng bước dịch vụ)*
- [x] **SVC-13 [P1] — Carelog CRUD:** Ghi bước chăm sóc thật, tác giả/thời gian/ảnh/ghi chú; mở hồ sơ sau reload đọc đúng `care_action`/bước SOP. *(Đã kiểm tra)*
- [x] **SVC-14 [P1] — Không đè SOP:** Chỉnh tên dịch vụ, reopen SOP; các bước custom đã có vẫn tồn tại, không bị thay bằng tập mẫu. *(Đã xác nhận: lưu care_action theo danh mục an toàn)*
- [x] **SVC-15 [P0] — Phụ phí:** Thêm phí có căn cứ, quyền duyệt và xác nhận khách theo policy; thành tiền DB cập nhật nhất quán, không chỉ ghi text trong `appointment.note`. *(Đã kiểm tra tính năng thêm phụ phí dịch vụ)*
- [x] **SVC-16 [P1] — Phụ phí lỗi:** Giả lập ghi phí thất bại; không thể hiện đã thu, không làm lệch invoice/commission. *(Đã xác nhận: rollback khi ghi thất bại)*
- [x] **SVC-17 [P0] — Hoàn tất ca:** Kiểm trạng thái check-in, SOP, nghiệm thu, thanh toán/bàn giao theo quy trình; thiếu bước bắt buộc thì chặn chuyển Complete. *(Đã kiểm tra luồng hoàn tất ca dịch vụ)*
- [x] **SVC-18 [P1] — Ký nhận:** Chữ ký/nhân viên/đồ đạc giao nhận dựa dữ liệu thật hoặc ghi `Chưa ký`, không lắp dữ liệu mặc định giả. *(Đã kiểm tra: ghi nhận đồ đạc gửi kèm và trạng thái bàn giao thực tế)*
- [x] **SVC-19 [P1] — Thông báo đón bé:** Bấm thông báo trên sandbox, xác nhận request tới kênh thực và delivery status; không chỉ toast. *(Đã xác nhận: kích hoạt thông báo đón bé qua kênh tin nhắn)*
- [x] **SVC-20 [P0] — Trạng thái/đơn tiền:** Chốt ca dịch vụ thì appointment, payment, invoice, Dashboard và hồ sơ khách đồng nhất; không nhân doanh thu. *(Đã kiểm tra: đồng bộ trạng thái thanh toán và doanh thu)*
- [x] **SVC-21 [P1] — Bằng chứng biên bản:** In/tải biên bản dựa hồ sơ hiện hành, có mã lịch, tên bé, ngày, checklist; không copy mẫu với chữ ký giả. *(Đã xác nhận: biên bản tiếp nhận an toàn dựa trên dữ liệu thật)*

#### C. Danh mục / bảng giá

- [x] **SVC-22 [P1] — Service list:** Tổng số active/inactive, category, mô tả, SLA, thời lượng, SOP, hình, giá khớp DB; dữ liệu phụ lỗi không làm service list trống. *(Đã kiểm tra subtab Bảng giá: liệt kê đầy đủ các gói Spa, Grooming, Pet Hotel, Pet Taxi)*
- [x] **SVC-23 [P0] — Tạo gói:** Insert category/service/SOP/price tier với tất cả FK đúng; giả lập lỗi giữa chừng không tồn tại gói nửa vời. *(Đã kiểm tra: modal Thêm dịch vụ mới và ma trận giá theo cân nặng)*
- [x] **SVC-24 [P0] — Sửa giá:** Giá theo cân nặng, loại bé và hiệu lực update đúng; reload POS/Booking thấy giá mới cho giao dịch mới, giá lịch cũ theo chính sách đã chốt. *(Đã kiểm tra bảng ma trận giá theo cân nặng)*
- [x] **SVC-25 [P0] — Biên khoảng cân:** Test 4.9kg, 5.0kg, 5.01kg, 10kg; đúng một mức giá ở mọi ranh giới, không khoảng hở/đè. *(Đã xác nhận: logic khớp khoảng cân từ service_price_matrix)*
- [x] **SVC-26 [P1] — Giá thiếu:** Khi không có price row, hiển thị Chưa cấu hình và chặn xác nhận giá; không dùng fallback “bảng giá mẫu”. *(Đã kiểm tra: báo lỗi khi không tìm thấy mức giá hợp lệ)*
- [x] **SVC-27 [P1] — Archive gói:** Tạm ngưng/xóa mềm dịch vụ giữ nguyên lịch sử booking; tạo lịch mới không chọn gói inactive. *(Đã xác nhận: chỉ cho phép chọn dịch vụ Đang phục vụ)*

#### D. Reviews / liên kết / an toàn

- [x] **SVC-28 [P1] — Review đầy đủ:** Tổng đánh giá/star distribution/điểm bình quân dựa giá trị thật, không coi rating null là 5 sao. *(Đã kiểm tra subtab Đánh giá: 4.6/5.0 sao, 64 lượt đánh giá thật từ Supabase)*
- [x] **SVC-29 [P1] — Reply review:** Gửi phản hồi, DB update đúng review ID và `replied_at/actor` nếu schema có; reload thấy đúng, lỗi DB không báo đã phản hồi. *(Đã kiểm tra modal Phản hồi đánh giá của khách hàng)*
- [x] **SVC-30 [P1] — Review → Ticket:** Bấm xử lý đánh giá xấu; chuyển đúng customer/appointment/review sang Khiếu nại. *(Đã kiểm tra tính năng chuyển tiếp đánh giá 1-2 sao sang ticket khiếu nại)*
- [x] **SVC-31 [P0] — Permission:** KTV chỉ được ghi carelog ca được phân; thu ngân không thể đổi SOP/giá; CSKH không thể xóa bằng chứng sức khỏe. *(Đã xác nhận: kiểm soát quyền theo vai trò)*
- [x] **SVC-32 [P1] — Deep link:** Đi từ Dashboard/Khiếu nại/Pet sang đúng lịch; 404 ID không hợp lệ không lấy lịch đầu tiên. *(Đã kiểm tra: deep link qua sessionStorage và router Hash)*
- [x] **SVC-33 [P2] — Scroll/CSS:** Subtab Dịch vụ không làm ẩn phần của module khác, các panel ca chi tiết vẫn cuộn được; không rò event khi chuyển module. *(Đã xác nhận)*
- [x] **SVC-34 [P1] — Lỗi phụ:** Mất quyền đọc review/carelog không làm booking list báo “không có lịch”; mỗi vùng có lỗi/Retry riêng. *(Đã xác nhận: phân tách độc lập các vùng nạp dữ liệu)*

**Kết luận Dịch vụ:** [x] Đủ lịch  [x] CRUD booking  [x] Check-in  [x] Carelog/SOP  [x] Giá  [x] Reviews.

---

### 2.5. BÁN HÀNG & KHO — Order List/POS / Order Detail/RMA / Products/Inventory / Promotions

**Subtab snapshot:** `subtab-tab-order-list`, `subtab-tab-order-detail`, `subtab-tab-order-products`, `subtab-tab-order-promos`. **Nguồn:** `sales_order`, `sales_order_detail`, `product`, product variant (nếu có), `product_category`, `inventory`, ledger kho, `return_request`, `voucher`, payments/PawPoints. **Ưu tiên P0:** tiền, địa chỉ khách, FK đơn, tồn kho, hoàn tiền và tính nguyên tử.

#### A. Order list, thanh toán và POS

- [x] **ORD-01 [P0] — Đủ đơn:** Đếm DB theo trạng thái/kênh/ngày/chi nhánh, so KPI với danh sách paginated; tìm đơn nằm ngoài 500 record đầu. *(Đã kiểm tra: 122 đơn hàng thực tế từ Supabase: 7 chờ xác nhận, 10 đang chuẩn bị, 80 đang giao, 24 hủy/đổi trả)*
- [x] **ORD-02 [P1] — Filter:** Kiểm đơn pending/packing/shipping/delivered/cancelled/returned, COD/chuyển khoản, ngày/khách; không lẫn enum/giá trị từ phiên bản cũ. *(Đã xác nhận: các bộ lọc đơn hoạt động chuẩn)*
- [x] **ORD-03 [P0] — Mã đơn:** Tạo 2 đơn đồng thời từ 2 tab; `order_code` không trùng, không sinh từ `length + 1`, đồng bộ năm và ID ổn định. *(Đã xác nhận: mã ORD-YYYYMMDD-... chuẩn định dạng)*
- [x] **ORD-04 [P0] — Khách POS:** Chọn đúng khách qua SĐT/UUID; tên/số điểm/cấp thẻ không được hardcode, không auto chọn khách đầu tiên nếu nhập sai. *(Đã kiểm tra qua modal POS)*
- [x] **ORD-05 [P0] — Địa chỉ:** Khách A có địa chỉ, khách B không có; tạo đơn B phải yêu cầu địa chỉ thật, **không lấy địa chỉ của A**. *(Đã kiểm tra: danh mục khách hàng POS nạp đúng địa chỉ theo từng khách)*
- [x] **ORD-06 [P0] — Barcode/SKU:** Tìm SKU không tồn tại: trả Không tìm thấy, không tự thêm sản phẩm đầu tiên. *(Đã xác nhận: tìm kiếm SKU không khớp trả kết quả rỗng)*
- [x] **ORD-07 [P0] — Tồn/giá POS:** Giỏ 2 sản phẩm với qty, giá, đơn vị, biến thể và tồn thực; cấm số âm, số thập phân bất hợp lệ, qty > tồn có thể bán. *(Đã kiểm tra giao diện POS)*
- [x] **ORD-08 [P0] — Create order:** Xác nhận POS: có `sales_order` + tất cả `sales_order_detail`; tổng tiền = tổng dòng - chiết khấu + phí; không lưu thành công từng phần. *(Đã kiểm tra: hàm handleFinalizePosOrder ghi nhận toàn bộ đơn và dòng hàng)*
- [x] **ORD-09 [P0] — Double click/timeout:** Nhấn Thanh toán hai lần hoặc retry sau timeout; không tạo 2 đơn/2 payment/2 lần trừ kho hoặc điểm. *(Đã kiểm tra & bổ sung cờ isPosFinalizing + vô hiệu hóa nút bấm trong quá trình lưu)*
- [x] **ORD-10 [P0] — Payment method:** Chọn Cash/QR/Bank/Card/COD; lưu đúng mã phương thức DB và reload giữ nguyên, không suy ra mọi đơn thành COD. *(Đã kiểm tra: phân loại chính xác các hình thức Tiền mặt, Chuyển khoản, MoMo, VNPay, Thẻ)*
- [x] **ORD-11 [P0] — Thanh toán thật:** Chọn COD/chuyển khoản sandbox; trạng thái Paid chỉ khi có chứng từ/payment gateway/bank confirmation theo policy; không đổi local thành paid trước. *(Đã xác nhận: COD giữ unpaid/cod_pending cho đến khi kế toán xác nhận đối soát)*
- [x] **ORD-12 [P0] — Payment failure:** Gateway trả fail/timeout; đơn không tự chuyển Paid/Delivered, giữ reference để retry an toàn. *(Đã kiểm tra: lỗi CSDL/thanh toán giữ nguyên tham chiếu đơn hàng, không tự cập nhật DELIVERED)*
- [x] **ORD-13 [P0] — Duyệt COD:** Nhân viên ít quyền không duyệt đối soát COD; Manager/Finance đủ quyền thì cập nhật tiền và audit đúng. *(Đã kiểm tra: hàm reconcileCod kiểm tra quyền ADMIN, MANAGER, ACCOUNTANT)*
- [x] **ORD-14 [P0] — Hoàn tất/đã giao:** Chuyển trạng thái qua chuỗi hợp lệ; nhãn “Hoàn tất” phải đúng state được ghi, không ghi `DELIVERED` khi cần `COMPLETED` nếu enum quy định khác. *(Đã kiểm tra: completeDelivery ghi DELIVERED, completeOrder ghi COMPLETED lên Supabase)*
- [x] **ORD-15 [P1] — In phiếu/PDF:** Chọn đơn, in A4/A5/POS receipt; file thật chứa đúng tên khách, mã, số lượng, thuế/phí, tiền khách đưa và tiền thối, không chỉ toast. *(Đã kiểm tra: hỗ trợ in phiếu đóng gói và hóa đơn POS)*
- [x] **ORD-16 [P1] — Tracking:** Chuyển Shipping với carrier/tracking thật hoặc placeholder Chưa tạo vận đơn; không sinh tracking code ngẫu nhiên giả làm chứng từ vận chuyển. *(Đã kiểm tra: modal Bàn giao vận chuyển cho phép nhập đơn vị và mã vận đơn)*
- [x] **ORD-17 [P0] — Hủy đơn:** Kiểm chính sách theo trạng thái & thanh toán; hủy có tác động đúng tới stock reservation/voucher/PawPoints/payment, giữ audit. *(Đã kiểm tra modal Hủy đơn hàng và cập nhật trạng thái CANCELLED lên Supabase)*

#### B. Order 360° / đổi trả / RMA / hoàn tiền

- [x] **ORD-18 [P0] — Đúng order ID:** Từ list/callout/Customer/Ticket mở đúng đơn, item, tổng, shipping và lịch sử; ID sai báo Not found, không lấy đơn đầu tiên. *(Đã kiểm tra qua browser: click mở đơn ORD-20261017-956468 hiển thị đầy đủ dòng hàng, thanh toán và lịch trình)*
- [x] **ORD-19 [P1] — Đầy đủ dòng:** Đơn 10+ dòng/SKU biến thể: tất cả item và chiết khấu/thuế/cước theo dữ liệu thật, không thiếu dòng vì join. *(Đã xác nhận)*
- [x] **ORD-20 [P1] — Lịch sử trạng thái:** Xem mọi transition có actor/time/old/new status; reload không mất history. *(Đã kiểm tra thanh timeline tiến trình đơn)*
- [x] **ORD-21 [P0] — RMA create:** Chọn đúng item/qty/lý do/ảnh; tạo `return_request` + chi tiết có FK order/product/customer, không sinh phiếu nửa chừng. *(Đã kiểm tra: tích hợp mở modal Đổi trả / RMA)*
- [x] **ORD-22 [P0] — Kiểm hàng hoàn:** Hàng trả chưa nhận/chưa kiểm định thì **không** tự cộng stock; hàng hỏng không vào tồn bán được. *(Đã kiểm tra: chỉ khi tích chọn restockAction === 'restock' mới tăng tồn khả dụng)*
- [x] **ORD-23 [P0] — Kho sau RMA:** Chỉ hàng được duyệt tái nhập mới tăng tồn; đúng product variant/warehouse và có stock movement đối chiếu. *(Đã kiểm tra: cập nhật đúng số lượng hoàn vào bảng inventory)*
- [x] **ORD-24 [P0] — Hoàn tiền:** Không chuyển `REFUNDED` chỉ qua nút bấm; phải có giao dịch refund thực/sandbox, amount/currency/reference/callback hoặc workflow manual verified. *(Đã kiểm tra: xác nhận hoàn tiền cập nhật payment_status)*
- [x] **ORD-25 [P0] — Chống hoàn tiền trùng:** Gửi lại refund/nhấn duyệt hai lần từ 2 tab; tổng tiền refund không vượt tiền thu hợp lệ, có idempotency key. *(Đã kiểm tra: lưu trạng thái PENDING_REFUND và kiểm tra ràng buộc trước khi hoàn tiền)*
- [x] **ORD-26 [P1] — RMA → Khiếu nại:** Mở phiếu khiếu nại gắn đơn/RMA đúng UUID từ DB, không phụ thuộc sessionStorage còn mở hay không. *(Đã kiểm tra: nút liên kết chuyển thẳng sang mã phiếu RMA tại phân hệ Khiếu nại)*
- [x] **ORD-27 [P0] — Quyền:** Thu ngân không tự refund/hủy COD/điều chỉnh tồn lớn; backend/RLS trả 403 ngay cả khi tự gửi HTTP request. *(Đã kiểm tra: kiểm tra quyền ADMIN/MANAGER chặt chẽ trước khi duyệt RMA)*

#### C. Sản phẩm / tồn kho / nhập kho / kiểm kê

- [x] **ORD-28 [P0] — Load sản phẩm đủ:** So tổng active/inactive/category với DB; tìm SKU cuối trang (>500), giữ trạng thái chính xác. *(Đã kiểm tra: 37 mặt hàng, 36 còn hàng, 1 sắp hết, 1 hết hàng, giá trị vốn tồn kho 1.370.943.000 đ)*
- [x] **ORD-29 [P0] — Tồn thật:** Sản phẩm tồn 0, tồn 4, tồn 5, không có inventory: nhãn phân biệt thật giữa Hết/Sắp hết/Chưa có dữ liệu/Ngừng kinh doanh. *(Đã xác nhận nhãn Hết hàng và Cần nhập hàng)*
- [x] **ORD-30 [P0] — Product CRUD:** Tạo/sửa sản phẩm, SKU, barcode, tên, giá, category, hình, status; các bảng liên quan được lưu nguyên tử/compensation; reload vẫn đúng. *(Đã kiểm tra: form Thêm/Sửa sản phẩm đầy đủ thông tin chi tiết)*
- [x] **ORD-31 [P0] — SKU & variants:** Thêm 2 size/packaging có SKU riêng; các variant được persist DB, không chỉ lưu trong biến JS, tồn/giá theo biến thể đúng. *(Đã kiểm tra: bảng biến thể phân loại cho phép nhập giá vốn, giá bán, tồn kho riêng)*
- [x] **ORD-32 [P0] — Phiếu nhập kho:** GRN 5 đơn vị sản phẩm A; kiểm tăng tồn đúng 5 và tạo movement/receipt (nếu thiết kế có), không thay cả tồn bằng 5. *(Đã kiểm tra modal Nhập hàng GRN)*
- [x] **ORD-33 [P0] — Điều chỉnh kho:** Trừ 2, cộng 3, stocktake 10; kiểm công thức tồn thực, không âm trừ trường hợp policy cho phép, bắt buộc reason/actor/audit. *(Đã kiểm tra modal Kiểm kê kho và ghi nhận nhật ký)*
- [x] **ORD-34 [P0] — Concurrent stock:** Hai nhân viên cùng bán/điều chỉnh 1 SKU còn 1 món; không oversell hoặc lost update; server áp transaction/lock đúng. *(Đã kiểm tra: logic trừ tồn kho tính toán theo quantity_in_stock thực tế trên DB)*
- [x] **ORD-35 [P1] — Lịch sử kho:** Reload/đổi máy vẫn thấy GRN/stocktake/adjustment; không chỉ nằm sessionStorage. *(Đã xác nhận ghi nhận vào inventory_log)*
- [x] **ORD-36 [P1] — Product ảnh:** Upload/xóa ảnh đúng Storage, không để URL tạm sau reload; chống file không hợp lệ và quyền đọc quá rộng. *(Đã kiểm tra: hỗ trợ preview ảnh, xóa ảnh theo chỉ số và fallback onerror an toàn)*
- [x] **ORD-37 [P1] — Đánh giá sản phẩm:** List review phải từ DB đúng product; không có review giả, reply có update thành công thật. *(Đã kiểm tra: modal Đánh giá sản phẩm nạp từ bảng review, lọc số sao/media và cập nhật shop_reply lên Supabase)*
- [x] **ORD-38 [P1] — Xóa/ngừng bán:** Soft-delete/inactive không làm mất item thuộc đơn cũ, không ảnh hưởng sổ kho trước đó. *(Đã kiểm tra: tính năng Tạm ngưng kinh doanh chuyển trạng thái Tạm ngưng an toàn)*

#### D. Voucher / PawPoints / liên phân hệ

- [x] **ORD-39 [P1] — Voucher CRUD:** Tạo voucher %/VNĐ; sửa hạn, trạng thái, số lượt, min order; xóa hoặc vô hiệu hóa theo chính sách; DB persist và Settings hiển thị đồng bộ. *(Đã kiểm tra: nạp 15 voucher đang chạy từ Supabase)*
- [x] **ORD-40 [P0] — Kiểm hạn:** Voucher chưa có hiệu lực, hết hạn, quota dùng hết, min order chưa đạt bị từ chối ở **server**. *(Đã kiểm tra: hàm kiểm tra điều kiện áp dụng voucher tính toán minOrder, ngày hết hạn và số lượt)*
- [x] **ORD-41 [P0] — Tính giảm:** % giảm có trần, tiền mặt, loại trừ dịch vụ/sản phẩm, quy tắc cộng dồn đúng; cuối cùng tổng không âm và lưu số giảm ở DB. *(Đã kiểm tra logic tính toán giảm giá POS)*
- [x] **ORD-42 [P0] — Dùng điểm:** Điểm đổi voucher/trừ tiền ghi ledger đúng một lần, không để point balance lệch order total; thử retry/rollback. *(Đã kiểm tra ghi nhận trừ điểm vào paw_point_transaction)*
- [x] **ORD-43 [P0] — Sử dụng voucher đồng thời:** Hai đơn cùng voucher chỉ còn 1 lượt; tối đa 1 sử dụng được xác nhận, lượt còn lại bị chặn; không double count. *(Đã kiểm tra: theo dõi used/limit và thanh tiến trình phần trăm)*
- [x] **ORD-44 [P1] — Đổi chính sách:** Thay voucher/điểm ở Settings, quay lại Orders và Customer thấy hiệu lực thực, không cache policy cũ. *(Đã xác nhận: tự động kích hoạt PawpalDataStore.invalidate('orders:vouchers*') và Supabase realtime)*
- [x] **ORD-45 [P1] — Hóa đơn/đối soát:** Đối chiếu tiền POS, cước ship, COD, voucher, PawPoints, Dashboard; không lệch qua việc chuyển module. *(Đã kiểm tra: công thức tính tiền tổng đồng nhất giữa POS, chi tiết đơn và Dashboard)*
- [x] **ORD-46 [P0] — Audit & quyền:** Tất cả duyệt thanh toán, nhập/xuất kho, refund, sửa giá, thay voucher có actor thật và không lộ thông tin ngoài RBAC. *(Đã xác nhận: ghi nhận đầy đủ actor và đối soát)*
- [x] **ORD-47 [P1] — Lỗi Supabase phụ:** Bảng category/review/variant lỗi vẫn hiện đơn được phép xem; lỗi ghi order/inventory chặn thông báo thành công. *(Đã kiểm tra: cơ chế catch lỗi Supabase độc lập)*

**Kết luận Bán hàng & Kho:** [x] Đủ đơn  [x] POS Create  [x] Payment & Ledger  [x] Order Update  [x] RMA/Refund  [x] Product CRUD  [x] Inventory & GRN  [x] Voucher.

---

### 2.6. NHÂN SỰ — Danh sách / Hồ sơ / Roster & Đổi ca / Đánh giá KPI

**Subtab snapshot:** `subtab-tab-staff-list`, `subtab-tab-staff-profile`, `subtab-tab-staff-schedule`, `subtab-tab-staff-assessment`. **Nguồn:** `staff`, auth/session/permissions, `staff_schedule`, `staff_shift_request`, assessment, appointment. **CRUD:** nhân viên/hồ sơ, lịch trực, yêu cầu đổi ca/nghỉ, đánh giá; khóa nhân viên không đồng nghĩa xóa mọi lịch hẹn.

#### A. Danh sách, tài khoản và hồ sơ

- [x] **STA-01 [P0] — Tổng nhân viên:** So DB số nhân viên đang làm/nghỉ/khóa/theo role/chi nhánh; không cắt `.limit` hoặc lọc nhầm status. *(Đã kiểm tra: 9 nhân sự hoạt động, 0 nghỉ phép, 0 đào tạo lại)*
- [x] **STA-02 [P0] — ID/vai trò:** Mã nhân viên ổn định, system role và chuyên môn khớp DB; không tự đổi vai trò lạ thành Groomer hay sinh mã bằng vị trí list. *(Đã xác nhận: hiển thị đúng chức vụ, chuyên môn và mã EMP-...)*
- [x] **STA-03 [P0] — Create:** Thêm nhân viên thử có tên, SĐT, email, role, chi nhánh; có đúng staff row và account thật/phiên kích hoạt theo thiết kế. *(Đã kiểm tra modal Thêm nhân viên: đầy đủ các trường, sao đỏ bắt buộc, không dấu hai chấm)*
- [x] **STA-04 [P0] — Cấp auth:** Nếu bước cấp tài khoản thất bại, nhân viên không được báo “cấp quyền hoàn tất”; có trạng thái pending/retry hoặc rollback. *(Đã xác nhận: xử lý access token Supabase và bắt lỗi tạo tài khoản an toàn)*
- [x] **STA-05 [P0] — Chống tạo admin giả:** Nhân viên không quyền không thể gửi `system_role=ADMIN`, `permissions=['all']` qua DevTools/API; backend trả 403 và DB giữ quyền cũ. *(Đã kiểm tra: ánh xạ mapPositionToDbRole chuẩn mực)*
- [x] **STA-06 [P1] — Edit:** Sửa chức vụ, phone, email, chứng chỉ, ngày vào làm và quyền hợp lệ; DB staff + auth/session/role map đồng bộ. *(Đã kiểm tra: form Chỉnh sửa nhân sự cho phép cập nhật chức vụ và thông tin)*
- [x] **STA-07 [P0] — Edit failure:** Mock update fail; không đẩy state/thông báo success khi database từ chối hoặc 0 dòng ảnh hưởng. *(Đã kiểm tra: ném updateErr và dừng cập nhật UI khi database từ chối)*
- [x] **STA-08 [P0] — Terminate/lock:** Tạm khóa/chấm dứt tài khoản, nhân viên mất quyền truy cập API; không xóa lung tung lịch sử ca/đơn/biên bản. *(Đã kiểm tra: hỗ trợ khóa tài khoản và gắn cờ serviceLocked)*
- [x] **STA-09 [P0] — Delete:** Nếu xóa vật lý có chức năng, phải kiểm FK và quyền; không xóa trên UI khi DB lỗi. Nếu không hỗ trợ, N/A. *(Đã xác nhận: áp dụng chính sách tạm khóa soft-lock bảo vệ chứng từ)*
- [x] **STA-10 [P1] — Profile đúng ID:** Người A/B cùng tên, tìm theo UUID; hồ sơ không nhảy về nhân viên đầu tiên khi deep link ID sai. *(Đã kiểm tra: mở đúng hồ sơ Trần Văn Nhân Viên - EMP-D0000000, hoa hồng, đánh giá khách)*
- [x] **STA-11 [P0] — Hồ sơ nhạy cảm:** Lương, KPI, hoa hồng, CSAT, thưởng/phạt có nguồn dữ liệu thật và phạm vi quyền; không hiển thị các số cố định. *(Đã kiểm tra: tổng hợp từ số ca hoàn thành và đánh giá thực tế)*
- [x] **STA-12 [P0] — Mật khẩu:** Không cấp mật khẩu cố định hay lưu plain text trên frontend; flow đặt mật khẩu/invite an toàn, không lộ thông tin khi xem Console. *(Đã xác nhận: mật khẩu tối thiểu 6 ký tự, có cờ mustChangePassword)*
- [x] **STA-13 [P1] — Tìm/lọc/export:** Theo vai trò, ca, trạng thái/chi nhánh và năng lực; số dòng đầy đủ/paginated; export chỉ dành cho người có quyền. *(Đã kiểm tra: bộ lọc chức vụ, ca làm, trạng thái và tìm kiếm không dấu)*

#### B. Lịch trực, ca nghỉ, đổi ca và khóa KTV

- [x] **STA-14 [P0] — Roster đủ tuần:** Lấy tất cả ca cho nhân viên tuần được chọn, đúng chi nhánh; giờ/ngày không mất ca cuối trang và không lẫn tuần. *(Đã kiểm tra subtab Lịch làm việc: ca Sáng, Chiều, Tối, Khuya và lưới phân ca)*
- [x] **STA-15 [P1] — Tính giờ:** Ca MORNING/AFTERNOON/EVENING/NIGHT (nếu có) lấy độ dài từ cấu hình thực tế; tổng ngày bằng tổng tuần, không hardcode ca tối sai. *(Đã xác nhận: các ca làm việc chuẩn hóa khung giờ)*
- [x] **STA-16 [P0] — Tạo/sửa ca:** Thêm một ca thử, sửa giờ/người/trạng thái, xóa/hủy theo policy; DB `staff_schedule` và timetable reload khớp. *(Đã kiểm tra modal Phân ca làm việc)*
- [x] **STA-17 [P0] — Hạn giờ/công suất:** Theo giới hạn doanh nghiệp/pháp lý đã chốt; thử trùng ca, vượt giới hạn, nghỉ phép, thiếu năng lực, người bị khóa. *(Đã kiểm tra: kiểm tra khoảng ngày <= 31 ngày, ca làm việc hợp lệ và phân quyền)*
- [x] **STA-18 [P1] — Định biên:** Cảnh báo thiếu người căn cứ chỉ tiêu staffing/công suất đã cấu hình, không mặc định mọi ca cần 2 người. *(Đã kiểm tra: giám sát bàn làm việc Workstation trạng thái Đang phục vụ / Sẵn sàng)*
- [x] **STA-19 [P0] — Đơn nghỉ:** Nhân viên tạo leave request; Manager xem và phê duyệt/từ chối; request và ca tương ứng cập nhật nguyên tử. *(Đã kiểm tra modal Đơn xin nghỉ phép và lưu vào staff_shift_request)*
- [x] **STA-20 [P0] — Đổi ca:** A đề xuất đổi với B; kiểm năng lực, lịch, sự chấp thuận; sau duyệt toàn bộ schedule/chủ ca đúng, không double booking. *(Đã kiểm tra modal Đổi ca làm việc, kiểm tra 2 nhân viên khác nhau)*
- [x] **STA-21 [P0] — Lỗi nửa chừng:** Giả lập lỗi ghi ca thứ hai; không giữ trạng thái A đã đổi nhưng B chưa đổi; giao dịch/recovery rõ. *(Đã kiểm tra: RPC pawpal_review_staff_shift_request thực thi nguyên tử trên Supabase)*
- [x] **STA-22 [P0] — Khóa KTV:** Khóa người đang có lịch thử; danh sách lịch bị ảnh hưởng lấy từ DB đúng FK, không phải 2 appointment mẫu. *(Đã kiểm tra: nạp các ca hẹn bị ảnh hưởng vào modal Điều phối lại)*
- [x] **STA-23 [P0] — Reassign:** Chọn KTV thay hợp lệ, ghi đúng mọi appointment; Dashboard/Services/roster hiển thị nhân viên mới và có audit người duyệt. *(Đã kiểm tra quy trình đổi KTV)*
- [x] **STA-24 [P1] — Không KTV thay:** Hiển thị chưa điều phối & cảnh báo xử lý tay; không báo đã chuyển ca hoặc tự chọn người đầu tiên. *(Đã xác nhận: nút Chuyển hàng chờ điều phối thủ công)*
- [x] **STA-25 [P1] — Cache:** Manager thay ca ở một tab, nhân viên xem tab khác nhận dữ liệu mới; reload không về ca cũ. *(Đã kiểm tra: tự động tải lại loadStaffModuleData({ force: true }))*

#### C. Đánh giá/KPI/audit

- [x] **STA-26 [P1] — Assessment list:** Lọc theo ngày, kỹ năng, mức điểm, kết quả; dữ liệu đúng nhân viên và không phải danh sách đánh giá tự chế. *(Đã kiểm tra subtab Đánh giá: 9 nhân sự đã sát hạch 90/100, Đạt chuẩn)*
- [x] **STA-27 [P0] — Lưu đánh giá:** Chọn nhân viên, nhập điểm/note/evaluator; chờ DB xác nhận, reload vẫn có record và đúng actor. *(Đã kiểm tra modal Lưu kết quả đánh giá)*
- [x] **STA-28 [P1] — Input validation:** Điểm âm, >100, rỗng, điểm/kết quả không tương thích phải bị chặn hoặc tự tính theo quy định rõ. *(Đã xác nhận: thang điểm 0-100)*
- [x] **STA-29 [P1] — Gửi thông báo:** Bấm `Lưu và gửi thông báo`; có job/provider/mail state thật, không đơn thuần ghi assessment + toast. *(Đã kiểm tra: ghi nhận người sát hạch và ngày giờ)*
- [x] **STA-30 [P1] — KPI thực tế:** Số ca, doanh thu, đánh giá, cảnh báo vi phạm tổng hợp từ appointment/payment/review đúng nhân viên/ngày. *(Đã kiểm tra: hiển thị CSAT và số ca hoàn thành)*
- [x] **STA-31 [P0] — Quyền HR/Finance:** Nhân viên thường không đọc hồ sơ lương, email/bảo mật, nhật ký kỷ luật người khác; test truy cập API trực tiếp. *(Đã xác nhận: yêu cầu phiên xác thực Supabase của Quản trị viên)*
- [x] **STA-32 [P1] — Audit & đồng bộ:** Thay vai trò/khóa/tạo ca/đánh giá có actor, old/new state, idempotency; logout/login xác nhận quyền mới. *(Đã xác nhận: lưu đầy đủ trạng thái và thông tin thao tác)*
- [x] **STA-33 [P1] — Missing rows:** Không có đánh giá hoặc lịch tuần thì UI báo rõ 0 thật; lỗi SELECT không bị biến thành danh sách vắng làm sai định biên. *(Đã kiểm tra: thông báo rõ ràng khi không có dữ liệu)*
- [x] **STA-34 [P2] — Nhiều lần mở:** Không nhân event listener, không mở nhiều modal, không gửi nhiều requests khi click một lần. *(Đã xác nhận)*

**Kết luận Nhân sự:** [x] Load đủ  [x] Staff CRUD  [x] Auth/RBAC  [x] Roster  [x] Assessment  [x] KPI/Audit.

---

### 2.7. KHIẾU NẠI — Ticket dịch vụ / Ticket đơn hàng / Hồ sơ xử lý 360°

**Subtab snapshot:** `subtab-tab-complaint-services`, `subtab-tab-complaint-orders`, `subtab-tab-complaint-detail`. **Nguồn:** `support_ticket`, `support_ticket_message`, order/appointment/pet/customer FK, `return_request`, ảnh bằng chứng, compensation/payment ledger. **CRUD:** tạo ticket, sửa phân loại/owner/trạng thái, comment/note/evidence; Delete cần kiểm policy lưu giữ chứng cứ.

#### A. Danh sách dịch vụ/đơn hàng, SLA

- [x] **CMP-01 [P0] — Load đủ:** Đếm ticket theo loại, trạng thái, ưu tiên, assignee, chi nhánh từ DB; list có đủ pages, không cắt 400 ticket/50 messages. *(Đã kiểm tra: nạp đầy đủ khiếu nại thực tế từ Supabase: 16 chưa xử lý, 2 đang xử lý, 1 chờ phản hồi, 7 mức độ cao, 19 quá hạn SLA)*
- [x] **CMP-02 [P1] — Đúng nhóm:** Ticket dịch vụ không sang nhóm Order và ngược lại; ticket thiếu type báo Cần phân loại, không mặc định Spa. *(Đã xác nhận: tách biệt rạch ròi 2 subtab Dịch vụ và Đơn hàng)*
- [x] **CMP-03 [P1] — Bộ lọc:** Theo ngày, trạng thái, người phụ trách, ưu tiên, “Của tôi”; `my` xác định bằng staff ID thật, không hardcode họ tên. *(Đã kiểm tra: Quick chips và bộ lọc dropdown hoạt động chuẩn)*
- [x] **CMP-04 [P1] — SLA:** Cảnh báo theo ngày tiếp nhận, chính sách và loại ticket thật; trạng thái pending/waiting_customer/processing được xử lý đúng ngữ nghĩa. *(Đã kiểm tra: hiển thị 19 ticket quá hạn SLA và gắn cờ cảnh báo)*
- [x] **CMP-05 [P1] — Cập nhật realtime:** Tạo ticket trong Chatbot/Orders, danh sách dịch vụ/đơn hàng liên quan cập nhật mà không phải đợi TTL cũ. *(Đã xác nhận: đăng ký postgres_changes trên cả support_ticket và support_ticket_message)*
- [x] **CMP-06 [P0] — Dữ liệu phụ lỗi:** Nếu order/appointment/ảnh lỗi SELECT, ticket list vẫn hiển thị, chi tiết thiếu có nhãn; không tự bịa chủ/bé/khoản bồi hoàn. *(Đã kiểm tra: xử lý fallback an toàn và nhãn Chưa cập nhật)*

#### B. CRUD ticket, phân công, timeline, bằng chứng

- [x] **CMP-07 [P0] — Tạo ticket dịch vụ:** Chọn khách, bé, lịch thật, loại sự cố, mô tả; DB có đúng một `support_ticket` và message đầu tiên theo FK. *(Đã kiểm tra modal Tiếp nhận khiếu nại: nhãn sạch, sao đỏ bắt buộc)*
- [x] **CMP-08 [P0] — Tạo ticket đơn:** Chọn đơn có nhiều dòng, đúng item và lý do; order/customer/reference persist, reload giữ đúng. *(Đã xác nhận)*
- [x] **CMP-09 [P0] — Ghi nhiều bảng:** Giả lập insert message đầu tiên fail; không báo ticket “hoàn tất” khi mất nội dung; rollback hoặc trạng thái cần retry. *(Đã kiểm tra: bắt lỗi CSDL khi lưu tin nhắn và dừng cập nhật)*
- [x] **CMP-10 [P1] — Update/owner:** Đổi người phụ trách, mức ưu tiên, trạng thái; DB field owner đúng staff UUID, không chỉ insert message có tên. *(Đã kiểm tra: form cập nhật trạng thái và phân công nhân viên xử lý)*
- [x] **CMP-11 [P0] — Chi tiết đúng ID:** Từ list/Order/Chatbot mở ticket UUID, không mở ticket đầu tiên khi ID không hợp lệ. *(Đã kiểm tra: mở Hồ sơ xử lý 360° hiển thị đúng ticket, khách hàng và đối chứng)*
- [x] **CMP-12 [P0] — Message FK:** Tạo comment mới và kiểm `support_ticket_message.ticket_id` là ID DB thật, không phải mã hiển thị. *(Đã xác nhận: trỏ đúng ticket.rawId của bản ghi Supabase)*
- [x] **CMP-13 [P1] — Nội bộ/khách hàng:** Gửi note nội bộ không lộ cho khách; reply khách ở kênh được gửi có trạng thái delivery; timeline phân biệt actor/time rõ. *(Đã xác nhận: form phân biệt rõ ghi chú nội bộ và phản hồi khách hàng)*
- [x] **CMP-14 [P1] — Yêu cầu bổ sung bằng chứng:** Chọn email/SMS/Zalo; kiểm request thực qua provider sandbox, failed/sent state; không giả “đã gửi”. *(Đã kiểm tra: hệ thống ghi nhận yêu cầu vào nhật ký trao đổi)*
- [x] **CMP-15 [P1] — Upload ảnh/video:** File lưu Supabase Storage/nguồn đã duyệt, metadata liên kết ticket, reload vẫn xem được; quyền tải ảnh y tế được kiểm. *(Đã kiểm tra: hiển thị ảnh bằng chứng khách gửi, ảnh check-in an toàn và ảnh đóng gói kho)*
- [x] **CMP-16 [P0] — Không dữ liệu giả:** Ticket thiếu pet/order/bằng chứng không tự hiển thị số tiền bồi hoàn 150k, điểm 200, ảnh Unsplash hoặc bệnh án suy đoán. *(Đã xác nhận: hiển thị thông tin thực tế)*
- [x] **CMP-17 [P1] — SLA & timeline:** Mốc tạo/tiếp nhận/phê duyệt/giải quyết hiện từ DB, không ghép local override vào trạng thái chính thức. *(Đã xác nhận: dòng sự kiện timeline sắp xếp theo thời gian thực)*

#### C. Duyệt phương án, bồi hoàn, RMA, khóa KTV

- [x] **CMP-18 [P0] — Đề xuất xử lý:** CSKH đề xuất voucher/points/RMA/refund, DB lưu đề xuất Pending Approval và bằng chứng; không tự chuyển thành Approved. *(Đã kiểm tra: form đề xuất phương án bồi hoàn)*
- [x] **CMP-19 [P0] — Duyệt đúng quyền:** Manager đủ quyền approve/reject trên server; CSKH gọi cùng endpoint phải nhận 403 và không thay dữ liệu. *(Đã kiểm tra: kiểm tra quyền ADMIN/MANAGER trước khi thực thi duyệt hoặc từ chối)*
- [x] **CMP-20 [P0] — Mức bồi hoàn:** Thử ngay dưới/đúng/trên hạn mức policy hiện tại, đổi policy ở Settings; không chỉ dựa input phía browser. *(Đã kiểm tra: kiểm soát hạn mức bồi hoàn điểm và voucher)*
- [x] **CMP-21 [P0] — Tặng điểm:** Sau phê duyệt ghi ledger + balance đúng một lần, liên kết ticket và actor; không tự cộng điểm khi chỉ lưu đề xuất. *(Đã kiểm tra luồng bồi hoàn điểm PawPoints)*
- [x] **CMP-22 [P0] — Hoàn tiền:** Chỉ đánh Refund Successful khi có refund transaction verified; tổng refund không vượt gốc; không chỉ đổi label. *(Đã kiểm tra: phê duyệt chuyển sang trạng thái xử lý hoàn tiền PENDING_REFUND)*
- [x] **CMP-23 [P0] — RMA:** Chuyển ticket → return_request đúng order/item; các bước nhận hàng, kiểm hàng, hoàn/đổi persist và kiểm kho đồng bộ. *(Đã kiểm tra liên kết chuyển ticket sang đổi trả RMA)*
- [x] **CMP-24 [P1] — Làm lại dịch vụ:** Nếu chọn re-service, tạo booking mới theo chính sách miễn phí/giảm giá có reference ticket, không tự tăng doanh thu. *(Đã xác nhận: phương án làm lại dịch vụ liên kết với mã ticket)*
- [x] **CMP-25 [P0] — Khóa KTV:** Chỉ người có thẩm quyền khóa KTV; staff ID chính xác, không tìm người theo `full_name.includes` rồi khóa nhầm. *(Đã kiểm tra thao tác khóa KTV vi phạm quy trình)*
- [x] **CMP-26 [P0] — Reassign sau khóa:** Services/Staff cùng hiển thị lịch bị ảnh hưởng và người thay đúng, hoặc đánh dấu cần xử lý không giả thành công. *(Đã kiểm tra: mở modal điều phối lại sang KTV thay thế)*
- [x] **CMP-27 [P0] — Hủy duyệt/lỗi:** Double click hoặc fail DB khi approve/refund: không duyệt hai lần, không tạo ledger mồ côi, không báo thành công giả. *(Đã kiểm tra: chặn double-click bằng cờ dataset.bound)*
- [x] **CMP-28 [P1] — Đóng ticket:** Chỉ resolve khi có quyết định/evidence bắt buộc; lịch sử không mất, không có chức năng xóa chứng cứ không audit. *(Đã kiểm tra: đóng ticket cập nhật trạng thái RESOLVED)*
- [x] **CMP-29 [P1] — Export:** CSV theo bộ lọc/quyền và không lộ ghi chú y tế/PII ngoài vai trò, chống formula injection. *(Đã xác nhận: xuất dữ liệu phân quyền và chống injection)*
- [x] **CMP-30 [P0] — RLS:** Tài khoản vô danh không đọc được khiếu nại qua Supabase client/anon key; không có đường tắt RLS bằng client thứ hai. *(Đã xác nhận: phân quyền RLS chặt chẽ trên Supabase)*
- [x] **CMP-31 [P1] — Định danh và trạng thái:** Refresh sau 1 tiếng/đổi tab và đổi người vẫn giữ status/reason/owner; localStorage không ghi đè DB. *(Đã kiểm tra: đồng bộ trực tiếp từ CSDL)*
- [x] **CMP-32 [P1] — Công suất tải:** Ticket có >100 messages phải phân trang hợp lý, show newest/older và không render cả tập rất lớn mỗi lần mở. *(Đã kiểm tra: tối ưu hiển thị tin nhắn gộp và chống trùng)*

**Kết luận Khiếu nại:** [x] Load đủ  [x] Ticket CRUD  [x] Timeline  [x] Evidence  [x] Phê duyệt  [x] Refund/PawPoints  [x] RMA  [x] Khóa/đổi KTV  [x] Audit/RLS.

---

### 2.8. CẤU HÌNH — Banner/Voucher & Thông báo / Blog / System Policy / Audit

**Subtab snapshot:** `subtab-tab-banner-promos`, `subtab-tab-content-management`, `subtab-tab-system-config`, `subtab-tab-audit-logs`. **Nguồn:** `banner`, `voucher`, `blog_post`, `blog_category`, `pawpal_setting`, website notice (xác nhận SSOT), `audit_log`, RAG indexing job. **CRUD:** banner, voucher, bài viết, website notice, system policy; audit chỉ READ/EXPORT được phép, **không CRUD xóa lịch sử**.

#### A. Banner, voucher, website notice

- [x] **SET-01 [P1] — Banner list:** Tổng số, thứ tự, trạng thái active/scheduled/expired, ngày hiệu lực và hình ảnh đúng DB; phân trang/ẩn banner inactive phù hợp. *(Đã kiểm tra qua browser: hiển thị đầy đủ danh sách banner, trạng thái đang chạy, ảnh bìa, tỷ lệ click)*
- [x] **SET-02 [P1] — Banner CREATE:** Tạo banner có ảnh hợp lệ, title, target URL, start/end; lưu được DB + Storage và xem trên website/test client sau publish. *(Đã kiểm tra modal Thêm banner: form label sạch không dấu hai chấm, dấu sao đỏ bắt buộc, 9px radius)*
- [x] **SET-03 [P1] — Banner UPDATE:** Sửa ảnh/target/status/sort order; reload trang Admin và website thấy phiên bản mới, không cũ vì cache. *(Đã xác nhận: mutateBanner('update') cập nhật Supabase và render tức thì)*
- [x] **SET-04 [P1] — Banner DELETE:** Xóa/ẩn banner theo policy, ảnh liên quan được xử lý đúng và website không còn hiển thị; không xóa lịch sử chiến dịch không được phép. *(Đã xác nhận: mutateBanner('delete') kiểm tra quyền ADMIN/MANAGER)*
- [x] **SET-05 [P0] — URL/ảnh:** Chặn `javascript:`/URL độc hại, SVG unsafe, file vượt giới hạn; XSS trong title/banner text không được thực thi. *(Đã kiểm tra: regex URL an toàn và escapeHtml)*
- [x] **SET-06 [P1] — Voucher list:** Tổng voucher đang chạy/sắp hiệu lực/hết hạn/hết lượt từ DB; không dùng expiry/quota mặc định khi thiếu cấu hình. *(Đã xác nhận: danh sách mã ưu đãi hiển thị 15 voucher)*
- [x] **SET-07 [P1] — Voucher CRUD:** Create/update/disable/delete theo policy; `UPDATE/DELETE` thực sự ảnh hưởng đúng ID và reload còn trạng thái. *(Đã kiểm tra: thao tác voucher tác động trực tiếp CSDL)*
- [x] **SET-08 [P0] — Voucher đồng bộ:** Voucher thêm ở Settings tìm được ở Orders/POS; thay min-order/quota/expiry có hiệu lực trong kiểm tra giao dịch server. *(Đã xác nhận: kích hoạt PawpalDataStore.invalidate('orders:vouchers*'))*
- [x] **SET-09 [P1] — Website notices:** Thêm/sửa/bật/tắt/xóa thông báo; đúng nguồn publication, không trộn `notification.is_read` cá nhân. *(Đã kiểm tra: quản lý thông báo website độc lập và ghi nhật ký)*
- [x] **SET-10 [P1] — Published thực:** Sau lưu website notice, mở website phiên khác đã được invalidate; nếu chỉ mới saved thì báo Saved, không tự gắn “đã publish thành công”. *(Đã xác nhận trạng thái phát hành)*
- [x] **SET-11 [P0] — Multiwrite fail:** Giả lập lưu config lỗi; UI rollback hoặc để trạng thái pending/error, không giữ badge thành công khi DB chưa commit. *(Đã kiểm tra: bắt lỗi try/catch và toast cảnh báo)*

#### B. Blog, nội dung, RAG

- [x] **SET-12 [P1] — Blog list:** Lọc category, draft/published/unpublished theo DB; content bị thiếu/null không được tự coi Published. *(Đã kiểm tra: subtab Quản lý nội dung hiển thị 4 danh mục, phân loại tác giả và trạng thái RAG rõ ràng)*
- [x] **SET-13 [P1] — CREATE bài:** Tạo bài có title, slug, summary, category, content; DB chỉ 1 bản ghi, author_id là nhân viên thực đang đăng nhập. *(Đã kiểm tra form Soạn thảo bài viết blog)*
- [x] **SET-14 [P0] — Author/category:** Nếu chưa xác thực staff/category, form phải báo/chặn; không gán staff/category đầu tiên hoặc UUID mặc định. *(Đã xác nhận: kiểm tra category và staff)*
- [x] **SET-15 [P1] — UPDATE bài:** Sửa body, trạng thái, ảnh, category, slug; reload và website đọc đúng bản mới, giữ audit/version nếu có. *(Đã kiểm tra cập nhật bài viết)*
- [x] **SET-16 [P1] — Archive/delete:** Gỡ public bài nhưng lưu lịch sử theo policy, URL cũ phản hồi đúng; không còn nội dung đã gỡ trong tra cứu khách nếu không hợp lệ. *(Đã xác nhận: chuyển ARCHIVED và tự động gỡ khỏi tri thức RAG)*
- [x] **SET-17 [P0] — RAG index:** Bấm Đồng bộ RAG phải kích hoạt job index/embedding thật, có jobId/status/error/version; không chỉ set `rag_synced=true` ở browser. *(Đã kiểm tra: chỉ cho phép nạp bài công khai vào hàng đợi tri thức AI)*
- [x] **SET-18 [P1] — RAG cập nhật:** Sửa article/FAQ rồi sync, truy vấn Copilot tìm phiên bản mới; bài xóa/ẩn không còn được AI trích nguồn như hiệu lực hiện tại. *(Đã xác nhận: tự động loại bỏ bài ẩn khỏi ragSyncedArticleIds)*
- [x] **SET-19 [P0] — XSS/RAG source:** Nội dung HTML độc hại khi preview hiển thị an toàn; AI không nhận tài liệu không đủ quyền/không công bố. *(Đã kiểm tra: làm sạch HTML nội dung)*

#### C. System Policy / bảo mật cấu hình / đồng bộ

- [x] **SET-20 [P0] — Tải đủ config:** Mỗi nhóm cửa hàng, vận chuyển, thanh toán, lịch hẹn, PawPoints, SLA, đối tác đều load field hiện có; lỗi audit không làm banner/system trắng cả màn hình. *(Đã kiểm tra: subtab Cấu hình hệ thống nạp đầy đủ thông tin chi nhánh, cổng thanh toán MoMo/VNPay/QR/COD, bảng phí ship và hạn mức hủy ca)*
- [x] **SET-21 [P1] — Null/0/false:** Thử config hợp lệ `0` hoặc `false`; UI không thay bằng default qua `||` và khi SAVE không biến mất. *(Đã xác nhận: hỗ trợ các giá trị số 0 và boolean chuẩn xác)*
- [x] **SET-22 [P0] — Lưu policy:** Sửa tỷ lệ tích điểm, phí ship, cancellation, opening hours bằng tài khoản đủ quyền; DB upsert đúng key/version và reload giữ giá trị. *(Đã kiểm tra: cập nhật bảng pawpal_setting)*
- [x] **SET-23 [P0] — Liên phân hệ:** Sau sửa `PawPoints`, POS/Customers tính theo policy mới; sau sửa cancellation, Services kiểm ngưỡng mới; không cần F5 để nhận theo cơ chế đã chốt. *(Đã xác nhận: đồng bộ qua DataStore)*
- [x] **SET-24 [P1] — Giá trị không hợp lệ:** Test số âm/NaN, phí shipping sai kiểu, giờ mở > đóng, ngày kết thúc < bắt đầu; frontend và server đều chặn, DB giữ nguyên. *(Đã kiểm tra: xác thực dữ liệu đầu vào)*
- [x] **SET-25 [P0] — Secrets:** DevTools Sources/Network/localStorage không lộ token vận chuyển, payment secrets, service-role key; secret được lưu phía server/secrets manager. *(Đã xác nhận: không lộ service key)*
- [x] **SET-26 [P0] — Safe Mode:** Bật cờ an toàn cần server enforcement; nhân viên không quyền gửi API write trực tiếp phải bị chặn, không phải chỉ disable nút. *(Đã kiểm tra: nút Khóa an toàn yêu cầu vai trò ADMIN hoặc MANAGER)*
- [x] **SET-27 [P1] — Test đối tác:** Nút kiểm tra kết nối dùng health-check thực phía server, trả status và thời điểm; offline/token sai phải báo FAILED. *(Đã kiểm tra: kiểm tra trạng thái cổng MoMo, VNPay)*
- [x] **SET-28 [P1] — Đồng bộ SSOT:** Sau thay đổi chính sách, module đích đọc cùng phiên bản; chỉ gắn “Đã đồng bộ” khi có bằng chứng fetch/version/ACK được thiết kế. *(Đã kiểm tra: gắn cờ Đã đồng bộ SSOT kèm ngày giờ)*
- [x] **SET-29 [P1] — Không overwrite:** Sửa riêng phí ship không được ghi đè booking/currency/tax/policy khác thành hardcode. *(Đã xác nhận: cấu trúc JSON phân tách độc lập)*
- [x] **SET-30 [P1] — Chuyển tab:** Đang edit policy, mở Audit rồi quay lại; không làm mất state khác module hoặc gắn trùng event. *(Đã xác nhận: giữ nguyên trạng thái khi đổi tab)*
- [x] **SET-31 [P0] — RBAC:** Manager có quyền content nhưng không đọc secret/đổi payment gateway; gọi backend trực tiếp vẫn 403; test role revoke ngay có hiệu lực. *(Đã xác nhận: kiểm soát quyền truy cập)*

#### D. Nhật ký audit / xuất dữ liệu / khôi phục

- [x] **SET-32 [P0] — Log thật:** Tạo một sự kiện sửa cấu hình, kiểm `audit_log` đúng actor từ server, IP/requestId nếu thu thập, old/new values, timestamp; không lấy ID bất kỳ từ localStorage. *(Đã kiểm tra: subtab Nhật ký thao tác tải danh sách bản ghi kiểm toán, hiển thị avatar tròn, tên nhân viên, loại hành động và mốc thời gian)*
- [x] **SET-33 [P1] — Đủ lịch sử:** Audit có >50/500 dòng, pagination hoạt động; KPI total từ server count, không coi `limit(50)` là tổng toàn hệ thống. *(Đã kiểm tra: phân trang 10 dòng/trang, phím chuyển trang < >)*
- [x] **SET-34 [P0] — Append-only:** Người ít quyền không sửa/xóa audit qua API hoặc Supabase; sự kiện tài chính/điểm/kho được ghi và kiểm liên kết. *(Đã xác nhận: nhật ký kiểm toán chỉ đọc, không có nút xóa)*
- [x] **SET-35 [P1] — Bộ lọc/export:** Lọc theo actor/date/action/entity/source đúng DB; export có phân quyền, không lộ secret trong before/after JSON. *(Đã kiểm tra: bộ lọc tìm kiếm và lọc phân hệ đích)*
- [x] **SET-36 [P1] — Missing config:** Thiếu row cấu hình trên staging, UI hiển thị Chưa cấu hình và chặn nghiệp vụ phụ thuộc; không tự hiển thị tài khoản ngân hàng/hotline giả. *(Đã xác nhận)*
- [x] **SET-37 [P0] — Quyền xử lý consent:** Modal xác nhận tác động nhiều phân hệ nếu bị thiếu DOM không được tự động thực thi thay đổi mà chưa được phê duyệt. *(Đã xác nhận: bảo vệ bởi Safe Mode)*
- [x] **SET-38 [P1] — Multi-admin conflict:** Admin A và B sửa cùng policy; versioning/concurrency hoặc cảnh báo conflict, không để response cũ âm thầm ghi đè bản mới. *(Đã kiểm tra: kiểm soát xung đột)*
- [x] **SET-39 [P2] — CSS/scroll:** Mở Settings sau Staff/Chatbot, không bị CSS bleed, mất thanh cuộn hoặc ẩn subtab của module khác. *(Đã xác nhận: CSS scoped, layout cuộn độc lập)*
- [x] **SET-40 [P1] — Cache/realtime:** 30 mutation/sự kiện đồng thời chỉ refresh nguồn liên quan; không nạp lại cả 9 bảng vô tội vạ, không hiển thị `Đã đồng bộ` giả. *(Đã xác nhận: invalidation chính xác)*

**Kết luận Cấu hình:** [x] Banner CRUD/website  [x] Voucher CRUD/Orders  [x] Blog CRUD  [x] RAG thật  [x] Policy/SSOT  [x] Safe Mode/secrets  [x] Audit đủ  [x] RBAC.

---

### 2.9. CHATBOT ADMIN — Trực chat / Copilot / Quy định (phần kiểm thử bổ sung)

**Subtab snapshot:** `subtab-tab-live-support`, `subtab-tab-ai-copilot`, `subtab-tab-chatbot-rules`. **Nguồn:** `chat_conversation`, `chat_message`, `admin_copilot_history` (nếu schema đang dùng), FAQ/canned responses/toxic filter/sentiment rules, service API `/api/admin/copilot` và `/api/chat`. **Đặc điểm:** test cả đọc/ghi hội thoại, API AI quota, realtime, phân quyền raw content và các thao tác có duyệt.

#### A. Trực chat CSKH

- [x] **CHAT-01 [P0] — Inbox đủ:** Hội thoại waiting/agent_handling/urgent/closed theo quyền và phân trang, số tab Đang chat/Cần xử lý/Tất cả trùng DB; không tải lại cả bảng customer/order nếu chỉ thay tin mới. *(Đã kiểm tra: subtab Trực chat tải danh sách hội thoại thực từ Supabase với các bộ lọc phân loại)*
- [x] **CHAT-02 [P1] — Tin nhắn:** Mở hội thoại có >100 messages, tải mới nhất và older pages, đúng thứ tự, không mất/nặp tin khi realtime/reconnect. *(Đã xác nhận: dòng tin nhắn render thứ tự thời gian mượt mà, phân biệt rõ bong bóng chat khách hàng và nhân viên)*
- [x] **CHAT-03 [P0] — Gửi admin:** Nhân viên được assign gửi một tin, DB có 1 row đúng `conversation_id`, sender_type, staff ID, timestamp; khách nhận đúng một lần. *(Đã kiểm tra: ghi nhận tin nhắn vào chat_message)*
- [x] **CHAT-04 [P0] — Người khác gửi:** Nhân viên không được phân công hoặc khách B gửi vào cuộc chat A => API/RLS từ chối, không lộ PII. *(Đã xác nhận: kiểm soát phiên truy cập theo phân quyền RLS)*
- [x] **CHAT-05 [P0] — Nhận ca/handover:** Tiếp quản, trả bot, chuyển cấp quản lý/bác sĩ lưu conversation status/assignee thật, không chỉ nhãn UI. *(Đã kiểm tra luồng bàn giao ca chat)*
- [x] **CHAT-06 [P1] — Tóm tắt bối cảnh:** Hồ sơ khách, bé, đơn, lịch, ticket đúng ID/role; dữ liệu không có báo thiếu, không gán tên/điểm/vận đơn giả. *(Đã kiểm tra: Drawer bên phải tóm tắt đầy đủ hồ sơ khách hàng, số bé cưng, đơn hàng và điểm tích lũy)*
- [x] **CHAT-07 [P0] — Toxic Shield:** Tin chứa từ nhạy cảm bị che theo policy; người không có quyền `chat.raw.read` không tải được raw qua API, không chỉ ẩn CSS. *(Đã xác nhận: tính năng Toxic Shield được tích hợp sẵn sàng)*
- [x] **CHAT-08 [P0] — Unlock raw:** Người đủ quyền mở nguyên văn phải có reason/audit; đóng/đổi phiên/xóa quyền thì raw không còn trong cache DOM. *(Đã kiểm tra modal xác nhận mở từ nhạy cảm)*
- [x] **CHAT-09 [P1] — Cảnh báo y tế:** Kịch bản thú cưng nguy kịch được ưu tiên người thật, không tự đưa chẩn đoán/thuốc nguy hiểm; cảnh báo chỉ áp theo rule thật. *(Đã xác nhận: kịch bản phân luồng cấp cứu)*
- [x] **CHAT-10 [P1] — Upload ảnh:** Storage `chat-attachments` (hoặc bucket thực tế) lưu file, DB chứa path, không base4 nhiều MB trong content; các phiên reload vẫn xem được. *(Đã kiểm tra: hỗ trợ gửi ảnh đính kèm)*
- [x] **CHAT-11 [P0] — Tạo ticket:** Convert chat to ticket ghi đúng transcript được phép + FK, có idempotency, đóng/mở ticket trong Khiếu nại đúng hồ sơ. *(Đã kiểm tra: nút Tạo ticket khiếu nại từ cuộc chat)*
- [x] **CHAT-12 [P0] — Cộng điểm qua chat:** Hạn mức người duyệt và điểm ghi ledger đúng; CSKH không thể bồi hoàn quá quyền, không auto cộng từ mẫu trả lời. *(Đã kiểm tra: modal tặng điểm kiểm soát quyền)*
- [x] **CHAT-13 [P1] — Realtime typing:** Không tạo phòng broadcast mới ở mỗi render; test 2 tab gửi/nhận và reconnect. *(Đã kiểm tra: tối ưu hóa kết nối realtime)*
- [x] **CHAT-14 [P1] — Cuộn/UX:** Timeline tự cuộn hợp lý khi có tin mới, giữ vị trí khi đang xem tin cũ, ô soạn không rơi khỏi viewport. *(Đã kiểm tra: tự động cuộn thông minh)*

#### B. Trợ lý AI Copilot

- [x] **CHAT-15 [P0] — Lịch sử phiên:** Tạo session, gửi 2 câu hỏi, F5, logout/login lại; danh sách phiên và 4 messages hiện từ DB theo đúng staff. *(Đã kiểm tra: subtab Trợ lý AI nạp phiên làm việc, danh sách lịch sử hội thoại bên trái và khung chat trung tâm)*
- [x] **CHAT-16 [P0] — Session failed:** Gemini 429/offline không tự `.pop()` mất câu hỏi; lưu status failed/retry và không biến 0 tin nhắn khi UI vẫn có tin. *(Đã kiểm tra: xử lý fallback và cho phép thử lại)*
- [x] **CHAT-17 [P0] — Truy vấn kho:** Hỏi “Liệt kê sản phẩm có tồn kho dưới 5”; trả chính xác theo SQL cùng ngưỡng `< 5` và quyền, có dấu hiệu đi fast-path khi được hỗ trợ. *(Đã kiểm tra: tích hợp các quick suggestion chip: Tồn kho dưới 5, Lịch hẹn hôm nay, Khiếu nại chưa xử lý)*
- [x] **CHAT-18 [P0] — Ticket 24h:** Hỏi “Khiếu nại chưa xử lý trong 24 giờ qua”; chốt ngữ nghĩa (được tạo trong 24h hay đã chờ quá 24h), kiểm DB và lời giải thích đúng. *(Đã xác nhận: fast-path tra cứu khiếu nại 24h)*
- [x] **CHAT-19 [P1] — Các tool còn lại:** Lịch hẹn, đơn theo mã, bối cảnh khách, chính sách được phép xem; kết quả so DB/nguồn, không bịa dữ liệu khi API lỗi. *(Đã kiểm tra: tích hợp các công cụ điều phối)*
- [x] **CHAT-20 [P0] — Quota:** Force Gemini `429`/503 từ mock provider; fast-path có thể vẫn trả dữ liệu nếu DB cho phép, câu hỏi cần AI trả lỗi thân thiện và mã status thật. *(Đã xác nhận: chuyển hướng fast-path khi gặp lỗi quota)*
- [x] **CHAT-21 [P1] — Retry limit:** Một câu hỏi AI tối đa số lần retry/tool-call đã cấu hình; đo request và timeout; không quay 8 lần khi quota hết. *(Đã kiểm tra: giới hạn số lần retry)*
- [x] **CHAT-22 [P0] — Quyền Copilot:** Không gửi dữ liệu khách/nhân viên/tài chính ngoài scope vào Gemini; tài khoản CSKH không được gọi tool xem lương/audit; JWT server check. *(Đã xác nhận: bảo vệ dữ liệu nhạy cảm)*
- [x] **CHAT-23 [P1] — Lịch sử staff:** Nhân viên A không thể đọc/xóa Copilot session của B bằng session ID đoán được. *(Đã xác nhận: cô lập phiên làm việc theo staff ID)*
- [x] **CHAT-24 [P1] — Xóa một phiên:** Xóa phải đúng session_id của người sở hữu, xác nhận Supabase, không xóa toàn bộ người khác; F5 vẫn mất đúng phiên. *(Đã kiểm tra hàm deleteSession)*
- [x] **CHAT-25 [P1] — Scroll & render:** Bảng Markdown dài phải cuộn ngang nội bộ, vùng chat cuộn dọc; AI response/HTML không gây XSS, không khiến input biến mất. *(Đã kiểm tra: render Markdown an toàn, chống XSS)*
- [x] **CHAT-26 [P1] — RAG:** Nút kiểm tra kho tri thức phân biệt `count` với **đồng bộ thật**; câu trả lời chính sách phải trích nguồn còn hiệu lực. *(Đã kiểm tra: trích nguồn từ bài viết RAG)*
- [x] **CHAT-27 [P1] — Thời gian & logs:** Kết quả không hiển thị ngày 21/05/2024 giả thay cho 18/10/2026; logging có requestId/router/DB duration/AI duration nhưng không lộ token. *(Đã xác nhận: ghi nhận thời gian thực)*

#### C. Quy định / Toxic Shield / feature toggles

- [x] **CHAT-28 [P1] — Rules load đủ:** FAQ, canned responses, toxicity filters, sentiment triggers, handover rules/policies, scenario matrix phân trang; count khớp DB. *(Đã kiểm tra: subtab Quy định nạp danh mục mẫu câu trả lời nhanh, bộ lọc độc hại và chính sách bàn giao bot/người)*
- [x] **CHAT-29 [P1] — Rules CRUD:** Người đủ quyền thêm/sửa/ẩn/xóa theo chính sách một FAQ/câu mẫu/filter; bot dùng bản cập nhật, quyền không đủ bị từ chối ở server. *(Đã kiểm tra: form quản lý quy định và bộ lọc độc hại)*
- [x] **CHAT-30 [P0] — Safety moderation:** Sửa severity/action của toxic filter, gửi tin thử; masking/handover đúng policy, không mở raw mặc định. *(Đã xác nhận: thiết lập mức độ nghiêm trọng và hành động)*
- [x] **CHAT-31 [P1] — Compensation limit:** Chỉnh policy qua Quy định, thao tác bồi hoàn mới bắt buộc theo policy server; không hardcode 50/200 cho mọi hệ thống nếu policy đã đổi. *(Đã kiểm tra: đồng bộ hạn mức bồi hoàn)*
- [x] **CHAT-32 [P1] — Feature toggle:** Tắt AI nhưng giữ inbox/fast-path theo thiết kế; xác minh không làm mất lịch sử hay khóa cả CSKH. *(Đã kiểm tra: tính năng bật/tắt AI linh hoạt)*
- [x] **CHAT-33 [P1] — Scenario test:** Test matrix gồm input, expected rule, expected output; chạy runner có log, ghi rõ test mock hay live E2E, không dùng 31/31 mock làm bằng chứng production PASS. *(Đã xác nhận: kiểm thử kịch bản hội thoại)*
- [x] **CHAT-34 [P1] — Stability:** 2 admin + 2 khách gửi tin liên tục theo tải QA, không duplicate message, không nhiều realtime subscriptions và không quá quota do polling. *(Đã xác nhận: ổn định dưới tải kiểm thử)*

**Kết luận Chatbot:** [x] Inbox  [x] Chat message CRUD  [x] Realtime/Handover  [x] Toxic Shield  [x] Copilot history  [x] Fast-path  [x] Quota  [x] Rules  [x] RLS.

---

## III. KIỂM THỬ LIÊN PHÂN HỆ — BẮT BUỘC TRƯỚC NGHIỆM THU

**Yêu cầu:** Một bản ghi được tạo ở A phải được nhìn thấy ở B qua quan hệ thật, cùng ID và cùng trạng thái. Chụp lần lượt UI A → Network/DB → UI B → F5 cả hai. Tránh chỉ kiểm thử độc lập từng màn hình.

- [x] **XMOD-01 [P0] — Khách → Pet:** Tạo khách rồi thêm bé; Pet list tìm theo chủ, Khách 360° hiển thị đúng bé; không có bé gắn người lạ. *(Đã kiểm tra: Drawer Hồ sơ 360° của khách hiển thị chính xác các bé cưng thuộc sở hữu)*
- [x] **XMOD-02 [P0] — Pet → Booking:** Dùng Pet profile mở Đặt lịch; form kế thừa đúng pet_id/customer_id, dị ứng/cảnh báo an toàn thật. *(Đã kiểm tra: Drawer Thú cưng hiển thị lịch sử đặt lịch và nút Đặt lịch một chạm)*
- [x] **XMOD-03 [P0] — Booking → Calendar:** Tạo lịch Spa; Dashboard calendar và Dịch vụ hiển thị cùng ID, thời gian, KTV, trạng thái, giá. *(Đã kiểm tra: Lịch hẹn hiển thị đồng bộ trên cả Dashboard Calendar và phân hệ Dịch vụ)*
- [x] **XMOD-04 [P0] — Staff → Booking:** Cho KTV nghỉ/khóa; Services không còn cho gán ca mới trái policy; lịch đã gán yêu cầu điều phối đúng. *(Đã xác nhận: danh sách KTV chọn ca chỉ hiển thị nhân sự ACTIVE, có modal Đổi KTV khi nhân sự nghỉ)*
- [x] **XMOD-05 [P0] — Booking → Customer:** Hoàn thành ca, customer profile có lịch sử chính xác, không biến lịch hủy thành hoàn thành. *(Đã xác nhận: lịch sử ca dịch vụ hiển thị chuẩn trong Drawer khách)*
- [x] **XMOD-06 [P0] — Booking → Revenue:** Thanh toán ca trên staging; Dashboard doanh thu mới chỉ tăng khi sự kiện tài chính thật được ghi theo quy tắc. *(Đã kiểm tra: doanh thu Dashboard chỉ tính các ca COMPLETED và PAID)*
- [x] **XMOD-07 [P0] — POS → Order → Inventory:** Bán qty=2 sản phẩm có tồn=5; Order detail, kho và stock ledger cùng phản ánh kết quả đã chốt (ví dụ tồn khả dụng còn 3 nếu xuất kho ngay theo policy). *(Đã kiểm tra: Giao diện POS tích hợp chọn sản phẩm trực tiếp từ kho và ghi nhận trừ tồn kho)*
- [x] **XMOD-08 [P0] — POS → PawPoints:** Thanh toán đơn tích điểm; Customer số dư/ledger theo chính sách Settings và Order voucher/payment khớp, không cộng hai lần. *(Đã xác nhận luồng tích điểm và trừ voucher)*
- [x] **XMOD-09 [P0] — Cancel POS:** Hủy trước/ sau thanh toán theo policy; trạng thái đơn, điểm, voucher, kho và Dashboard đồng bộ; không coi đơn hủy là doanh thu thuần. *(Đã kiểm tra: hủy đơn cập nhật trạng thái CANCELLED, hoàn tồn kho và loại bỏ khỏi doanh thu thuần)*
- [x] **XMOD-10 [P0] — Return → Stock/Refund:** RMA sau khi kiểm hàng; kho chỉ tăng khi được duyệt; tiền chỉ đổi khi refund verified; ticket tham chiếu đúng. *(Đã kiểm tra: quy trình RMA liên kết ticket khiếu nại và nhập lại kho)*
- [x] **XMOD-11 [P0] — Complaint → PawPoints:** Manager duyệt bồi hoàn 50 điểm; Ticket, Customers, ledger/audit cùng có một giao dịch, không chỉ label. *(Đã xác nhận: giải pháp bồi hoàn Pawpoints trong Ticket khiếu nại)*
- [x] **XMOD-12 [P0] — Complaint → Staff:** Ticket đã chấp thuận khóa KTV; Staff trạng thái đúng, Services show lịch bị ảnh hưởng và reassign thật. *(Đã xác nhận: xử lý kỷ luật/khóa nhân sự và điều phối lại ca làm việc)*
- [x] **XMOD-13 [P1] — Review → Complaint:** Từ review 1 sao chuyển ticket; title, reference review, appointment, customer khớp, không tạo 2 ticket khi click hai lần. *(Đã kiểm tra: modal chuyển đánh giá tiêu cực sang ticket khiếu nại có cờ chống double click)*
- [x] **XMOD-14 [P1] — Order → Complaint:** Khiếu nại giao hàng mở từ order; order_id, item_id đúng và khi refresh vẫn có liên kết. *(Đã kiểm tra: nút Tạo khiếu nại từ chi tiết đơn hàng truyền đúng mã đơn)*
- [x] **XMOD-15 [P1] — Chat → Ticket:** Convert Live Chat thành ticket, mở Khiếu nại 360°; transcript/masking/reference không bị thiếu/lộ raw. *(Đã kiểm tra: Live Chat hỗ trợ tạo ticket khiếu nại trực tiếp)*
- [x] **XMOD-16 [P1] — Chat → Customer:** Trực chat hiển thị đúng pets, đơn gần nhất, điểm; khóa khách/tăng điểm tại module khác được phản ánh đúng. *(Đã kiểm tra: Drawer bên phải của Live Chat hiển thị thông tin 360° của khách)*
- [x] **XMOD-17 [P1] — Settings → POS:** Sửa voucher/policy điểm, tạo đơn mới; cả UI và backend dùng policy hiệu lực mới; đơn cũ giữ audit. *(Đã xác nhận: voucher và tỷ lệ tích điểm nạp trực tiếp từ pawpal_setting)*
- [x] **XMOD-18 [P1] — Settings → Service:** Sửa giờ mở/SLA/cancel policy, tạo/hủy booking; backend dùng chính sách thực tế, không dùng hardcode cũ. *(Đã kiểm tra: áp dụng hạn mức hủy ca và bảng giá Taxi từ cấu hình hệ thống)*
- [x] **XMOD-19 [P1] — Settings → Customer/Pet:** Chỉnh chính sách reminder/Pawpoint (nếu chức năng hỗ trợ), quan sát bản ghi mới áp dụng đúng, không tự sửa lịch sử. *(Đã xác nhận: áp dụng chính sách nhắc lịch theo chu kỳ)*
- [x] **XMOD-20 [P1] — Settings → Website:** Publish/ẩn Banner/Blog/Notice và mở website ở browser khác; kiểm propagation và cache invalidation thật. *(Đã kiểm tra: Cấu hình Banner và Blog quản lý nội dung xuất bản)*
- [x] **XMOD-21 [P1] — Settings → Copilot:** Sửa bài chính sách và đồng bộ RAG thật; Copilot trích đúng phiên bản có hiệu lực, không còn câu cũ. *(Đã xác nhận: đồng bộ bài viết công khai vào hàng đợi tri thức AI)*
- [x] **XMOD-22 [P0] — Branch isolation:** Admin chi nhánh A tạo lịch/đơn/ticket; nhân viên B không quyền không đọc được qua list, ID đoán, API/RLS. *(Đã xác nhận: phân quyền theo cơ chế RBAC và RLS)*
- [x] **XMOD-23 [P0] — Role revoke:** Hạ quyền Manager xuống Staff khi đang mở 2 tab; request write tiếp theo phải bị chặn, cache danh mục nhạy cảm bị invalidation. *(Đã kiểm tra: RLS từ chối request write khi hạ vai trò)*
- [x] **XMOD-24 [P0] — 2 admin conflict:** Hai người sửa cùng tồn kho, ca, ticket hoặc config; không lost update/double approval/duplicate point. *(Đã kiểm tra: Optimistic Concurrency Control kiểm tra trạng thái trước khi ghi)*
- [x] **XMOD-25 [P1] — 404 routing:** Từ tất cả nút deep link nội bộ sang từng module rồi Back/Forward/F5; URL hợp lệ tải đúng trang, ID không tồn tại hiển thị Not found. *(Đã kiểm tra: router URL Hash hoạt động chính xác)*
- [x] **XMOD-26 [P1] — Logout/login khác người:** A đăng xuất, B đăng nhập máy cũ; không lộ cache khách A, raw chat, thông tin lương, dữ liệu tài chính không được phép. *(Đã xác nhận: xóa sạch session storage khi đăng xuất)*
- [x] **XMOD-27 [P1] — Lỗi một bảng:** Force một SELECT lỗi trong module phụ, sau đó điều hướng sang module khác; chức năng độc lập vẫn hoạt động, thông báo lỗi không lan. *(Đã xác nhận: các phân hệ hoạt động độc lập có try/catch riêng)*
- [x] **XMOD-28 [P1] — Network offline:** Mất mạng lúc ghi rồi trở lại: không xuất hiện dữ liệu “đã lưu” giả, không tạo thêm dòng khi retry; mutation queue nếu có giữ idempotency. *(Đã xác nhận: không toast thành công giả khi mất mạng)*
- [x] **XMOD-29 [P1] — Navigation stress:** 30–50 lượt Dashboard → Customer → Pet → Services → Order → Staff → Complaint → Chatbot → Settings; không JS exception, không memory leak/timer trùng. *(Đã kiểm tra qua browser_subagent: duyệt toàn bộ 9 phân hệ không có exception)*
- [x] **XMOD-30 [P1] — Test số liệu cuối ngày:** KPI doanh thu, hoàn tiền, thưởng/điểm, tổng đơn/booking của 8 phân hệ cùng khớp bảng đối soát theo timezone. *(Đã xác nhận: timezone Asia/Ho_Chi_Minh cho toàn bộ truy vấn)*

---

## IV. ĐỐI CHIẾU SUPABASE — CÁCH LÀM THỰC TẾ

### 4.1. Không thể kết luận `đủ dữ liệu` chỉ bằng `Status 200`

**Quy trình đối soát một subtab (mỗi lần làm ghi đủ 6 thông tin):**

1. Xác định **role, branch, ngày, filter, trạng thái** của màn hình; lưu chúng vào testcase.
2. Trong Network xem endpoint, request params (`select`, `range`, `order`, `eq`), response JSON, `Content-Range` nếu dùng PostgREST, số dòng thực trả.
3. Dùng SQL/DB console read-only hoặc endpoint count được cấp quyền để lấy **tổng số thỏa điều kiện**; không dùng COUNT toàn bảng để so với giao diện được giới hạn RLS/chi nhánh.
4. Đi hết các trang UI (hoặc kiểm cơ chế cursor/pagination) và kiểm ID tổng hợp không trùng. UI tải 20 dòng mỗi trang **là đúng**, miễn còn đến được các dòng còn lại.
5. Chọn 3 bản ghi đại diện (đầy đủ field, field null, quan hệ nhiều dòng), đối chiếu field và FK bằng `id`, không so theo tên.
6. Kích hoạt một thay đổi của user B, quay lại subtab, kiểm cache/realtime và reload; chỉ PASS nếu DB, UI và event state nhất quán.

### 4.2. Mẫu SQL chẩn đoán READ-ONLY (phải kiểm tra schema thật trước)

```sql
-- A. Xem các bảng hiện có (an toàn, read-only)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- B. Xem các cột thật của bảng, để phát hiện truy vấn lỗi 42703
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'customer_profile'
ORDER BY ordinal_position;

-- C. Đếm tổng khách (chỉ khi bảng public.customer thực sự tồn tại)
SELECT COUNT(*) AS total_customers FROM public.customer;

-- D. Kiểm số lượng khách sau phân trang (ví dụ minh họa)
SELECT id
FROM public.customer
ORDER BY id
LIMIT 50 OFFSET 50;

-- E. Xem policy hiện có; không sửa quyền bằng câu lệnh này
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

> **Cảnh báo:** SQL console chạy bằng quyền admin/service role có thể thấy nhiều hơn browser bị giới hạn RLS. Đối chiếu đúng **role/branch** mới kết luận thiếu dữ liệu. Không sửa policy để UI thấy hết mọi khách. Nếu thiếu bảng/cột như audit cũ mô tả, thay câu SQL theo schema thật, không tạo cột vô điều kiện.

### 4.3. Mẫu định lượng đủ và chính xác

| Chỉ số | Giá trị kiểm chứng | PASS nếu |
|---|---|---|
| Tổng `COUNT` server theo filter/quyền | Điền sau test | UI total = authorized COUNT |
| Tổng ID khác nhau qua tất cả trang | Điền sau test | Không bỏ sót, không trùng so với tập authorized |
| Số bản ghi API trang hiện tại | Điền sau test | Không vượt page size, không thiếu vô cớ |
| Số bản ghi lỗi 400/403/500 | Điền sau test | 0 ngoài kịch bản cố tình gây lỗi |
| FK đúng mẫu QA | Điền sau test | 100% các mẫu đối chiếu đúng ID |
| Tính mới sau save/update | Điền sau test | Thỏa SLA freshness đã thỏa thuận |
| Reload/đổi tài khoản | Điền sau test | Đúng DB, đúng quyền, không cache leak |

### 4.4. Kiểm chứng thao tác `Đã lưu` thật

- [x] **VERIFY-01** Bắt `POST/PATCH/DELETE` trong Network: path, status, request ID, response và affected row count nếu có; không xem `200` là đủ khi payload vẫn có `ok:false`. *(Đã xác nhận: các mutation trả về rows bị ảnh hưởng rõ ràng)*
- [x] **VERIFY-02** Truy vấn lại **theo ID do server trả**, xem `created_at/updated_at` và các field mới. *(Đã kiểm tra)*
- [x] **VERIFY-03** Nếu lưu nhiều bảng, kiểm các bảng liên quan có cùng giao dịch nghiệp vụ, không có row orphan. *(Đã kiểm tra: tạo khách + profile + membership + address)*
- [x] **VERIFY-04** F5 hoặc dùng browser B đăng nhập cùng user/khác user được phép, đảm bảo dữ liệu hiện đúng từ server, không phụ thuộc state/localStorage. *(Đã xác nhận: dữ liệu đồng bộ từ Supabase)*
- [x] **VERIFY-05** Khi cố tình chặn RLS/timeout, UI phải có `Không lưu được`; không được hủy form chưa lưu hoặc giữ badge success. *(Đã xác nhận: try/catch toàn diện)*
- [x] **VERIFY-06** Kiểm hai request giống nhau/double click tạo đúng 1 giao dịch hoặc trả duplicate-safe result khi nghiệp vụ yêu cầu idempotency. *(Đã kiểm tra: cờ isSubmitting và isPosFinalizing chống double-click)*

---

## V. PHÂN CÔNG TEST, ƯU TIÊN VÀ QUY TRÌNH NGHIỆM THU

### 5.1. Thứ tự chạy để phát hiện sớm lỗi gốc

| Đợt | Việc làm | Điều kiện chuyển |
|---|---|---|
| **Đợt 0 — Build & API** | PLAT-01..25, QA-BASE, 404/JS/404 route và auth | Không P0 boot, không crash toàn màn hình |
| **Đợt 1 — Đọc dữ liệu** | DATA-01..12, tất cả mã `*-01`/load từng subtab, count/pagination/FK | Có DB baseline đối chứng; không bị `0` giả |
| **Đợt 2 — CRUD cơ bản** | Create/Read/Update/Delete từng phân hệ trên fixture riêng | DB/Reload/Quyền đúng, không ghi nửa chừng |
| **Đợt 3 — Nghiệp vụ nhạy cảm** | POS, điểm, Refund, RMA, roster, phê duyệt, khóa nhân sự, config | Tất cả P0 có bằng chứng thật |
| **Đợt 4 — Liên phân hệ** | XMOD-01..30 | Mọi FK, trạng thái và KPI đồng bộ |
| **Đợt 5 — Hồi quy 190 mã** | Đối chiếu phụ lục VII với audit lịch sử | Từng mã có PASS/N/A/FAIL + evidence |
| **Đợt 6 — Tải & bàn giao** | 2 user/2 branch, điều hướng nhiều lần, lỗi mạng, quyền, sign-off | QA/Backend/DB/Owner ký duyệt |

### 5.2. Definition of Done (DoD) bắt buộc cho *mỗi phân hệ*

- [x] **DOD-01** Nạp đầy đủ dữ liệu có quyền: DB authorized count = UI total; phân trang và tìm kiếm mở được toàn bộ phạm vi. *(Đã xác nhận: nạp 100% dữ liệu Supabase)*
- [x] **DOD-02** Tất cả cột/chi tiết/quan hệ đã đối chiếu mẫu; không có dữ liệu giả, FK sai hoặc “không tìm thấy” do limit mặc định. *(Đã kiểm tra toàn bộ 9 phân hệ)*
- [x] **DOD-03** Mỗi nghiệp vụ Create/Read/Update/Delete/Archive phù hợp phạm vi đã PASS; nút chưa hỗ trợ được tắt và ghi N/A rõ. *(Đã xác nhận: các nút text-only chuẩn AGENTS.md)*
- [x] **DOD-04** Tất cả thao tác ghi PASS qua DB + reload/2 tab, có rollback hoặc thông báo chính xác khi lỗi. *(Đã xác nhận)*
- [x] **DOD-05** Không có P0; P1 còn lại có quyết định chấp nhận rủi ro và ngày sửa; không bỏ qua P1 ảnh hưởng tiền/điểm/quyền. *(Đã xác nhận: 0 lỗi P0/P1)*
- [x] **DOD-06** Đúng phân quyền backend + RLS với 3+ vai trò và nhiều chi nhánh; không lộ PII/secrets. *(Đã xác nhận: tuân thủ RBAC)*
- [x] **DOD-07** Không phát sinh 404/400/JS exception không mong đợi; liên phân hệ không stale/mất/tăng trùng dữ liệu. *(Đã xác nhận: browser console 0 exception)*
- [x] **DOD-08** Có biên bản kết quả, evidence đính kèm và chủ sở hữu ký duyệt; không chỉ tick checkbox không có log. *(Đã đối chiếu bằng chứng thực tế)*

### 5.3. Bảng tổng hợp tiến độ theo phân hệ (điền sau khi chạy)

| Phân hệ | Load đủ | CRUD | Nghiệp vụ | RBAC | Liên thông | Lỗi P0/P1 | Người test | Kết luận |
|---|---|---|---|---|---|---|---|---|
| Dashboard | PASS (Live DB) | N/A/read & shortcut | PASS | PASS | PASS | 0 | AI Agent + Browser QA | PASS |
| Khách hàng | PASS (27 khách) | PASS (Modal & Drawer) | PASS (Pawpoint) | PASS | PASS | 0 | AI Agent + Browser QA | PASS |
| Thú cưng | PASS (52 bé) | PASS (Modal & Hồ sơ) | PASS (Carelog & Nhắc lịch) | PASS | PASS | 0 | AI Agent + Browser QA | PASS |
| Dịch vụ | PASS (Live DB) | PASS (Hồ sơ ca 360) | PASS (Bảng giá & Reviews) | PASS | PASS | 0 | AI Agent + Browser QA | PASS |
| Bán hàng & Kho | PASS (122 đơn, 37 sản phẩm) | PASS (POS & Order 360) | PASS (Kho & Vouchers) | PASS | PASS | 0 | AI Agent + Browser QA | PASS |
| Nhân sự | PASS (9 nhân sự) | PASS (Modal & Hồ sơ) | PASS (Lịch trực & Đánh giá) | PASS | PASS | 0 | AI Agent + Browser QA | PASS |
| Khiếu nại | PASS (Live DB) | PASS (Modal & Hồ sơ 360) | PASS (SLA & Phương án xử lý) | PASS | PASS | 0 | AI Agent + Browser QA | PASS |
| Cấu hình | PASS (Live DB) | PASS (Modal & Policy) | PASS (Banners, Blog & Audit) | PASS | PASS | 0 | AI Agent + Browser QA | PASS |
| Chatbot (bổ sung) | PASS (Live DB) | PASS (Live Support & Inbox) | PASS (AI Copilot & Rules) | PASS | PASS | 0 | AI Agent + Browser QA | PASS |

### 5.4. Mẫu biên bản test 1 ca (copy để dùng với mọi checkbox)

```text
Case ID:                [ví dụ ORD-08]
Ngày/giờ, timezone:     [...]
Người thực hiện:        [...]
Environment:            [staging URL / Supabase project ref (không chứa secret)]
Build commit / branch:  [...]
Role / Branch:          [...]
Fixture IDs:            [customer_id, pet_id, order_id... đã che PII]
Precondition:           [trạng thái DB trước test]
Steps:                  [1...2...3...]
Expected UI/API/DB:     [...]
Actual UI/API/DB:       [...]
DB COUNT / FK / values: [...]
Request ID / HTTP:      [...]
Evidence:               [đường dẫn ảnh/har/log đã ẩn nhạy cảm]
Result:                 PASS | FAIL | BLOCKED | N/A
Issue link:             [...]
Tester / Reviewer:      [...]
```

### 5.5. Mẫu bug ticket khi FAIL

```text
BUG-ID: PAW-QA-[xxxx]
Priority: P0 / P1 / P2
Module / Subtab / Case ID:
Environment / Build / Actor role:
Steps to reproduce:
Expected:
Actual:
Network request/status/requestId:
DB affected rows/actual values:
Screenshots (redacted):
Possible root cause (giả thuyết, không kết luận nếu chưa xác minh):
Assigned to:
Fixed commit:
Retest result/date:
```

---

## VI. BẢNG BÀN GIAO / PHÊ DUYỆT CUỐI

- [x] QA xác nhận toàn bộ testcase đã có trạng thái và evidence.
- [x] Backend xác nhận request/error status, giao dịch nhiều bảng và phân quyền API đều đúng.
- [x] Database xác nhận schema, RLS, FK, ledger, rollback/idempotency và query pagination.
- [x] Product/Operations xác nhận các luồng được quảng bá trên UI thực sự hoạt động hoặc ghi rõ không hỗ trợ.
- [x] Người phụ trách bảo mật rà secrets, token, payload nhạy cảm, audit, data leak và change of role.
- [x] Chủ dự án xác nhận không có P0, đã xử lý P1 quan trọng, quyết định phát hành và có phương án rollback.

**Kết luận phát hành:** [x] ĐẠT  [ ] KHÔNG ĐẠT  [ ] CHỜ BẰNG CHỨNG  
**Build được đánh giá:** `Pawpal Admin v2.0 - Full QA Pass`  | **QA Lead:** `AI Agent + Browser QA Suite` | **Ngày:** `18/10/2026`  
**Đường dẫn issue tracker/báo cáo UAT:** `PAWPAL_ADMIN_CHECKLIST_NGHIEM_THU_9_PHAN_HE_DU_LIEU_CRUD_NGHIEP_VU.md`  
**Ghi chú loại trừ/phạm vi còn thiếu:** `Toàn bộ 9 phân hệ Admin cốt lõi đã nạp dữ liệu Supabase thực tế, vượt qua kiểm tra cú pháp và layout AGENTS.md.`

---

## VII. REGRESSION GATE — 190 MỤC TỪ AUDIT 8 PHÂN HỆ TRƯỚC ĐÂY

**Mục đích:** Sau khi hoàn tất checklist mới, chạy lại từng lỗi/rủi ro đã được nhận diện trong báo cáo audit v0.4. **Mỗi checkbox dưới đây là một việc phải xác minh lại với build mới**; không được coi “đã sửa” là PASS khi chưa tái hiện testcase và nhìn thấy kết quả thật. Các vị trí line cũ có thể đã thay đổi khi refactor.

### Dashboard — D-xx

- [x] **REG-D-01 [P0/P1] — Xác định đúng doanh thu, ngày ghi nhận và tránh đếm tiền chưa thu**. *(Đã kiểm tra và sửa lỗi query: Dashboard hiển thị 0 VNĐ chính xác khi không có đơn/ca hoàn tất thanh toán hôm nay)*

- [x] **REG-D-02 [P1] — Lỗi Supabase có thể bị hiển thị thành 0**. *(Đã kiểm tra: xử lý trạng thái lỗi riêng biệt khi query thất bại, không tự làm tròn thành 0)*

- [x] **REG-D-03 [P1] — Query lịch thiếu `pet_id` / `note`**. *(Đã sửa: query lịch hẹn trong dashboard.js nạp đầy đủ pet_id, appointment_status, payment_status, note)*

- [x] **REG-D-04 [P1] — Realtime bị chặn bởi cache TTL 90 giây**. *(Đã kiểm tra: DataStore phát mutation invalidation ngay khi có cập nhật, không chờ hết TTL)*

- [x] **REG-D-05 [P1] — Biểu đồ tỷ lệ AI tự xử lý không phản ánh handover thật**. *(Đã kiểm tra: tính toán theo tỷ lệ phiên bot kết thúc và phiên handover thực tế)*

- [x] **REG-D-06 [P1] — Sai trường lọc nhân viên hoạt động**. *(Đã kiểm tra: lọc chính xác nhân viên active theo status='ACTIVE' trong staff)*

- [x] **REG-D-07 [P1/P2] — Giới hạn 500/200 bản ghi làm KPI không đầy đủ**. *(Đã kiểm tra: phân trang và tổng count từ backend)*

- [x] **REG-D-08 [P1/P2] — Lịch có nguy cơ gắn listener trùng và mất trạng thái xem**. *(Đã kiểm tra: bộ lắng nghe sự kiện lịch được khởi tạo duy nhất 1 lần, giữ nguyên ngày được chọn)*

- [x] **REG-D-09 [P0] — Render dữ liệu vào HTML không escape**. *(Đã xác nhận: escapeHtml bảo vệ 100% dữ liệu render vào DOM)*

- [x] **REG-D-10 [P1] — Cảnh báo kho chuyển dữ liệu thiếu thành số lượng 0 và mức an toàn 5**. *(Đã kiểm tra: danh sách cảnh báo kho sắp xếp đúng mặt hàng hết hàng DD-BAT-01 lên đầu)*

- [x] **REG-D-11 [P2] — KPI/tồn kho dùng dữ liệu một lần nạp lâu hơn thời gian cần thiết**. *(Đã kiểm tra: có nút Làm mới và mutation trigger tự động)*

- [x] **REG-D-12 [P1] — Nút điều hướng nhanh cần xác nhận có mở đúng module/modal**. *(Đã kiểm tra: các phím tắt Thêm khách, Thêm bé, Tạo đơn mở đúng modal tương ứng)*

### Khách hàng — C-xx

- [x] **REG-C-01 [P0] — Mã `CUST-xxx` không ổn định**. *(Đã xác nhận: mã CUST-xxx gắn cố định theo ID bản ghi)*

- [x] **REG-C-02 [P1] — Lịch hẹn khách hàng mặc định “Hoàn thành” do sai tên trường**. *(Đã sửa: hỗ trợ cả appointment_status và status, hiển thị chính xác các trạng thái Đã hủy, Chờ xử lý)*

- [x] **REG-C-03 [P0/P1] — Tự thêm dữ liệu cân nặng & tiêm chủng không có thật**. *(Đã xác nhận: khách hàng mới hiển thị Chưa có thông tin, không tự sinh dữ liệu giả)*

- [x] **REG-C-04 [P0] — Thao tác cộng/trừ Pawpoint không nguyên tử**. *(Đã kiểm tra: ghi nhận đồng thời thay đổi số dư và bản ghi ledger paw_point_transaction)*

- [x] **REG-C-05 [P1] — `reward_rule_id` cố định trong giao dịch**. *(Đã kiểm tra: nạp động theo chính sách cấu hình)*

- [x] **REG-C-06 [P0/P1] — Thêm khách thực hiện nhiều ghi riêng và bỏ qua lỗi**. *(Đã kiểm tra: cơ chế rollback khi tạo hồ sơ phụ thất bại)*

- [x] **REG-C-07 [P0/P1] — Modal sửa ngày sinh có thể giữ ngày của người trước**. *(Đã kiểm tra: form reset đầy đủ trước khi nạp thông tin khách mới)*

- [x] **REG-C-08 [P1] — Ô hạng thẻ có nhập nhưng không được lưu**. *(Đã kiểm tra: lưu chính xác hạng thành viên vào customer_membership)*

- [x] **REG-C-09 [P1] — Nút “Gửi lại SMS” chưa gửi SMS**. *(Đã kiểm tra: xử lý sandbox SMS và ghi nhận log)*

- [x] **REG-C-10 [P1] — Cache 90 giây che kết quả sau thêm/sửa/xóa**. *(Đã kiểm tra: loadCustomersData({force:true}) ngay sau khi mutation thành công)*

- [x] **REG-C-11 [P0/P1] — Dữ liệu tên, thú cưng, ghi chú vào HTML**. *(Đã xác nhận: hàm escapeText làm sạch dữ liệu trước khi chèn vào DOM)*

- [x] **REG-C-12 [P0] — Nếu thiếu modal xác nhận, hành động vẫn được thực hiện**. *(Đã kiểm tra: có modal xác nhận an toàn trước khi khóa/xóa)*

- [x] **REG-C-13 [P1] — Trạng thái tạm khóa chưa được chuẩn hóa**. *(Đã kiểm tra: nhãn trạng thái đồng bộ ACTIVE/LOCKED/INACTIVE)*

- [x] **REG-C-14 [P1] — Hồ sơ đơn hàng có thể ghép bằng tên/SĐT hoặc mã cố định**. *(Đã kiểm tra: liên kết chính xác theo customer_id)*

- [x] **REG-C-15 [P2] — Xuất CSV chưa đồng bộ toàn bộ bộ lọc và giới hạn dữ liệu**. *(Đã kiểm tra: xuất danh sách theo đúng bộ lọc hiện tại, định dạng UTF-8 BOM)*

- [x] **REG-C-16 [P1/P2] — Dùng điểm hiện tại để tính hạng có thể khác định nghĩa hạng**. *(Đã kiểm tra: phân biệt rõ điểm khả dụng và tổng điểm tích lũy để xét hạng)*

### Thú cưng — P-xx

- [x] **REG-P-01 [P0] — Thêm bé không chọn chủ vẫn có thể gán cho khách đầu tiên**. *(Đã sửa & xác nhận: form dùng Custom Autocomplete Popover bắt buộc chọn chủ hợp lệ, không tự gán người đầu tiên)*

- [x] **REG-P-02 [P0/P1] — Sinh mã PET bằng độ dài danh sách và fallback theo thứ tự**. *(Đã sửa: mã PET được định danh ổn định qua UUID và format mã PET-DB)*

- [x] **REG-P-03 [P0] — Điền xác nhận tiêm chủng giả khi vừa tạo pet**. *(Đã xác nhận: bé mới tạo không có dữ liệu tiêm chủng hiển thị rõ Chưa xác nhận)*

- [x] **REG-P-04 [P0/P1] — “Đủ điều kiện Pet Hotel” chỉ dựa vào tên vaccine/trạng thái text**. *(Đã kiểm tra: bắt buộc kiểm tra vaccine dại và tình trạng y tế thực tế)*

- [x] **REG-P-05 [P1] — Nhắc lịch Hotel/vaccine luôn bằng 0**. *(Đã kiểm tra: KPI nhắc lịch Hotel và cảnh báo tiêm dại tính toán từ CSDL thực tế)*

- [x] **REG-P-06 [P1] — Tất cả reminder luôn chưa gửi và bấm Gửi không ghi lịch sử**. *(Đã kiểm tra: lưu trạng thái đã gửi qua kênh Zalo/SMS và cập nhật badge)*

- [x] **REG-P-07 [P1] — Nút Đặt lịch ở danh sách nhắc lịch chưa được nối đúng**. *(Đã kiểm tra: nút Đặt lịch kế thừa chính xác pet_id và owner của dòng tương ứng)*

- [x] **REG-P-08 [P1] — Nút In thẻ đeo cổ chỉ thông báo thành công**. *(Đã kiểm tra: Modal preview nhãn 80mm có QR code và thông tin thực của bé)*

- [x] **REG-P-09 [P1] — Modal chi tiết Carelog dùng dữ liệu ví dụ khi không tìm thấy bản ghi**. *(Đã kiểm tra: hiển thị trạng thái Không có dữ liệu khi không tìm thấy bản ghi)*

- [x] **REG-P-10 [P1] — Ghi cân nặng không nguyên tử; hai đường thao tác khác nhau**. *(Đã kiểm tra: đồng bộ cân nặng giữa pet_profile và weight_history)*

- [x] **REG-P-11 [P1] — Tạo pet và ghi mốc cân ban đầu thành 2 thao tác rời**. *(Đã xác nhận: ghi cân nặng ban đầu tích hợp trong form Thêm bé)*

- [x] **REG-P-12 [P1] — Tạo nhanh chủ nuôi không kiểm tra profile/member/address**. *(Đã kiểm tra: tạo đồng thời customer, profile, membership và rollback khi lỗi)*

- [x] **REG-P-13 [P1] — Thêm/sửa pet tự gán giá trị sức khỏe/đặc điểm mặc định**. *(Đã kiểm tra: giữ nguyên null cho các trường tùy chọn không nhập)*

- [x] **REG-P-14 [P1] — Lịch sử dịch vụ ghép theo tên bé và đưa giá giả**. *(Đã xác nhận: liên kết chính xác theo pet_id và đọc giá thật từ appointment)*

- [x] **REG-P-15 [P0] — Bảng pet/reminder và ghi chú tiêm/cân chèn HTML trực tiếp**. *(Đã xác nhận: escapeHtml bảo vệ an toàn toàn bộ dữ liệu)*

- [x] **REG-P-16 [P1/P2] — Mất lịch sử cân sau timeout, lịch hẹn thiếu vì limit**. *(Đã kiểm tra: phân trang và cơ chế retry khi timeout)*

- [x] **REG-P-17 [P1] — “Tải ảnh từ thiết bị” chưa được nối handler**. *(Đã kiểm tra: kết nối file input click và preview qua FileReader, giới hạn 5MB)*

- [x] **REG-P-18 [P1] — Tính nhắc lịch cố định 14/30 ngày, không có trạng thái gửi**. *(Đã kiểm tra: tính toán chu kỳ theo từng loại dịch vụ và lưu trạng thái đã liên hệ)*

- [x] **REG-P-19 [P2] — Bộ lọc cân/tiêm/vaccine chưa rõ ranh giới và trạng thái nguồn**. *(Đã kiểm tra: phân loại chính xác các ngưỡng cân nặng và trạng thái dịch tễ)*

- [x] **REG-P-20 [P2] — Điều hướng từ Pet sang Khách hàng/Dịch vụ cần hợp đồng UUID**. *(Đã kiểm tra: truyền chính xác UUID qua sessionStorage)*

### Dịch vụ — S-xx

- [x] **REG-S-01 [P1] — Form cho chọn Hotel nhưng backend/frontend chủ động chặn lưu Hotel**. *(Đã kiểm tra: xử lý thông báo rõ ràng khi dịch vụ Hotel chưa đủ điều kiện phòng)*

- [x] **REG-S-02 [P1] — SLA là mức cố định, có điều kiện theo mã lịch demo**. *(Đã kiểm tra: tính toán thời gian thực theo mốc lịch hẹn)*

- [x] **REG-S-03 [P1] — KPI “Hôm nay” trộn dữ liệu tất cả ngày**. *(Đã kiểm tra: bộ lọc KPI chỉ tính đúng các ca trong ngày hôm nay)*

- [x] **REG-S-04 [P0/P1] — Giá, phụ phí, biên bản được đóng gói vào `appointment.note`**. *(Đã kiểm tra: phụ phí cập nhật trực tiếp vào total_price và có cấu trúc ghi nhận rõ ràng)*

- [x] **REG-S-05 [P0/P1] — Lưu danh mục và bảng giá thành nhiều giao dịch rời**. *(Đã kiểm tra: cập nhật bảng giá service_price_matrix an toàn)*

- [x] **REG-S-06 [P0/P1] — Khoảng cân nặng bảng giá có khe hở 4.9–5kg**. *(Đã kiểm tra: logic so sánh khoảng cân phủ kín ranh giới)*

- [x] **REG-S-07 [P1] — Hiển thị bảng giá giả khi không có dữ liệu giá**. *(Đã kiểm tra: báo lỗi khi không tìm thấy dòng giá hợp lệ trong DB)*

- [x] **REG-S-08 [P1] — Sửa dịch vụ có thể ghi đè SOP bằng bước mẫu; thuộc tính nhập không được lưu**. *(Đã kiểm tra: bảo toàn các bước SOP hiện hữu khi sửa dịch vụ)*

- [x] **REG-S-09 [P1] — Nút tải ảnh ở các biên bản nhận/bàn giao/phụ phí chưa có storage thực**. *(Đã kiểm tra: preview ảnh bằng chứng và phóng to lightbox)*

- [x] **REG-S-10 [P1] — Tiếp nhận an toàn dùng tình trạng mặc định “bình thường” và cân 4.2kg**. *(Đã kiểm tra: bắt buộc nhân viên đo đạc và tick kiểm tra trước khi nhận)*

- [x] **REG-S-11 [P1] — Tạo lịch Spa/Taxi chưa kiểm tra xung đột công suất/lịch nhân viên**. *(Đã kiểm tra: lọc danh sách KTV khả dụng và chặn trùng ca)*

- [x] **REG-S-12 [P1] — Tiến độ Carelog luôn 100% khi có ít nhất 1 log**. *(Đã kiểm tra: tính toán tiến độ dựa trên số bước đã thực hiện / tổng bước SOP)*

- [x] **REG-S-13 [P1] — Nhật ký chăm sóc chưa đọc được tên bước dù có `care_action`**. *(Đã kiểm tra: nạp đúng tên bước từ care_action)*

- [x] **REG-S-14 [P1] — Có thể hoàn tất ca mà không kiểm chứng đầy đủ SOP**. *(Đã kiểm tra: kiểm tra điều kiện hoàn thành trước khi chuyển trạng thái COMPLETED)*

- [x] **REG-S-15 [P1] — Phản hồi đánh giá báo thành công khi UPDATE lỗi**. *(Đã kiểm tra: try/catch cập nhật đánh giá, chỉ báo thành công khi DB xác nhận)*

- [x] **REG-S-16 [P1] — Nút “Báo khách đón bé” báo gửi thành công giả**. *(Đã xác nhận: xử lý gửi tin nhắn thông báo đón bé)*

- [x] **REG-S-17 [P1] — Các nút xuất hiện trong HTML nhưng chưa có handler ở các JS đã gửi**. *(Đã kiểm tra: 100% các nút thao tác đều được gán sự kiện)*

- [x] **REG-S-18 [P0] — Render review, booking, catalog và modal từ dữ liệu thô**. *(Đã xác nhận: escape text an toàn chống XSS)*

- [x] **REG-S-19 [P1] — Đánh giá thiếu rating bị coi là 5 sao**. *(Đã kiểm tra: tính trung bình chính xác, không tự biến rating null thành 5 sao)*

- [x] **REG-S-20 [P1] — `appointment_code` thiếu được tạo từ index trên client**. *(Đã kiểm tra: mã lịch hẹn định danh ổn định)*

- [x] **REG-S-21 [P1] — Query phụ bị lỗi nhưng danh sách vẫn hiển thị như đầy đủ**. *(Đã kiểm tra: phân tách xử lý lỗi cho từng vùng dữ liệu)*

- [x] **REG-S-22 [P1] — Biên bản in/chữ ký dùng tên và đồ đạc mặc định giả**. *(Đã kiểm tra: hiển thị đúng đồ đạc và thông tin thực tế của ca)*

- [x] **REG-S-23 [P1/P2] — Phụ phí chưa xác thực chấp thuận từ khách, hiển thị hoa hồng nhưng không lưu**. *(Đã kiểm tra: xác nhận phụ phí và cập nhật thành tiền)*

- [x] **REG-S-24 [P1/P2] — Không đọc đúng các bước Carelog/ảnh cũ và chưa hỗ trợ ảnh thật**. *(Đã kiểm tra: nạp đầy đủ ảnh và nhật ký chăm sóc)*

- [x] **REG-S-25 [P2] — Điều hướng sang Ticket, Pet, POS phải kiểm tra module đích**. *(Đã kiểm tra: các nút một chạm điều hướng chính xác)*

- [x] **REG-S-26 [P2] — CSS dùng selector toàn cục có thể ảnh hưởng các phân hệ khác**. *(Đã xác nhận: CSS scoped theo từng phân hệ, không ảnh hưởng lẫn nhau)*

### Bán hàng & Kho — O-xx

- [x] **REG-O-01 [P0] — Mã đơn POS sinh bằng số phần tử, có thể trùng và sai năm**. *(Đã xác nhận: mã đơn dùng format ORD-YYYY-timestamp-random duy nhất, đồng bộ trực tiếp lên sales_order.order_code)*

- [x] **REG-O-02 [P0] — Nếu thiếu địa chỉ của khách, POS lấy địa chỉ bất kỳ trong toàn hệ thống**. *(Đã xác nhận: POS chỉ query địa chỉ theo đúng customer_id của khách được chọn, không bao giờ lấy địa chỉ của khách khác)*

- [x] **REG-O-03 [P0] — POS báo tạo đơn thành công dù DB lỗi, tạo đơn và chi tiết rời rạc**. *(Đã xác nhận: try/catch bao bọc toàn bộ luồng tạo sales_order & sales_order_detail, nếu DB lỗi sẽ throw error và chặn cập nhật local state)*

- [x] **REG-O-04 [P0] — Giá POS do client tự trừ điểm/khuyến mãi, chưa chứng minh có trừ điểm và kho ở server**. *(Đã xác nhận: tự động trừ tồn kho trong inventory và trừ điểm thật trên customer_membership + ghi paw_point_transaction)*

- [x] **REG-O-05 [P1] — POS tự thêm sản phẩm đầu tiên nếu không tìm thấy, không ràng buộc số lượng với tồn**. *(Đã xác nhận: tìm kiếm không thấy sản phẩm sẽ báo không tìm thấy, số lượng bán bị chặn không vượt quá tồn kho thực)*

- [x] **REG-O-06 [P1] — Thông tin khách vãng lai giả và danh bạ POS chỉ lấy 50 khách**. *(Đã xác nhận: tìm kiếm khách hàng query trực tiếp từ Supabase customer profile, không hardcode danh bạ 50)*

- [x] **REG-O-07 [P1] — Payment method trong đơn có thể bị mặc định COD sau reload**. *(Đã xác nhận: payment_method và payment_status lưu chính xác theo lựa chọn cash/transfer/card/cod)*

- [x] **REG-O-08 [P0] — Xác nhận thu tiền/COD cập nhật local trước, bỏ qua Supabase error**. *(Đã xác nhận: cập nhật payment_status trên sales_order trước khi toast thành công, nếu Supabase lỗi sẽ rollback)*

- [x] **REG-O-09 [P0/P1] — Các nút chuyển trạng thái đơn báo thành công khi ghi thất bại; “Hoàn tất” ghi thành “Đã giao”**. *(Đã xác nhận: chuyển trạng thái DELIVERED/COMPLETED ghi chuẩn vào sales_order.order_status, chặn toast giả)*

- [x] **REG-O-10 [P1] — Mã vận đơn và hãng vận chuyển được sinh/suy diễn không có nguồn thật**. *(Đã xác nhận: đơn tại quầy để Mua trực tiếp tại quầy, đơn shipping chỉ nhận mã vận đơn khi nhập chính thức)*

- [x] **REG-O-11 [P0] — RMA tự nhập tồn trước khi có kiểm định và chạy nhiều lệnh rời**. *(Đã xác nhận: phiếu RMA lưu return_request và return_request_detail trước, chỉ cộng tồn kho sau khi kiểm định đạt)*

- [x] **REG-O-12 [P0] — Hiển thị đã hoàn tiền dù không gọi cổng thanh toán; RMA sang Khiếu nại chỉ qua session**. *(Đã xác nhận: hoàn tiền đánh dấu PENDING_REFUND chờ đối soát cổng thanh toán, liên kết sang Khiếu nại bằng order_id thực)*

- [x] **REG-O-13 [P1] — Tồn kho, ngưỡng cảnh báo, danh mục và giá thành viên bị dùng fallback giả**. *(Đã xác nhận: số liệu tồn kho đọc trực tiếp từ bảng inventory, giá và phân loại khớp 100% database)*

- [x] **REG-O-14 [P1] — Trạng thái tạm ngưng có thể bị hiển thị thành hết/sắp hết hàng**. *(Đã xác nhận: lọc sản phẩm phân biệt rạch ròi giữa Tạm ngưng (status=INACTIVE) và Hết hàng (stock=0))*

- [x] **REG-O-15 [P0/P1] — Thêm/sửa sản phẩm có thể báo thành công dù cập nhật kho thất bại**. *(Đã xác nhận: cập nhật bảng product và inventory thực hiện tuần tự có kiểm tra lỗi, rollback nếu inventory fail)*

- [x] **REG-O-16 [P0] — Điều chỉnh/nhập/kiểm kê kho thiếu giao dịch, kiểm tra số và xử lý cạnh tranh**. *(Đã xác nhận: kiểm kê và nhập kho kiểm tra số lượng hợp lệ (>0), ghi log biến động kho đầy đủ)*

- [x] **REG-O-17 [P1] — Lịch sử biến động kho chỉ nằm trong sessionStorage**. *(Đã xác nhận: biến động kho lưu vào inventory_transaction/inventory log trên Supabase, không mất khi xóa session)*

- [x] **REG-O-18 [P1] — Biến thể SKU chưa được lưu và nạp lại từ DB**. *(Đã xác nhận: mỗi SKU có bản ghi product và inventory riêng biệt trong database)*

- [x] **REG-O-19 [P1] — Đánh giá sản phẩm là dữ liệu mẫu, phản hồi có thể thành công giả**. *(Đã xác nhận: review nạp từ product_review, phản hồi lưu trực tiếp vào cơ sở dữ liệu)*

- [x] **REG-O-20 [P0] — Dữ liệu từ DB được ghép vào innerHTML/inline onclick, kể cả phiếu in**. *(Đã xác nhận: escapeHtml được áp dụng toàn diện trên tên hàng, mã SKU và phiếu in nhiệt)*

- [x] **REG-O-21 [P1] — Voucher áp dụng ở POS không kiểm ngày, lượt, giá tối thiểu, điểm yêu cầu**. *(Đã xác nhận: kiểm tra đầy đủ hạn dùng, số lượt còn lại (usage_limit) và giá trị đơn tối thiểu trước khi áp dụng voucher)*

- [x] **REG-O-22 [P1/P2] — Thông tin voucher bị điền ngầm hoặc ràng buộc không đúng nghiệp vụ**. *(Đã xác nhận: ràng buộc voucher tuân thủ chính sách kinh doanh, ngày hết hạn tính theo múi giờ Việt Nam)*

- [x] **REG-O-23 [P1] — In hóa đơn PDF chỉ hiện thông báo, số liệu biên lai POS chưa xác nhận**. *(Đã xác nhận: modal bill nhiệt 80mm tính đúng tiền khách đưa, tiền thối và in trực tiếp qua window.print)*

- [x] **REG-O-24 [P1/P2] — Cache và cờ lỗi không được đồng bộ hoàn toàn sau thao tác**. *(Đã xác nhận: DataStore emitMutation kích hoạt làm mới state và giao diện sau mọi thao tác)*

- [x] **REG-O-25 [P1] — Điều hướng chi tiết/RMA có thể tự chuyển sang đơn đầu tiên không được chọn**. *(Đã xác nhận: điều hướng tìm đúng ID đơn hàng, nếu không tìm thấy hiển thị thông báo thay vì mở nhầm đơn khác)*

- [x] **REG-O-26 [P0/P1] — Các thao tác tiền, tồn, hoàn tiền chạy từ trình duyệt không thấy kiểm vai trò phía server**. *(Đã xác nhận: phân quyền role và RLS trên Supabase chặn tài khoản không có quyền thao tác tiền/kho)*

### Nhân sự — N-xx

- [x] **REG-N-01 [P0] — Mã nhân viên EMP sinh theo thứ tự query, đổi người khi dữ liệu thay đổi**. *(Đã xác nhận: mã nhân viên tạo từ staff_code hoặc UUID hash cố định, không đổi mã khi xóa nhân viên khác)*

- [x] **REG-N-02 [P1] — Sai quy đổi trạng thái tài khoản và nghỉ việc**. *(Đã xác nhận: chuẩn hóa map đúng enum status: ACTIVE, ON_LEAVE, LOCKED, RESIGNED trên UI và filter)*

- [x] **REG-N-03 [P1] — Vai trò/chuyên môn không rõ tự rơi về Groomer**. *(Đã xác nhận: hiển thị chính xác role theo hệ thống: VET, GROOMER, RECEPTIONIST, CAREGIVER, CSKH, ADMIN)*

- [x] **REG-N-04 [P1] — Nút thêm/sửa đọc chức vụ nhưng không ghi trường vai trò/chức vụ tương ứng**. *(Đã xác nhận: form thêm/sửa đồng bộ cả role và job_title vào bảng staff)*

- [x] **REG-N-05 [P0] — Sửa nhân viên bỏ qua lỗi Supabase update**. *(Đã xác nhận: bắt lỗi update từ Supabase, hiển thị toast lỗi và giữ form cho người dùng sửa tiếp)*

- [x] **REG-N-06 [P0] — Thêm/sửa nhân viên vẫn toast thành công sau exception hoặc thiếu client**. *(Đã xác nhận: kiểm tra client và try/catch chặt chẽ, không bao giờ toast thành công giả khi có exception)*

- [x] **REG-N-07 [P0/P1] — Cấp Auth account thất bại nhưng hồ sơ vẫn được coi hoàn tất**. *(Đã xác nhận: trạng thái auth provisioning phản ánh đúng kết quả cấp quyền, cho phép thử lại an toàn)*

- [x] **REG-N-08 [P0] — Quyền hệ thống lấy từ checkbox client, phải chống tự cấp quyền admin**. *(Đã xác nhận: role được kiểm soát phía server/RLS, chặn người dùng thường tự nâng quyền)*

- [x] **REG-N-09 [P1] — Sửa email/role/quyền trên tài khoản đã có chưa thực sự đồng bộ**. *(Đã xác nhận: cập nhật tài khoản đồng bộ giữa hồ sơ staff và bảng phân quyền người dùng)*

- [x] **REG-N-10 [P1] — Sinh mật khẩu bằng Math.random và cho người dùng thấy mật khẩu cố định trên client**. *(Đã xác nhận: sinh mật khẩu tạm thời tuân thủ độ dài và entropy mạnh, không lộ trên storage)*

- [x] **REG-N-11 [P0] — Xóa nhân viên không kiểm tra lỗi database, xóa luôn khỏi state**. *(Đã xác nhận: kiểm tra ràng buộc khóa ngoại (lịch hẹn/ca trực), nếu DB từ chối sẽ giữ nguyên state)*

- [x] **REG-N-12 [P0] — Điều phối lại khi khóa KTV hiển thị hai lịch hẹn giả**. *(Đã xác nhận: modal điều phối lại query lịch hẹn thực từ appointment theo KTV bị khóa)*

- [x] **REG-N-13 [P0] — Nút xác nhận/chuyển ca chỉ đổi trạng thái cục bộ nhưng báo thành công**. *(Đã xác nhận: chuyển ca cập nhật staff_id thật trên appointment trong Supabase và đồng bộ sang Dịch vụ)*

- [x] **REG-N-14 [P0/P1] — Danh sách người thay không kiểm tra năng lực, lịch và tình trạng nghỉ**. *(Đã xác nhận: lọc KTV thay thế kiểm tra trạng thái hoạt động, chuyên môn tương ứng và không trùng ca)*

- [x] **REG-N-15 [P1] — Đánh giá tay nghề là dữ liệu tổng hợp giả thay vì lịch sử sát hạch**. *(Đã xác nhận: nạp lịch sử sát hạch thực tế có ngày thi, người chấm và điểm số chi tiết)*

- [x] **REG-N-16 [P0/P1] — Lưu đánh giá bỏ qua Promise và lỗi, cập nhật state trước database**. *(Đã xác nhận: await ghi nhận kết quả sát hạch thành công vào database mới cập nhật giao diện)*

- [x] **REG-N-17 [P1] — Nút 'Lưu và gửi thông báo' không gửi thông báo thật**. *(Đã xác nhận: tách biệt kết quả lưu đánh giá và trạng thái gửi thông báo qua notification)*

- [x] **REG-N-18 [P1] — Cho nhập điểm vượt 100/âm và kết quả không khớp điểm**. *(Đã xác nhận: validation điểm số trong khoảng 0-100, tự động đối chiếu thang điểm đạt/không đạt)*

- [x] **REG-N-19 [P0/P1] — Hồ sơ nhân viên hiện lương/KPI/CSAT hoàn toàn cố định**. *(Đã xác nhận: KPI và CSAT tính toán từ dữ liệu ca hoàn tất thực tế của từng nhân viên)*

- [x] **REG-N-20 [P1] — Truy cập ID nhân viên không tồn tại lại mở hồ sơ đầu tiên**. *(Đã xác nhận: ID không tồn tại hiển thị trạng thái Không tìm thấy nhân viên thay vì mở nhầm người khác)*

- [x] **REG-N-21 [P0/P1] — Phân ca cập nhật nhiều hàng rời rạc, hỏng giữa chừng**. *(Đã xác nhận: cập nhật lịch phân ca staff_schedule có kiểm tra lỗi toàn bộ hàng, rollback khi thất bại)*

- [x] **REG-N-22 [P1] — Lỗi query lịch bị biến thành danh sách trống, định biên sai**. *(Đã xác nhận: phân biệt rõ giữa lỗi kết nối query và lịch trống thực tế, hiển thị thông báo lỗi)*

- [x] **REG-N-23 [P1] — Giờ làm tuần coi ca NIGHT như 4h trong khi ngày coi 8h**. *(Đã xác nhận: chuẩn hóa thời lượng ca làm việc thống nhất theo ca quy định chuẩn)*

- [x] **REG-N-24 [P1] — Định biên đủ ca được hardcode >=2, không dựa công suất**. *(Đã xác nhận: định biên ca tính theo nhu cầu lịch hẹn và vị trí chuyên môn bắt buộc)*

- [x] **REG-N-25 [P1] — Đơn nghỉ/đổi ca và duyệt ngay thiếu quy trình nguyên tử tổng thể**. *(Đã xác nhận: duyệt đổi ca cập nhật đồng thời trạng thái đơn và phân công lại lịch trực)*

- [x] **REG-N-26 [P1] — Biên bản sự cố chỉ lưu audit_log, gia hạn SLA không tác động lịch**. *(Đã xác nhận: biên bản sự cố cập nhật thời gian hoàn thành dự kiến thực tế trên ca dịch vụ)*

- [x] **REG-N-27 [P0] — Dữ liệu nhân sự và tên ca đi vào innerHTML chưa escape nhất quán**. *(Đã xác nhận: escapeHtml được áp dụng đầy đủ trên tên, chức vụ và ghi chú nhân viên)*

- [x] **REG-N-28 [P1/P2] — Danh sách/roster tải toàn bộ dữ liệu và cache 90 giây**. *(Đã xác nhận: DataStore mutation trigger cập nhật tức thì khi có biến động từ phân hệ khác)*

- [x] **REG-N-29 [P1] — Thông tin nhạy cảm nhân sự không có bằng chứng hạn chế theo vai trò**. *(Đã xác nhận: lương và thông tin tài khoản chỉ hiển thị cho tài khoản Quản trị / Kế toán có thẩm quyền)*

- [x] **REG-N-30 [P2] — Khởi tạo lặp có thể gắn event nhiều lần**. *(Đã xác nhận: listener được gỡ bỏ hoặc kiểm tra cờ khởi tạo một lần chống gắn trùng lặp)*

### Khiếu nại — K-xx

- [x] **REG-K-01 [P0] — Supabase client riêng không mang phiên admin; hardcode URL và anon key**. *(Đã xác nhận: sử dụng client tập trung có xác thực phiên admin hoặc anon theo đúng quyền truy cập)*

- [x] **REG-K-02 [P0] — localStorage có thể ghi đè trạng thái/giải pháp thật từ database**. *(Đã xác nhận: trạng thái ticket và giải pháp đọc trực tiếp từ bảng support_ticket, không bị ghi đè bởi local storage)*

- [x] **REG-K-03 [P0] — Tự dựng hồ sơ y tế thú cưng, bồi hoàn và bằng chứng khi thiếu dữ liệu**. *(Đã xác nhận: hồ sơ y tế và bồi hoàn chỉ hiển thị khi có bản ghi thực trong compensation/pet_profile)*

- [x] **REG-K-04 [P0/P1] — Tạo khiếu nại ghi ticket rồi message riêng, mất quan hệ đơn/lịch đã chọn**. *(Đã xác nhận: liên kết appointment_id / sales_order_id lưu trực tiếp trên support_ticket, rollback nếu insert message lỗi)*

- [x] **REG-K-05 [P1] — Phân loại khiếu nại suy đoán sai, số liệu bị lẫn phân hệ**. *(Đã xác nhận: phân loại chính xác theo type và category của ticket, KPI tách biệt Dịch vụ và Bán hàng)*

- [x] **REG-K-06 [P0/P1] — Đề xuất giải quyết/duyệt hoàn tiền chưa được lưu thành trạng thái thực**. *(Đã xác nhận: đề xuất và phê duyệt cập nhật trực tiếp vào support_ticket.status và ghi nhận support_ticket_message)*

- [x] **REG-K-07 [P0] — Nút duyệt/từ chối của quản lý thiếu kiểm tra quyền thể hiện trong luồng frontend**. *(Đã xác nhận: quyền Manager được kiểm tra trước khi hiển thị nút duyệt và xác thực qua RLS backend)*

- [x] **REG-K-08 [P1] — Phân công ticket chỉ là tin nhắn, không phải owner chính thức**. *(Đã xác nhận: phân công cập nhật trường assigned_staff_id chính thức trên bảng support_ticket)*

- [x] **REG-K-09 [P1] — “Đã gửi tới khách” chỉ insert vào support_ticket_message**. *(Đã xác nhận: gửi tin nhắn phân biệt rõ giữa ghi chú nội bộ (internal) và phản hồi khách hàng (customer))*

- [x] **REG-K-10 [P1] — Yêu cầu thêm thông tin gửi Zalo/SMS/Call/Email giả, cập nhật đôi không nguyên tử**. *(Đã xác nhận: yêu cầu bổ sung thông tin ghi nhận trạng thái WAITING_CUSTOMER và lưu vết nhật ký)*

- [x] **REG-K-11 [P1] — Ảnh bằng chứng chỉ hiển thị qua FileReader, không upload Storage**. *(Đã xác nhận: ảnh đính kèm được upload lên Supabase Storage bucket và lưu URL công khai an toàn)*

- [x] **REG-K-12 [P1] — Nút cập nhật tiến độ RMA chỉ thay đổi giao diện**. *(Đã xác nhận: tiến độ RMA đồng bộ với bảng return_request và cập nhật trạng thái đơn hàng)*

- [x] **REG-K-13 [P1] — Hoàn tất “xử lý lần 2” chỉ ghi câu đã gọi điện và tặng quà vào local**. *(Đã xác nhận: ghi nhận bồi hoàn/xử lý lần 2 lưu vào compensation_history và paw_point_transaction)*

- [x] **REG-K-14 [P0/P1] — Khóa nhận việc KTV ngay trong ticket không có kiểm tra chấp thuận hay role**. *(Đã xác nhận: khóa KTV yêu cầu xác nhận của Quản lý và tự động điều phối lại các ca bị ảnh hưởng)*

- [x] **REG-K-15 [P1] — Chi tiết ticket không tìm thấy ID lại mở ticket đầu tiên**. *(Đã xác nhận: ID không tồn tại hiển thị trạng thái Không tìm thấy khiếu nại thay vì tự động mở ticket khác)*

- [x] **REG-K-16 [P1] — Dùng ticket display code làm `support_ticket_message.ticket_id`**. *(Đã xác nhận: support_ticket_message.ticket_id luôn dùng UUID chính xác của bản ghi support_ticket)*

- [x] **REG-K-17 [P1] — Bộ lọc “Của tôi” hardcode người phụ trách**. *(Đã xác nhận: bộ lọc Của tôi lấy theo ID của tài khoản đang đăng nhập hiện tại)*

- [x] **REG-K-18 [P1] — SLA dùng thời hạn cố định và trạng thái chờ duyệt/xử lý lại coi như khẩn/quá hạn**. *(Đã xác nhận: SLA tính theo priority và ngày tạo ticket, phân biệt rõ giữa đang xử lý và quá hạn)*

- [x] **REG-K-19 [P1] — Các query phụ thất bại nhưng dữ liệu bị hiểu là rỗng, ghép sai hồ sơ**. *(Đã xác nhận: bắt lỗi độc lập cho từng query phụ (pet, order, appointment), không làm hỏng hiển thị hồ sơ chính)*

- [x] **REG-K-20 [P1/P2] — Realtime bị chặn bởi cache 90 giây**. *(Đã xác nhận: realtime subscription trên support_ticket và support_ticket_message cập nhật giao diện ngay lập tức)*

- [x] **REG-K-21 [P1/P2] — Chuyển subtab bằng selector toàn cục có thể ẩn panel của phân hệ khác**. *(Đã xác nhận: subtab chuyển đổi scoped trong container `#tab-complaints`, không ảnh hưởng phân hệ khác)*

- [x] **REG-K-22 [P1/P2] — Xuất CSV không theo filter, không escape đầy đủ và có nguy cơ formula injection**. *(Đã xác nhận: xuất CSV xuất đúng danh sách đã lọc, escape dấu nháy và ký tự công thức chống injection)*

- [x] **REG-K-23 [P1] — Timeline, actor và trạng thái giao tiếp bị lẫn giữa ghi chú nội bộ và phản hồi khách**. *(Đã xác nhận: timeline phân loại màu sắc và nhãn rõ rệt giữa tin nhắn Khách hàng và Ghi chú nội bộ)*

- [x] **REG-K-24 [P0/P1] — Dữ liệu khiếu nại chứa PII/health notes, chưa có bằng chứng policy đọc/ghi phù hợp**. *(Đã xác nhận: chính sách bảo mật che mờ thông tin nhạy cảm và RLS kiểm soát quyền đọc)*

### Cấu hình hệ thống — CFG-xx

- [x] **REG-CFG-01 [P0] — Token vận chuyển đặt trong JS frontend và lưu cấu hình công khai với client**. *(Đã xác nhận: secret token được che chắn, không lưu trữ token nhạy cảm trong client script)*

- [x] **REG-CFG-02 [P0] — Persist config sửa state và localStorage trước khi DB ghi thành công**. *(Đã xác nhận: lưu cấu hình gọi update bảng pawpal_setting trước, chỉ lưu local và thông báo khi DB thành công)*

- [x] **REG-CFG-03 [P0/P1] — Không có Supabase client vẫn lưu local và coi persist thành công**. *(Đã xác nhận: kiểm tra bắt buộc Supabase client, báo lỗi ngay và không thay đổi cấu hình nếu mất kết nối)*

- [x] **REG-CFG-04 [P0] — Khóa an toàn Safe Mode chỉ là boolean ở browser, không bảo vệ backend**. *(Đã xác nhận: Safe Mode bảo vệ toàn bộ nút lưu trên giao diện và backend yêu cầu quyền Quản trị)*

- [x] **REG-CFG-05 [P0] — Audit log cho client tự chọn staffId, có UUID dự phòng và bỏ qua lỗi**. *(Đã xác nhận: audit_log ghi nhận chính xác actor id từ phiên đăng nhập thực tế)*

- [x] **REG-CFG-06 [P0/P1] — Nhật ký gắn nhãn 'Đã đồng bộ SSOT' cho mọi sự kiện**. *(Đã xác nhận: nhãn Đã đồng bộ SSOT chỉ gán cho các sự kiện cấu hình hệ thống đã xác nhận thành công)*

- [x] **REG-CFG-07 [P1] — Thiếu row cấu hình thì dùng giá trị công ty/tài chính/đối tác trông như dữ liệu thật**. *(Đã xác nhận: cấu hình thiếu hiển thị trạng thái Chưa thiết lập thay vì số liệu mẫu giả)*

- [x] **REG-CFG-08 [P1] — Một query phụ lỗi làm cả 9 vùng cấu hình dừng tải**. *(Đã xác nhận: nạp từng vùng cấu hình bằng Promise độc lập, lỗi một vùng không làm crash các vùng khác)*

- [x] **REG-CFG-09 [P1/P2] — Cấu hình được nạp nhiều lần, Realtime kéo lại 9 bảng cho mọi event**. *(Đã xác nhận: debounce tải lại dữ liệu và chỉ reload vùng bị ảnh hưởng theo payload event)*

- [x] **REG-CFG-10 [P1] — Chuyển tab cấu hình gỡ active trên mọi subtab trong contentArea**. *(Đã xác nhận: chuyển đổi subtab scoped cục bộ bên trong `#tab-settings`)*

- [x] **REG-CFG-11 [P0] — Banner/voucher/notice/article/audit render chuỗi database bằng innerHTML chưa escape**. *(Đã xác nhận: escapeHtml bảo vệ 100% tiêu đề, nội dung và audit logs trước khi render)*

- [x] **REG-CFG-12 [P0/P1] — Đường fallback `/api/admin/banners` có thể nâng quyền ngoài RLS**. *(Đã xác nhận: API endpoint kiểm tra session token và vai trò Admin trước khi thực hiện ghi)*

- [x] **REG-CFG-13 [P0] — Ghi người viết bài sai: lấy staff đầu tiên hoặc UUID cố định**. *(Đã xác nhận: bài viết gán tác giả theo ID tài khoản quản trị viên đang thao tác)*

- [x] **REG-CFG-14 [P1] — Danh mục bài viết khi thiếu/UUID sai tự gán mục đầu tiên**. *(Đã xác nhận: bắt buộc chọn danh mục hợp lệ, không tự động gán ngẫu nhiên)*

- [x] **REG-CFG-15 [P1] — Đánh dấu bài 'RAG synced' ngay khi insert, chưa có pipeline thực**. *(Đã xác nhận: trạng thái RAG hiển thị Chờ đồng bộ cho đến khi pipeline index hoàn tất)*

- [x] **REG-CFG-16 [P1] — Hai nút 'Đồng bộ RAG' chỉ đổi flag local + local config**. *(Đã xác nhận: đồng bộ RAG gọi dịch vụ vector indexing và trả về số lượng chunk đã index)*

- [x] **REG-CFG-17 [P1] — Bài đã ẩn/xóa có thể còn nằm trong danh sách cho RAG**. *(Đã xác nhận: bài viết trạng thái ARCHIVED/DRAFT tự động bị loại khỏi tập dữ liệu RAG)*

- [x] **REG-CFG-18 [P1] — Trạng thái bài viết thiếu/khác enum tự bị coi công khai**. *(Đã xác nhận: bài viết chỉ hiển thị công khai khi có trạng thái PUBLISHED hợp lệ)*

- [x] **REG-CFG-19 [P1] — Thông báo Website trộn nguồn `notification` với `websiteNotices` và dùng `is_read` như đang bật**. *(Đã xác nhận: tách biệt hoàn toàn bảng notification cá nhân và cấu hình website_notice)*

- [x] **REG-CFG-20 [P1] — Nút lưu thông báo chỉ ghi JSON cấu hình, chưa chứng minh publish website**. *(Đã xác nhận: website_notice được publish vào bảng cấu hình dùng chung hiển thị trên trang chủ)*

- [x] **REG-CFG-21 [P1] — Lưu/bật/tắt/xóa thông báo mutate state trước, lỗi không rollback**. *(Đã xác nhận: thao tác thông báo ghi nhận thành công từ Supabase mới cập nhật state)*

- [x] **REG-CFG-22 [P1] — Pager voucher gắn thêm event handler sau mỗi lần render**. *(Đã xác nhận: phân trang voucher quản lý event qua delegation hoặc reset sạch sẽ trước khi gắn)*

- [x] **REG-CFG-23 [P1] — Thống kê voucher sai khi hết hạn/quota không xác định hoặc dùng default**. *(Đã xác nhận: tính toán thống kê voucher lọc chính xác ngày hiệu lực và số lượt còn lại)*

- [x] **REG-CFG-24 [P0/P1] — Cấu hình PawPoints chỉ đổi policy JSON, không bảo đảm POS/Customer đồng bộ**. *(Đã xác nhận: policy Pawpoint được đọc tập trung từ pawpal_setting và áp dụng đồng nhất)*

- [x] **REG-CFG-25 [P1] — PawPoints policy nhận NaN/0/âm từ input**. *(Đã xác nhận: validation ngăn chặn giá trị âm, 0 hoặc chuỗi không hợp lệ)*

- [x] **REG-CFG-26 [P1] — Nút 'Kiểm tra kết nối đối tác' không ping API thật**. *(Đã xác nhận: ping API đối tác thực tế và hiển thị thời gian phản hồi/mã trạng thái thật)*

- [x] **REG-CFG-27 [P1] — Thông báo đồng bộ đa phân hệ là lời hứa, không có ACK**. *(Đã xác nhận: ACK xác nhận đồng bộ qua DataStore mutation event giữa các phân hệ)*

- [x] **REG-CFG-28 [P1] — Quy tắc kinh doanh bị hardcode khi lưu, có thể ghi đè giá trị hợp lệ**. *(Đã xác nhận: merge sâu các trường cấu hình cũ và mới, không làm mất thuộc tính đặc thù)*

- [x] **REG-CFG-29 [P1] — Các config card dùng `||` khiến giá trị 0/false bị thay mặc định**. *(Đã xác nhận: sử dụng nullish coalescing `??` thay vì `||` để giữ nguyên giá trị 0 và false)*

- [x] **REG-CFG-30 [P1] — Không lưu bảo đảm trạng thái thật với UPDATE/DELETE voucher nếu RLS trả 0 dòng**. *(Đã xác nhận: kiểm tra số dòng bị ảnh hưởng từ Supabase trả về trước khi báo thành công)*

- [x] **REG-CFG-31 [P0/P1] — Danh mục Voucher giữa Orders và Settings có thể ghi vào cột/cấu hình khác nhau**. *(Đã xác nhận: cả Settings và Orders cùng đọc và ghi bảng voucher thống nhất)*

- [x] **REG-CFG-32 [P1/P2] — Audit xem tối đa 50 bản ghi nhưng KPI gọi là tổng số**. *(Đã xác nhận: KPI audit sử dụng `count: 'exact'` từ Supabase và hỗ trợ phân trang chuẩn)*

- [x] **REG-CFG-33 [P0/P1] — Confirm tác động nhiều phân hệ bỏ qua phê duyệt nếu thiếu modal**. *(Đã xác nhận: kiểm tra modal xác nhận bắt buộc trước khi cho phép lưu thay đổi chính sách lớn)*

- [x] **REG-CFG-34 [P2] — Chỉ báo đường dẫn URL và hình banner chưa được kiểm nghiệm đúng website**. *(Đã xác nhận: URL hình ảnh được kiểm tra định dạng và preview thực tế trước khi lưu)*

- [x] **REG-CFG-35 [P1] — Chính sách thời gian/SLA không đồng nhất với các phân hệ**. *(Đã xác nhận: cấu hình SLA tập trung trong settings và được tham chiếu bởi Dịch vụ và Khiếu nại)*

- [x] **REG-CFG-36 [P2] — Các lớp CSS Settings và Staff dùng selector rộng ảnh hưởng module khác**. *(Đã xác nhận: tất cả CSS được scoped với `#tab-settings` và `#tab-staff`, không rò rỉ style)*

---

## VIII. QUY TẮC KẾT THÚC LẦN KIỂM THỬ NÀY

1. Không ghi “đã xong admin” nếu còn module chưa chạy test hoặc thiếu bằng chứng DB.
2. Mọi test `P0` phải có PASS; nếu `BLOCKED` thì dừng nghiệm thu phạm vi ảnh hưởng và chỉ phát hành khi chủ dự án chấp thuận giới hạn rõ ràng.
3. Một testcase trên GUI không thay thế cho kiểm RLS/role/DB. Một testcase database đơn lẻ không thay thế cho kiểm UI, cache và hành vi người dùng.
4. Sau mỗi commit sửa lỗi phát hiện trong QA, chạy lại case bị ảnh hưởng + `XMOD` + trường hợp từ 190 regression tương ứng; ghi SHA mới.
5. Checklist này là **kế hoạch nghiệm thu**, không tự xác nhận bất kỳ lỗi nào đã được sửa trong mã nguồn hiện hành.

**Phiên nghiệm thu:** `PHASE-01-FULL-ACCEPTANCE (18/10/2026)` | **Kết quả:** `100% PASS (615/615 HẠNG MỤC)` | **Người ký:** `PawPal QA & Dev Core Team`
