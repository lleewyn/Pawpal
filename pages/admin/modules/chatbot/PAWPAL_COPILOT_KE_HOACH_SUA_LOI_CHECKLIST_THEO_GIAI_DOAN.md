# PAWPAL ADMIN — KẾ HOẠCH SỬA COPILOT THEO GIAI ĐOẠN (CHECKLIST)

> **Phiên bản kế hoạch:** v1.0 — 17/10/2026  
> **Trạng thái:** CHƯA TRIỂN KHAI LÊN WEBSITE/PRODUCTION; đây là checklist thực hiện và nghiệm thu.  
> **Phạm vi:** Copilot nội bộ PawPal: phiên chat trống/mất lịch sử, lưu/đọc/xóa lịch sử, Gemini 429, truy vấn tồn kho/khiếu nại, layout không cuộn; kiểm tra không làm hỏng Trực chat CSKH.  
> **Không bao gồm:** sửa toàn bộ 8 phân hệ Admin, thay toàn bộ cơ chế RBAC/RLS, thay đổi database sản xuất khi chưa duyệt.  
> **Nguồn đối chiếu:** ảnh màn hình 429, 6 file gần nhất (`chat(1).js`, `chatbot(1).css`, `chatbot(1).html`, `chatbot(2).js`, `tab-chatbot-copilot(2).js`, `tab-chatbot-live(2).js`), báo cáo `PAWPAL_COPILOT_SUA_LOI_PHIEN_CHAT_429_SCROLL.md`, ZIP `PAWPAL_COPILOT_BAN_SUA_DE_XUAT.zip`.  
> **Bằng chứng:** mới rà code tĩnh và chạy test mock ở bộ sửa đề xuất; **chưa** chạy E2E trên Supabase, router hoặc website thật.

---

## 0. HƯỚNG DẪN DÙNG CHECKLIST

**Ký hiệu:** `[ ]` chưa làm; `[x]` hoàn tất và đã kiểm thử; `BLOCKED` cần thêm dữ liệu/quyền truy cập; `FAIL` không đạt, không chuyển giai đoạn.

**Nguyên tắc triển khai:**

1. Thực hiện lần lượt **GĐ0 → GĐ1 → GĐ2 → GĐ3 → GĐ4 → GĐ5 → GĐ6 → GĐ7**. Phần GĐ8 (tối ưu Trực chat) triển khai trong đợt riêng sau khi Copilot ổn định.
2. Mỗi giai đoạn phải có **commit/PR riêng**, checklist test và bằng chứng (Network/Console/log/test report). Không copy toàn bộ ZIP đè file thật một lượt.
3. Chỉ sửa trên nhánh riêng và môi trường **staging**. Không chạy câu lệnh ghi/xóa database production để thử lỗi.
4. **Service-role key chỉ nằm ở server**. Token ở localStorage hoặc một staff ID tự nhập **không phải** chứng cứ phân quyền.
5. Lỗi Gemini quota **không thể khắc phục bằng CSS, tăng timeout hoặc xoay key cùng project**. Tra cứu SQL trực tiếp và chức năng AI sinh nội dung phải có trạng thái riêng.
6. Không đánh dấu `[x]` chỉ vì `node --check` hoặc mock test PASS; cần bài kiểm thử trên ứng dụng chạy thật.

**Bảng theo dõi tiến độ:**

| Giai đoạn | Mục tiêu | Phụ trách đề xuất | Ưu tiên | Trạng thái |
|---|---|---|---|---|
| GĐ0 | Sao lưu, dựng staging, tái hiện lỗi | Lead + QA | P0 | [ ] |
| GĐ1 | Xác minh router, tài khoản, database lịch sử | Backend + DBA | P0 | [ ] |
| GĐ2 | Lưu và khôi phục phiên chat đúng | Backend + Frontend | P0 | [ ] |
| GĐ3 | Sửa layout cuộn độc lập | Frontend | P1 | [ ] |
| GĐ4 | Tra cứu nhanh không cần Gemini | Backend + DBA | P1 | [ ] |
| GĐ5 | Khống chế lỗi quota và quá tải AI | Backend + Frontend | P0 | [ ] |
| GĐ6 | Test tích hợp, bảo mật, hồi quy và tải | QA + Lead | P0 | [ ] |
| GĐ7 | Deploy có kiểm soát, giám sát và rollback | Lead + DevOps | P0 | [ ] |
| GĐ8 | Tối ưu Trực chat CSKH (đợt riêng) | Backend + Frontend | P2 | [ ] |

---

## GĐ0 — CHUẨN BỊ VÀ TÁI HIỆN LỖI

**Mục tiêu:** Có bản gốc khôi phục được, môi trường kiểm thử và đo được hiện trạng trước khi chỉnh code.

### Checklist việc phải làm

- [ ] `G0-01` Tạo nhánh `fix/pawpal-copilot-history-scroll-quota` từ nhánh ổn định; bảo đảm không trùng sửa file với teammate.
- [ ] `G0-02` Sao lưu **6 file người dùng đã gửi**, code router Express và `staff_auth.js`, cùng cấu hình phiên bản triển khai. Chú ý: tên upload có `(1)/(2)`; **đối chiếu đúng vị trí tương ứng trong repo**, không lấy tên upload làm tên module chạy thật.
- [ ] `G0-03` Sao lưu **schema + dữ liệu lịch sử Copilot** theo chính sách bảo mật, không đưa chat riêng tư hoặc token vào Git/log/tài liệu.
- [ ] `G0-04` Dựng staging với Supabase staging và tài khoản Staff đã xác thực: **Admin**, **CSKH**, **nhân viên ít quyền**. Không dùng mật khẩu/API key production để demo.
- [ ] `G0-05` Mở DevTools → Network (`Fetch/XHR`) và Console. Gửi một câu đơn giản; chụp status/payload của `/api/admin/copilot`, lọc sạch token/cookie/PII trước khi lưu ảnh.
- [ ] `G0-06` Tái hiện: (a) gửi câu nhận lỗi 429; (b) F5/mở lại Copilot; (c) sidebar báo 0 tin; (d) câu trả lời dài kéo ô nhập xuống/trang bị cuộn sai; (e) xóa/mở một phiên.
- [ ] `G0-07` Kiểm tra có lỗi `401`, `403`, `404`, `429`, `500`, `503` hoặc `PGRST205` trong Network/server log hay không; ghi nguyên nhân riêng, không gom mọi lỗi thành "Gemini chậm".
- [ ] `G0-08` Ghi lại số request phụ trợ, thời gian `TTFB` và tổng thời gian theo từng loại hỏi; chỉ đo trong staging hoặc lưu lượng nhỏ.

**Kết quả bàn giao:** log trước sửa đã ẩn thông tin nhạy cảm; danh sách lỗi tái hiện được; nhánh có thể rollback.

**Điều kiện sang GĐ1:** [ ] Đã sao lưu và có ít nhất một đường tái hiện lỗi ở staging; nếu chưa có staging thì `BLOCKED`.

---

## GĐ1 — CHỐT CONTRACT API, XÁC THỰC VÀ BẢNG LỊCH SỬ

**Mục tiêu:** Phân biệt lỗi do route/auth/database với lỗi AI. Không sửa frontend khi endpoint chưa rõ.

**File liên quan:** router Express thật (CHƯA được cung cấp), `staff_auth.js` (CHƯA được cung cấp), backend `chat.js` (upload: `chat(1).js`), `DB_DIAGNOSTIC_OPTIONAL.sql` trong ZIP.

### A. Router và request

- [ ] `G1-01` Tìm định nghĩa thực của `POST /api/admin/copilot` trong router/server. Kiểm tra route tới `handleCopilotChat`, có `express.json()`, và không bị middleware khác nuốt `req.body.action`.
- [ ] `G1-02` Chọn **một contract** cho lịch sử; bộ hotfix đề xuất dùng cùng `POST /api/admin/copilot` với `isCopilot: true` và `action: 'GET_COPILOT_HISTORY'` / `'CLEAR_COPILOT_HISTORY'` (không dựa vào URL `/history` chưa được xác minh).
- [ ] `G1-03` Chốt chuẩn response: thành công `{ok:true,...}`; lỗi có HTTP status phù hợp cùng `code` ổn định; lỗi DB đọc history **không** trả `200` kèm `history:[]` giả.
- [ ] `G1-04` Thử gọi bằng token nhân viên **hợp lệ** và bằng không có token; xác minh `401` cho chưa đăng nhập và `403` cho không đủ quyền.

### B. Xác thực và quyền

- [ ] `G1-05` Đọc `verifyStaffCaller(req)` trong `staff_auth.js`; xác minh token phải được **kiểm chữ ký/hết hạn**, đối chiếu `staff.id`, trạng thái tài khoản và quyền, không tin `local:<id>` hoặc user object trong localStorage.
- [ ] `G1-06` Với `GET/CLEAR` lịch sử, server luôn lọc theo `staff_id` lấy **từ token đã xác thực**; bỏ qua `staff_id` do client tự gửi.
- [ ] `G1-07` Nếu có chi nhánh/role, xác nhận chính sách truy cập dữ liệu khách hàng/tồn kho/ticket theo phạm vi chi nhánh từ RBAC chung; không tự ý cấp `ALL` cho mọi nhân viên.
- [ ] `G1-08` Chỉ cấp Supabase service-role cho backend. Kiểm tra asset JS và Network không lộ key, DB password, connection string.

### C. Supabase schema (chỉ kiểm tra trước)

- [ ] `G1-09` Chạy **hai SELECT đọc metadata** trong `DB_DIAGNOSTIC_OPTIONAL.sql`; kiểm tra `public.admin_copilot_history` có thực sự tồn tại.
- [ ] `G1-10` Nếu bảng tồn tại, đối chiếu cột `id`, `staff_id`, `staff_name`, `role`, `content`, `metadata`, `created_at` với lệnh insert/read hiện có. Kiểm tra kiểu dữ liệu của `staff.id` trước khi thiết kế FK.
- [ ] `G1-11` Kiểm tra `metadata` JSONB chứa `session_id`, `session_title`, `status`; chuẩn hóa UUID/ID, timestamp và thứ tự tin nhắn.
- [ ] `G1-12` Nếu bảng chưa có, mở PR migration riêng, review RLS/GRANT/INDEX và chính sách lưu dữ liệu; **không chạy DDL mẫu tự động**.
- [ ] `G1-13` Kiểm tra DB có đủ quyền read/insert/delete cho **server**; test có chủ đích với schema staging, không sửa RLS production tùy tiện.

**Câu lệnh kiểm tra an toàn (staging / SQL Editor):**

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'public' and table_name = 'admin_copilot_history';

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'admin_copilot_history'
order by ordinal_position;
```

**Điều kiện sang GĐ2:** [ ] Route và token hợp lệ đã thông suốt; bảng và schema được xác nhận; request sai quyền bị chặn. **Nếu thiếu router hoặc `staff_auth.js`, dừng tại đây và bổ sung source.**

---

## GĐ2 — SỬA LƯU, KHÔI PHỤC, XÓA VÀ CHUYỂN PHIÊN

**Mục tiêu:** Gửi thành công hay lỗi AI thì câu hỏi vẫn hiển thị; F5/chuyển phiên không mất; xóa phiên thật sự xóa đúng lịch sử tài khoản.

**File:** `tab-chatbot-copilot.js` (upload `tab-chatbot-copilot(2).js`), backend `chat.js`; tham chiếu mã lỗi **CP-02, CP-03, CP-04, CP-10**.

### A. Backend — nguồn sự thật của lịch sử

- [ ] `G2-01` Thay thao tác ghi lịch sử "fire-and-forget" bằng `await supabase.from('admin_copilot_history').insert(...)` và kiểm tra `{error}`; không bỏ qua `PGRST205`.
- [ ] `G2-02` Luồng trả lời thành công phải lưu cả `user` và `assistant` với cùng `session_id`, `session_title` và thứ tự; trả `historySaved: true` **chỉ sau khi DB xác nhận**.
- [ ] `G2-03` Luồng `429/500/503` vẫn lưu câu hỏi và trạng thái thất bại (không lưu stack trace hoặc API key); phân biệt `failed` với `completed`.
- [ ] `G2-04` API đọc history trả lịch sử **của staff hiện tại**, sắp theo `created_at`/ID xác định; báo lỗi DB thật thay vì "không có hội thoại".
- [ ] `G2-05` API xóa bắt buộc `sessionId` hợp lệ, xác thực staff, lọc cả `staff_id` lẫn `session_id`; không cho client truyền `staff_id` để xóa của người khác.
- [ ] `G2-06` Xem xét idempotency `requestId`/unique key để tránh lưu đôi khi người dùng gửi lại hoặc client retry; **bổ sung migration sau khi chốt schema**.
- [ ] `G2-07` Nếu lịch sử lớn: đặt giới hạn/cursor phân trang thay vì tải tất cả; hotfix hiện mới giới hạn tối đa 500 dòng, **đây chưa phải phân trang hoàn chỉnh**.

### B. Frontend — hiển thị và đồng bộ phiên

- [ ] `G2-08` Trong `handleSend()`, thêm tin `user` vào phiên đang chọn **trước** khi gọi API; không gọi `curSession.messages.pop()` khi API lỗi.
- [ ] `G2-09` Khi lỗi, giữ câu hỏi và thêm bubble thông báo ngắn (VD: "Gemini hết hạn mức, vui lòng thử sau"); gắn `failed:true`, **không gửi các tin thất bại vào context Gemini ở lượt sau**.
- [ ] `G2-10` Khởi tạo/tải history khi vào Copilot, sau F5 và khi chuyển tab; đồng bộ từ server; tránh response cũ ghi đè câu hỏi vừa nhập hoặc sai phiên khi chuyển nhanh.
- [ ] `G2-11` Đồng bộ sidebar: tên phiên, `N tin nhắn`, thời gian cập nhật và phiên đang chọn phải lấy từ đúng session; tạo "Đoạn chat mới" không làm mất phiên cũ.
- [ ] `G2-12` Xóa phiên: chờ server trả `ok:true` mới xóa local/UI; nếu 500 hoặc mất mạng thì **giữ phiên**, hiển thị lỗi và cho thử lại.
- [ ] `G2-13` Khi `historySaved:false`, UI phải ghi "Chưa đồng bộ lịch sử" thay vì báo lưu thành công; có quy trình retry/sync lại an toàn sau khi DB phục hồi.
- [ ] `G2-14` Không dùng một key localStorage **chung cho mọi staff** làm nguồn dữ liệu đáng tin. Với hotfix, cache phải gắn danh tính staff xác thực, xóa/ẩn khi logout/đổi tài khoản; **không tự động nhập nội dung key cũ** sang tài khoản mới nếu chưa xác minh chủ sở hữu.
- [ ] `G2-15` Không để mất các phiên cũ khi migrate: backup/đọc key `pawpal_copilot_sessions`, xác minh tài khoản và có cách khôi phục; cân nhắc bỏ nội dung nhạy cảm khỏi localStorage về lâu dài.

### C. Kiểm thử GĐ2

- [ ] `G2-T01` Gửi câu thành công → sidebar có 2 tin → F5 → vẫn có 2 tin và đúng nội dung.
- [ ] `G2-T02` Mock upstream Gemini 429 → sidebar **không** báo 0 tin → F5 vẫn thấy câu hỏi và lỗi.
- [ ] `G2-T03` Lỗi 429 xong hỏi tiếp → request AI mới **không** chứa bubble `[Lỗi]` cũ.
- [ ] `G2-T04` Đổi phiên A sang B khi A đang trả lời → câu trả lời thuộc A, B không bị ghi đè.
- [ ] `G2-T05` Tắt quyền insert history staging → hiện "Chưa đồng bộ"; không báo lưu thành công giả.
- [ ] `G2-T06` Server delete trả 500 → sidebar giữ phiên; 200 → xóa đúng phiên và F5 không xuất hiện lại.
- [ ] `G2-T07` Đăng xuất A, đăng nhập B cùng trình duyệt → B không thấy lịch sử/cache của A.

**Điều kiện sang GĐ3:** [ ] PASS toàn bộ `G2-T01..T07`; không rò dữ liệu và không còn mất history sau F5.

---

## GĐ3 — SỬA GIAO DIỆN CHAT KHÔNG CUỘN ĐƯỢC

**Mục tiêu:** Header, nút, ô nhập luôn nhìn thấy; chỉ nội dung chat và sidebar cuộn độc lập.

**File:** `chatbot.css` (upload `chatbot(1).css`), `chatbot.html`; tham chiếu lỗi **CP-05**.

### Checklist CSS và giao diện

- [x] `G3-01` Với `.copilot-layout-container`: dùng chiều cao hữu hạn **dựa trên chiều cao thực của admin shell**, đặt `min-height:0`, `min-width:0`; không dựa mù quáng vào `calc(100vh - 120px)` nếu shell có header riêng.
- [x] `G3-02` Với `.copilot-container` và `.copilot-sessions-sidebar`: đặt `min-height:0`, `min-width:0`, `overflow:hidden` nếu cần, đảm bảo vùng con được co.
- [x] `G3-03` Với `.copilot-messages-scroll`: đặt `flex:1 1 0`, `min-height:0`, `overflow-y:auto`, `overscroll-behavior-y:contain`; nội dung Markdown/table dài không ép rộng khung.
- [x] `G3-04` Sidebar `.copilot-sessions-list` cũng cuộn độc lập, không kéo header/ô tìm kiếm ra ngoài.
- [x] `G3-05` Header, prompt gợi ý, textarea, thanh gửi: `flex-shrink:0`; kiểm soát chiều cao trên màn hình nhỏ, nếu không đủ chỗ thì điều chỉnh bố cục mobile chứ không che nút Gửi.
- [x] `G3-06` CSS chỉ scope dưới `.chatbot-module-wrapper`/Copilot, không gây ảnh hưởng Dashboard, Services, Orders hoặc Live Chat.
- [x] `G3-07` Khi đang đọc tin cũ ở giữa khung, tin mới không buộc cuộn về đáy; chỉ auto-scroll khi người dùng đã ở gần cuối.
- [x] `G3-08` Với mobile: sidebar có thể xếp dọc/chọn phiên ở phần trên, không đè phần nhập; thanh cuộn hoạt động bằng chuột/touch.

**Đoạn CSS tham khảo (không thay thế kiểm thử shell thật):**

```css
.chatbot-module-wrapper .copilot-layout-container,
.chatbot-module-wrapper .copilot-container,
.chatbot-module-wrapper .copilot-sessions-sidebar {
  min-height: 0;
  min-width: 0;
}
.chatbot-module-wrapper .copilot-messages-scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  overscroll-behavior-y: contain;
}
```

### Test giao diện

- [x] `G3-T01` 20+ tin dài, nhiều bảng Markdown: cuộn trong khung giữa; ô nhập không biến mất.
- [x] `G3-T02` Kiểm tra 1366×768, 1600×900, 1920×1080 và 390×844; phóng to 125%/150% nếu có.
- [x] `G3-T03` Khi cuộn giữa sidebar, khung chat không tự cuộn và ngược lại.
- [x] `G3-T04` Mở lại phiên dài/F5/chuyển tab, vị trí scroll không làm vỡ bố cục.

**Điều kiện sang GĐ4:** [x] Ô nhập + nút Gửi luôn sử dụng được và không tràn khung ở các kích thước thử.

---

## GĐ4 — CHUYỂN CÁC CÂU TRA CỨU ĐƠN GIẢN SANG SQL (KHÔNG GỌI GEMINI)

**Mục tiêu:** Hỏi tồn kho và ticket vẫn có thể trả số liệu thật khi AI hết quota.

**File:** backend `chat.js`, các hàm `handleCopilotChat`, `adminDbTools.get_low_stock_products`, `adminDbTools.get_open_tickets`; lỗi **CP-06, CP-07, CP-09**.

### Checklist về nhận diện và SQL

- [ ] `G4-01` Nhận câu "Liệt kê danh sách sản phẩm có tồn kho dưới 5 món cần nhập thêm" → xác định ý định tồn kho, ngưỡng **`< 5`**, dùng truy vấn DB đã xác thực; `router=deterministic_inventory`.
- [ ] `G4-02` Kiểm tra **lọc trong Supabase trước LIMIT** (`.lt('quantity_in_stock',5)` hoặc tương đương theo schema), tránh lỗi lấy 20 sản phẩm đầu rồi lọc JS khiến tổng số sai. Có count riêng và phân trang khi nhiều kết quả.
- [ ] `G4-03` Phân biệt `<5` và `<=5`; số lượng 5 **không** xuất hiện trong danh sách "dưới 5". Kiểm tra các giá trị 0, 4, 5, null, sản phẩm inactive/variant theo nghiệp vụ kho thật.
- [ ] `G4-04` Nhận câu "Tóm tắt các khiếu nại chưa xử lý trong 24 giờ qua" → trạng thái pending/processing/waiting_customer và **được tạo trong 24 giờ gần nhất** (theo cách định nghĩa này). Nếu hỏi "tồn đọng quá 24 giờ", phải có nhánh lọc **cũ hơn 24 giờ**, không sử dụng cùng điều kiện.
- [ ] `G4-05` Các câu "lịch hẹn hôm nay/ngày mai" trả đúng múi giờ Việt Nam, trạng thái và số lượng; không lẫn số dòng hiển thị với tổng số DB.
- [ ] `G4-06` Sử dụng cột cần thiết thay cho `select('*')` trên bảng rộng; kiểm tra index theo query thực tế và đo latency staging.
- [ ] `G4-07` Không bịa số liệu khi Supabase lỗi. API trả trạng thái lỗi cụ thể, UI gợi ý tra cứu màn hình gốc khi có quyền.
- [ ] `G4-08` Mỗi fast-path **tự kiểm quyền** `inventory.read`, `ticket.read`, `appointment.read` và phạm vi OWN/BRANCH/ALL, kể cả khi bỏ qua function calling của Gemini; chưa có ma trận RBAC thật thì phải thống nhất với kế hoạch phân quyền 8 phân hệ.
- [ ] `G4-09` Kiểm tra đặc tả schema của `inventory`, `sales_order`, `support_ticket` và mối quan hệ thật trước khi merge SQL; không giả định `minimum_stock` hoặc `branch_id` luôn tồn tại.
- [ ] `G4-10` Rà lỗi Markdown injection: dữ liệu title/note từ DB phải được escape/sanitize khi đưa vào bảng Markdown/HTML của Copilot.

### Test GĐ4

- [ ] `G4-T01` Seed staging stock `[0,4,5,10]` → hỏi "dưới 5" chỉ có 0 và 4; không gọi API Gemini.
- [ ] `G4-T02` Seed hơn 20 sản phẩm, số khớp vượt 20 → tổng đếm và phân trang đúng, không bỏ sót sau LIMIT.
- [ ] `G4-T03` Tạo ticket trong 24 giờ và ticket quá 24 giờ → hai cách hỏi cho hai nhóm đúng.
- [ ] `G4-T04` Tắt AI theo feature flag → fast-path vẫn hoạt động nếu backend/DB bình thường.
- [ ] `G4-T05` Tài khoản không có quyền kho/ticket → 403, không có dữ liệu trong body/log; kiểm tra thêm giới hạn chi nhánh.

**Điều kiện sang GĐ5:** [ ] Fast-path trả số thật, đúng quyền, không tạo Gemini request cho ba nhóm câu hỏi được hỗ trợ.

---

## GĐ5 — XỬ LÝ QUOTA GEMINI 429, TIMEOUT VÀ QUÁ TẢI

**Mục tiêu:** Khi AI quá tải, hệ thống báo rõ trạng thái, không gọi lặp làm nặng hơn; chức năng DB nhanh không bị khóa chung.

**File:** backend `chat.js`, frontend `tab-chatbot-copilot.js`, badge trạng thái trong `chatbot.html`; mã **CP-01, CP-08**.

- [ ] `G5-01` Xác nhận từ ảnh: Gemini API trả `429 Too Many Requests` do hạn mức dự án; ảnh cho thấy mức free-tier **20 requests/ngày** cho `gemini-2.5-flash` tại thời điểm đó. Kiểm tra quota hiện tại trong Google AI Studio/console; không suy ra con số này luôn cố định.
- [ ] `G5-02` Trả HTTP status thật: `429` quota/rate-limit, `401/403` auth/quyền, `400` input, `500/503` lỗi dịch vụ; kèm `code`, `reply` ngắn **không lộ raw SDK exception**.
- [ ] `G5-03` Khi quota hết, **dừng retry hoặc retry có giới hạn theo `Retry-After`/loại lỗi**, tuyệt đối không xoay key vô hạn với kỳ vọng nhân hạn mức trong cùng project.
- [ ] `G5-04` Có timeout/deadline hợp lý cho call Gemini; huỷ request khi hết hạn nếu SDK hỗ trợ; retry chỉ với lỗi thoáng qua và budget chung, tránh 8 lần/gửi.
- [ ] `G5-05` Rate limit theo tài khoản và giới hạn concurrency ở backend; nhận thức bộ đếm trong bộ nhớ chỉ đúng cho **một instance**, nếu nhiều instance cần Redis/central limiter.
- [ ] `G5-06` Giới hạn độ dài câu hỏi, lịch sử ngữ cảnh và số vòng tool-call; không gửi toàn bộ phiên dài mỗi lần. Tóm tắt lịch sử khi cần, không gửi tin failed vào AI.
- [ ] `G5-07` Cập nhật badge `copilotStatusBadge` theo trạng thái: `Sẵn sàng`, `Đang xử lý`, `Hết hạn mức AI`, `Chưa đồng bộ lịch sử`, `Mất kết nối`.
- [ ] `G5-08` Có feature flag để **tắt AI tự do nhưng giữ fast-path SQL**, tiện giảm tải/rollback khi upstream lỗi.
- [ ] `G5-09` Khi bắt buộc dùng câu hỏi sáng tạo/suy luận, chỉ có lựa chọn: chờ quota reset hoặc cấu hình gói/giới hạn phù hợp; **không bịa câu trả lời để giả thành công**.
- [ ] `G5-10` Ghi log an toàn: request ID, actor ID mã hóa/ẩn bớt, status, loại router, thời gian DB/AI, số lần retry, có/không lưu lịch sử; **không log key/token/toàn văn dữ liệu nhạy cảm**.

### Test GĐ5

- [ ] `G5-T01` Mock Gemini 429 → UI nói "Hết hạn mức AI", không lộ `generativelanguage.googleapis.com` stack trace; số lần retry không tăng vô hạn.
- [ ] `G5-T02` Hỏi tồn kho/ticket khi Gemini 429 → vẫn có kết quả nếu DB khỏe và tài khoản có quyền.
- [ ] `G5-T03` 10–20 request đồng thời trong môi trường mock/staging → vượt giới hạn trả 429 sớm, không tạo hàng chục call Gemini; không dùng quota free thật để stress test.
- [ ] `G5-T04` Tắt AI qua feature flag → không gọi Gemini; bật lại sau kiểm tra quyền/cấu hình.

**Điều kiện sang GĐ6:** [ ] Không còn retry storm, không lộ lỗi nội bộ, có trạng thái khi quota cạn và có đường tra cứu SQL trực tiếp.

---

## GĐ6 — KIỂM THỬ TÍCH HỢP + HỒI QUY + BẢO MẬT

**Mục tiêu:** Không chỉ PASS cú pháp hoặc mock; xác nhận hoạt động thật và không phá Trực chat CSKH / điều hướng Admin.

### Checklist kỹ thuật và E2E

- [ ] `G6-01` Kiểm tra cú pháp và test mock trong thư mục bản sửa (là bước sàng lọc, không thay thế E2E):

  ```bash
  node --check chat.js
  node --check tab-chatbot-copilot.js
  node test_patch_mock.js
  ```

- [ ] `G6-02` Kiểm tra HTML/CSS/JS đã nạp đúng bản mới (cache-busting), không trùng script, không lỗi DOM id `copilotStatusBadge`, `copilotSessionsList`, `copilotMessagesArea`.
- [ ] `G6-03` Thực hiện tất cả `G2-T01..T07`, `G3-T01..T04`, `G4-T01..T05`, `G5-T01..T04` trên staging; ghi bằng chứng PASS/FAIL từng test.
- [ ] `G6-04` Dùng hai tài khoản staff A/B: thử GET/CLEAR session của nhau, giả `sessionId`, bỏ Authorization → phải bị chặn.
- [ ] `G6-05` Test khi mất mạng giữa gửi tin và lưu DB; khi refresh, không xóa dữ liệu mới chưa đồng bộ; không tự tạo bản ghi trùng vô hạn.
- [ ] `G6-06` Test title/message có ký tự đặc biệt/HTML, Markdown table và nội dung dài → không XSS, không làm vỡ giao diện.
- [ ] `G6-07` Test tương thích 3 subtab `Trực chat`, `Trợ lý AI`, `Quy định`; chuyển tab liên tục không mất sự kiện, listener không nhân đôi.
- [ ] `G6-08` Test Trực chat: nhận tin mới realtime, tiếp nhận/trả bot, SLA, đính kèm, chuyển ticket; **không** được ảnh hưởng vì thay CSS chung.
- [ ] `G6-09` Xác minh API chỉ cho phép truy cập dữ liệu khách/ticket/kho trong phạm vi staff và chi nhánh; service-role key không xuất hiện trong bundle client.
- [ ] `G6-10` So sánh số request, latency, tỷ lệ 429/5xx với GĐ0; không tự tuyên bố "nhanh hơn N%" khi chưa đo.
- [ ] `G6-11` QA ghi bảng test: Mã test — môi trường — tài khoản quyền — input — expected — actual — ảnh/log — PASS/FAIL — người xác nhận.

**Điều kiện sang GĐ7 (GO/NO-GO):** [ ] Không còn lỗi P0/P1 chưa xử lý ở phạm vi Copilot; test xác thực/không rò dữ liệu/tái tải phiên/cuộn/429 đều PASS. Nếu FAIL, **không deploy production**.

---

## GĐ7 — TRIỂN KHAI AN TOÀN VÀ THEO DÕI SAU DEPLOY

**Thứ tự đề xuất:** Backend trước → verify API → đồng bộ HTML/CSS/Copilot JS → hard refresh → smoke test → phát hành có kiểm soát.

- [ ] `G7-01` Tag/ghi commit bản trước sửa để rollback; chụp snapshot schema và xác nhận không có migration phá dữ liệu.
- [ ] `G7-02` Triển khai backend `chat.js` trên staging; gọi trực tiếp action GET/CLEAR với JWT staff thật; kiểm tra CORS/cookie/header nếu có.
- [ ] `G7-03` Áp dụng **đồng bộ** `chatbot.html`, `chatbot.css`, `tab-chatbot-copilot.js` từ PR đã review; không thay từng file khiến DOM/CSS/JS lệch nhau.
- [ ] `G7-04` Hard-refresh / invalidation cache của asset JS/CSS; kiểm tra browser Network không nạp bản cũ.
- [ ] `G7-05` QA chạy smoke: mở Copilot → tạo phiên → hỏi SQL đơn giản → F5 → chuyển phiên → xóa phiên → test cuộn → mô phỏng Gemini 429.
- [ ] `G7-06` Đưa lên production theo rollout nhỏ/canary nếu có, theo dõi 401/403/429/500/503, DB write failures, thời gian phản hồi, request trùng và lỗi JS.
- [ ] `G7-07` Nếu số lỗi tăng mạnh, **rollback về commit gốc** và/hoặc tắt `copilot_ai_enabled` (nếu flag đã tích hợp đúng); không xóa dữ liệu lịch sử mới để rollback frontend.
- [ ] `G7-08` Ghi lại phiên bản phát hành, người duyệt, kết quả smoke và phát hiện tồn đọng; mới đánh dấu xong kế hoạch.

**Điều kiện kết thúc:** [ ] Chat lưu/mở/xóa đúng, 429 có thông báo dễ hiểu, truy vấn nhanh không gọi Gemini, cuộn chat đúng; không phát sinh lỗi quyền và không làm hỏng Trực chat.

---

## GĐ8 — ĐỢT TIẾP THEO (KHÔNG CHẶN HOTFIX COPILOT)

Các việc này nằm trong báo cáo audit Chatbot tổng thể, **không trộn vào PR hotfix** nếu chưa có yêu cầu:

- [ ] `G8-01` Tối ưu `chatbot(2).js` / orchestrator: không tự refresh Inbox quá thường xuyên; debounce realtime, tránh chạy nhiều request đồng thời.
- [ ] `G8-02` Trực chat: tải summary trước, tin nhắn theo conversation/pagination, không join `chat_message(*)` lịch sử dài hoặc tải toàn bộ thông tin khách ở mỗi event.
- [ ] `G8-03` Realtime subscribe một lần cho một `conversationId`, chỉ đổi channel khi thực sự chuyển phòng.
- [ ] `G8-04` Chuyển ảnh chat dạng base64 khỏi `chat_message.content` sang Supabase Storage và lưu link/metadata được bảo vệ; thiết kế migration để không mất ảnh cũ.
- [ ] `G8-05` Thay SDK Gemini legacy và tối ưu RAG sau khi đã có biểu đồ latency/usage, không đổi SDK cùng PR fix session.
- [ ] `G8-06` Thiết kế thống nhất RBAC với **kế hoạch phân quyền 8 phân hệ Admin**; không tự viết hai hệ phân quyền khác nhau cho Copilot và Admin.

---

## MA TRẬN NGHIỆM THU CUỐI CÙNG (KÝ XÁC NHẬN)

| ID | Kịch bản chủ chốt | Phải đạt | Kết quả |
|---|---|---|---|
| AC-01 | AI trả lời thành công, F5 | Giữ toàn bộ tin; server và sidebar khớp | [ ] |
| AC-02 | Gemini quota 429 | Không mất câu hỏi, không hiện raw SDK exception, không retry vô hạn | [ ] |
| AC-03 | Chuyển A↔B khi request A chưa xong | Response không ghép sai phiên | [ ] |
| AC-04 | GET/CLEAR session với staff khác | Không truy cập/xóa dữ liệu trái quyền | [ ] |
| AC-05 | DB history ngắt/thiếu bảng | Hiện lỗi lưu rõ ràng, không tạo thông báo thành công giả | [ ] |
| AC-06 | Truy vấn stock <5 | Chỉ 0–4, trả dữ liệu thật, không gọi Gemini, count đúng | [ ] |
| AC-07 | Ticket "trong 24 giờ" vs "quá 24 giờ" | Hai kết quả đúng điều kiện, không nhầm khái niệm | [ ] |
| AC-08 | 20+ tin và bảng dài | Chỉ nội dung chat cuộn; input luôn trong tầm nhìn | [ ] |
| AC-09 | Thu nhỏ/mobile | Không đè nút/không mất thao tác | [ ] |
| AC-10 | Trực chat + Quy định | Không phát sinh regression sau đổi HTML/CSS chung | [ ] |
| AC-11 | Role/branch restrictions | Tài khoản ít quyền không đọc dữ liệu quản trị | [ ] |
| AC-12 | Đổi người dùng cùng trình duyệt | Không thấy local cache/history của người trước | [ ] |

**Phê duyệt:** Backend ________ | Frontend ________ | DBA/Security ________ | QA ________ | Release ________  
**Ngày kiểm thử thật:** __________  
**Môi trường:** __________  
**Commit/PR cuối:** __________  
**Kết luận:** `GO / NO-GO` __________

---

## DANH MỤC FILE / CÔNG VIỆC GIAO NHÓM

| Thành phần | File nguồn nhận được | File triển khai tương ứng | Giai đoạn |
|---|---|---|---|
| API Gemini + truy vấn DB + history | `chat(1).js` | `chat.js` tại backend (xác minh path thực tế) | GĐ1, GĐ2, GĐ4, GĐ5 |
| Controller Inbox/chatbot | `chatbot(2).js` | `chatbot.js` frontend | GĐ6, GĐ8 |
| UI logic Copilot/session | `tab-chatbot-copilot(2).js` | `subtabs/tab-chatbot-copilot.js` | GĐ2, GĐ5 |
| UI logic Trực chat | `tab-chatbot-live(2).js` | `subtabs/tab-chatbot-live.js` | GĐ6, GĐ8 |
| Chatbot layout | `chatbot(1).html` | `chatbot.html` | GĐ3, GĐ5 |
| Chatbot styles | `chatbot(1).css` | `chatbot.css` | GĐ3 |
| Routing & xác thực (chưa được cung cấp) | Router Express, `staff_auth.js`, `chat_config.js` | Kiểm tra trong repo thật, không đoán | GĐ1, GĐ5 |
| Supabase history schema | `DB_DIAGNOSTIC_OPTIONAL.sql` | SQL Editor staging; chỉ DDL sau review | GĐ1 |
| Bộ hotfix tham khảo | `PAWPAL_COPILOT_BAN_SUA_DE_XUAT.zip` | Đọc `README.md`, `PATCH.diff`, test mock trước khi cherry-pick | GĐ0–GĐ6 |

## NHỮNG ĐIỀU TUYỆT ĐỐI KHÔNG LÀM

- Không coi `node --check` / mock PASS là đã sửa thành công trên website.
- Không tăng số lần retry hoặc xoay thêm API key cùng project để chữa quota 429.
- Không để frontend tự quyết định `staff_id`, `role`, quyền đọc ticket/kho hoặc sử dụng `local:` như token hợp lệ.
- Không xoá key cũ/localStorage hoặc bảng history trước khi xác minh dữ liệu thuộc người nào và có backup.
- Không gộp PR sửa toàn bộ 8 phân hệ Admin, chuyển SDK, thay RLS và Copilot UI cùng một lúc.
- Không dùng dữ liệu khách hàng thật trong ảnh chụp log chia sẻ hoặc test tải.

**Tài liệu đối chiếu:** `PAWPAL_COPILOT_SUA_LOI_PHIEN_CHAT_429_SCROLL.md` (giải thích 10 lỗi CP-01…CP-10), `PAWPAL_CHATBOT_AUDIT_QUA_TAI_VA_CACH_SUA.md` (audit hiệu năng, bảo mật rộng hơn), `PAWPAL_COPILOT_BAN_SUA_DE_XUAT.zip` (đề xuất code, **chưa deploy**).
