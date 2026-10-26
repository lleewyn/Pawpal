# PAWPAL ADMIN — CHECKLIST NÂNG CẤP NGHIỆP VỤ CHATBOT

**Phiên bản:** 2.1 — cập nhật tiến độ 25/10/2026  
**Phạm vi:** `Admin > Chatbot > Trực chat / Trợ lý AI / Quy định`  
**Mục tiêu:** Biến Chatbot thành trợ lý vận hành đáng tin cậy: xử lý ca CSKH đúng quy trình; Copilot trả lời đúng CSDL và gợi ý hành động hữu ích; bảo vệ nhân viên khỏi nội dung công kích; quản trị chính sách có kiểm soát; giữ tốc độ và tiết kiệm tài nguyên.  
**Trạng thái:** **ĐÃ THỰC HIỆN MỘT PHẦN — chưa nghiệm thu toàn bộ.** Tiến độ cụ thể, chức năng AI và bằng chứng ngày 25/10 xem [docs/chatbot/README.md](docs/chatbot/README.md), [checklist nghiệp vụ](docs/chatbot/checklist-nghiep-vu.md) và [test evidence](docs/chatbot/test-evidence.md).

**Cách đọc:** `[x]` là đã kiểm chứng trong phạm vi ghi kèm; `[ ]` có ghi **Một phần** là đã có thay đổi nhưng chưa đủ điều kiện đóng mục; các mục còn lại chưa được xác nhận đạt. PASS local/SQL không đồng nghĩa đã nghiệm thu trên website đang deploy.

### Tiến độ hiện tại

- **Đã áp dụng Cloud:** 4 RPC tra cứu, giới hạn ngữ cảnh và kiểm tra tặng điểm; fixture kiểm thử đã hoàn tác.
- **Đã sửa local, chưa deploy:** API Copilot, giao diện gửi/thử lại, chọn ca và các guard modal.
- **Đã kiểm tra:** 40 câu ý định/ngày tháng; UI offline; SQL oracle lịch Spa/tồn kho/khiếu nại; phân trang/cache/realtime regression.
- **Chưa nghiệm thu:** Gemini thật, toàn bộ T01–T30, các RPC chat cũ, CRUD Rules đầy đủ, tải đồng thời và responsive đầy đủ. Gate 0–3 chưa đóng toàn bộ.
- **Tài nguyên:** không truy vấn Supabase Logs, không stress-test Cloud Free; câu hỏi số liệu không gọi Gemini hoặc tải lịch sử Copilot.

> **Quan trọng:** Đây là nâng cấp **NGHIỆP VỤ + AN TOÀN + UX**, không phải chỉ đổi màu giao diện. Giữ những tính năng đã hoạt động; sửa theo từng tab/từng tác vụ, kiểm thử rồi mới chuyển bước. Copilot giai đoạn này **chỉ đọc dữ liệu, phân tích, hướng dẫn, soạn nháp**; KHÔNG tự cộng điểm, bồi hoàn, chuyển ca, đặt lịch, sửa đơn, gửi tin, xóa dữ liệu hoặc phê duyệt. => *QUAN TRỌNG: KHÔNG LÀM QUÁ TẢI BĂNG THÔNG HAY BẮT CỨ THỨ GÌ BỊ Ở SUPABASE

## I. QUY TẮC BẮT BUỘC KHI CODE & BÀN GIAO

- [x] **FILE-01** — Giữ **một** HTML chính: `pages/admin/modules/chatbot/chatbot.html`. Đã kiểm tra nguồn và UI offline.
- [ ] **FILE-02** — Giữ **một** CSS chính: `pages/admin/modules/chatbot/chatbot.css`; sửa trực tiếp đúng file, **không tạo** `chatbot-v8.css`, `chatbot-fix.css`, `*-override.css`, `*-patch.css`.
- [x] **FILE-03** — Giữ **một** JS điều phối chính: `pages/admin/modules/chatbot/chatbot.js`.
- [x] **FILE-04** — Giữ JS từng tab tách biệt trong `pages/admin/modules/chatbot/subtabs/`: `tab-chatbot-live.js`, `tab-chatbot-copilot.js`, `tab-chatbot-rules.js`. Không gộp các file này.
- [ ] **FILE-05** — CSS đa dòng, selector/block riêng, mỗi property một dòng. **Không minify, không thêm inline style** cho phần UI mới. Chuyển style cũ phù hợp thành class CSS khi chạm đúng khu vực.
- [ ] **FILE-06** — Tuân thủ **Quiet Enterprise / Data-first**, lấy tab Khách hàng đã duyệt làm chuẩn: tiêu đề tiết chế; bảng, bộ lọc, button, modal, paging thống nhất; trạng thái bằng chữ thuần với màu ngữ nghĩa; không gradient/glass/glow/badge trang trí.
- [ ] **FILE-07** — Bảo toàn `id`, class hook, event handler, URL/hash, state, RPC, RLS, schema và logic đã nghiệm thu trừ khi đầu việc yêu cầu sửa cụ thể. Không dùng dữ liệu mock thay dữ liệu lỗi.
- [ ] **FILE-08** — Không sửa ngoài phân hệ Chatbot nếu chưa nêu rõ dependency và lý do. File backend (`api/admin-chat.js`, RPC SQL, moderation) là **dependency riêng**: chỉ sửa sau khi xác định đúng route đang chạy và đã sao lưu/kiểm tra quyền.
- [ ] **FILE-09** — Có checklist/changelog theo **từng tab, từng nút, từng modal, từng bảng và từng trạng thái lỗi**. Không gắn nhãn “hoàn tất” nếu chỉ qua kiểm tra cú pháp.
- [ ] **FILE-10** — Bàn giao code giữ **đúng cây thư mục production**, ZIP tổng + file `.md` hướng dẫn; không đặt bản thử/preview làm file chạy chính.

### Cây file dự kiến (không tự thêm CSS phụ)

```text
pages/admin/modules/chatbot/
├── chatbot.html
├── chatbot.css
├── chatbot.js
└── subtabs/
    ├── tab-chatbot-live.js
    ├── tab-chatbot-copilot.js
    └── tab-chatbot-rules.js

# Chỉ khi phải thay đổi backend và đã xác minh route active:
api/admin-chat.js
scripts/api/chat_moderation.js       # nếu thật sự được route active dùng
scripts/database/...                # migration/RPC mới, theo quy trình riêng; không chạy migration V1 cũ

# Tài liệu bàn giao (ngoài mã production):
docs/chatbot/README.md
docs/chatbot/checklist-nghiep-vu.md
docs/chatbot/test-evidence.md
```

## II. NHỮNG VẤN ĐỀ ĐÃ THẤY VÀ VIỆC CẦN XÁC MINH

| ID | Mức | Trạng thái bằng chứng | Vấn đề / rủi ro | Điều kiện đóng |
|---|---|---|---|---|
| F01 | P0 | **Đã sửa một phần, có test UI offline** | Đã bỏ fallback ca đầu trong helper và lúc nạp inbox; thêm đối chiếu ca ở modal. UI tặng điểm chặn chưa chọn ca và đổi ca A → B. | Còn E2E toàn bộ thao tác ghi và tài khoản thật; chưa đóng P0 tổng. |
| F02 | P1 | **Đã sửa code, chờ test SLA** | Đã bỏ nhánh `isHandover` tự trả `sla-done`; giữ deadline server đến trạng thái kết thúc. | Còn kiểm thử SLA trước/trong/sau nhận ca, refresh và chuyển giao. |
| F03 | P1 | **Thấy trong JS** | `btnAdminChatAttach` được `disabled=true`, tiêu đề “Chưa triển khai lưu tệp”; mã xem trước ảnh chưa đồng nghĩa có đường gửi an toàn. | Quyết định rõ: triển khai private upload hoặc giữ disabled/ẩn có giải thích; không quảng cáo đã gửi được ảnh. |
| F04 | P1 | **PASS regression local** | Baseline hiện tại đã phân trang 10 phiên/30 tin, không còn vòng offset 200. Đợt này bỏ tải lại history sau mỗi lần gửi. | Còn xác minh API/giao diện sau deploy; không ghi nhận phân trang là chức năng mới của đợt này. |
| F05 | P1 | **PASS UI 503, còn một phần** | Giữ câu hỏi và requestId khi lỗi; không tạo dòng lịch sử giả; retry thành công không tải lại toàn lịch sử. | Còn 429, timeout và mất mạng thật. |
| F06 | P1 | **PASS init ×10 offline** | Guard listener hiện có được giữ; không tái hiện trùng modal ở bài test init lặp. | Còn chuỗi chuyển đủ 3 tab ×10 và đo toàn bộ ticker/channel. |
| F07 | P1 | **PASS planner/formatter/SQL oracle** | Đã dùng RPC có tổng chính xác, tên/SKU/mã nghiệp vụ; lịch nhiều dịch vụ không đếm đôi. Ba truy vấn thật khớp oracle. | Còn E2E API/giao diện sau deploy. |
| F08 | P0 | **Kiểm chứng một phần ở DB** | RPC mới `adjust_admin_chat_points` kiểm tra actor/ca/phiên bản/policy/hạn mức/requestId; có SQL test hoàn tác. | Các RPC chat cũ, raw audit và toàn bộ ma trận quyền vẫn cần test trực tiếp. |
| F09 | P1 | **Đã đối chiếu nguồn; chưa xác nhận bản deploy** | Frontend gọi `/api/admin-chat`; nguồn local đã bỏ sample toàn bảng, dùng auth staff và RPC facts. Route Cloud trả 401 khi chưa đăng nhập. | 401 không chứng minh mã deploy trùng local; cần kiểm tra sau triển khai. |
| F10 | P2 | **Đã sửa một phần** | Bỏ typewriter; chuyển style vùng Copilot đã chạm sang CSS class. | Còn CSS phụ cũ `chatbot-v8.css` và rà layout toàn bộ tab. |

> **P0:** Phải giải quyết trước khi triển khai lên hệ thống có dữ liệu thật. **P1:** Luồng nghiệp vụ cốt lõi. **P2:** UX/hiệu năng/quản trị nâng cao. **P3:** Hoàn thiện về sau. “Thấy trong JS” là kết quả đọc tĩnh file đã gửi, **không phải** chứng minh bug runtime hoặc đã sửa thành công.

## III. GIAI ĐOẠN 0 — BASELINE, CSDL VÀ HỢP ĐỒNG NGHIỆP VỤ (P0)

- [ ] **BASE-01** — Ghi rõ commit SHA, branch, ngày, URL của môi trường local / test / Cloud; phân biệt code chạy với ZIP giao diện.
- [ ] **BASE-02** — Xác định `api/admin-chat.js` và các route/RPC **đang active** (đối chiếu `server.js`, `vercel.json` nếu có). Không sửa `scripts/api/chat.js` cũ mà tưởng hệ thống chính được cập nhật.
- [x] **BASE-03** — Sao lưu schema, grants, RLS policies, bodies của RPC liên quan và test dữ liệu mẫu; lên rollback plan cho mỗi PR. Đã sao lưu metadata/RPC liên quan vào thư mục riêng; vị trí và giới hạn rollback ghi trong README. Chưa diễn tập khôi phục toàn bộ đợt.
- [ ] **BASE-04** — Đối chiếu schema Cloud thực tế, không suy cấu trúc từ V1: `customer`, `customer_profile`, `customer_phone`, `customer_point_balance`, `customer_membership`, `pet_profile`, `appointment`, `appointment_item`, `service`, `service_category`, `inventory`, `product_variant`, `product`, `support_ticket`, `chat_conversation`, `chat_message`, `admin_copilot_history` và các bảng rules có mặt.
- [ ] **BASE-05** — Lập bản đồ: **ý định người dùng → bảng/view → join → điều kiện → quyền → RPC/endpoint → format câu trả lời**.
- [ ] **BASE-06** — Xác định status chuẩn và state transition của chat/ticket/appointment/appointment_item; không tự chế trạng thái khi chưa xem dữ liệu thật.
- [ ] **BASE-07** — Tạo bộ dữ liệu test ẩn danh: khách thành viên/guest, nhiều thú cưng, đơn/lịch, ca toxic, ticket, 2 nhân viên cạnh tranh nhận ca, lỗi mạng, lịch Spa nhiều dịch vụ và SKU tồn thấp.
- [x] **BASE-08** — Viết SQL oracle độc lập cho lịch Spa, tồn kho, ticket; snapshot expected trước khi nhờ AI diễn giải. Ba truy vấn Cloud chỉ đọc khớp oracle; có fixture lịch nhiều dịch vụ và mốc nửa đêm VN.
- [ ] **BASE-09** — Ghi baseline: số request DB/lần mở tab, tải lại inbox, mỗi câu hỏi Copilot, thời gian p50/p95, bytes/egress, kết quả API, lỗi permission.
- [ ] **BASE-10** — Không chạy migration cũ, không thêm bảng/RPC/index chỉ vì checklist đề xuất; chỉ tạo sau review schema, quyền, migration và rollback.

**Gate 0:** Có sơ đồ route active, ma trận quyền, schema thực, SQL oracle, dữ liệu test và đường rollback. Không đạt thì dừng ở giai đoạn thiết kế.

## IV. GIAI ĐOẠN 1 — TRỰC CHAT CSKH (LIVE)

**File chính:** `subtabs/tab-chatbot-live.js`, `chatbot.js`, `chatbot.html`, `chatbot.css`.  
**Dependency:** các RPC chat và bảng context/quyền; không đổi backend trước khi kiểm tra body hiện tại.

### 1.1. Inbox, tìm kiếm, phân loại ưu tiên (P1)

- [ ] **LIVE-01** — Kiểm tra ba bộ lọc **Xử lý ngay / Đang chat / Tất cả**: tiêu chí thành viên rõ, số đếm thống nhất với điều kiện server, không bỏ sót/đếm trùng.
- [ ] **LIVE-02** — Tìm tên/số điện thoại có debounce; clear search hoạt động; loading/empty/error khác nhau; query có quyền và phân trang server.
- [ ] **LIVE-03** — Một dòng hội thoại hiển thị tối thiểu: tên, snippet đã lọc, giờ cập nhật, bot hay người phụ trách, trạng thái, unread, SLA nếu còn áp dụng; không chất quá nhiều badge.
- [ ] **LIVE-04** — Phân biệt hội thoại **Bot xử lý / Chờ nhân viên / Nhân viên xử lý / Đã hoàn tất / Đã đóng** theo giá trị thực; không gắn nhãn AI suy đoán là trạng thái DB.
- [ ] **LIVE-05** — Cập nhật realtime chỉ thay ca cần cập nhật, không tạo nhiều channel/ticker khi đổi tab. Kiểm tra retry/polling khi đứt kết nối.
- [ ] **LIVE-06** — Chưa chọn ca thì timeline và sidebar có empty state và disable toàn bộ thao tác tác động khách.

### 1.2. Đúng đối tượng, tiếp nhận, gửi tin và chuyển giao (P0–P1)

- [ ] **LIVE-07 [P0]** — Loại bỏ fallback tự chọn `liveConversations[0]` cho **mọi thao tác ghi**. Tác vụ chỉ chạy khi có conversation ID do admin chủ động chọn, đúng customer ID, ca chưa bị đổi/đóng.
- [ ] **LIVE-08 [P0]** — Khi mở modal giữ `conversation_id`, `customer_id`, `expected_updated_at` và requestId đã chụp; khi bấm Xác nhận phải đối chiếu state thực/actor ở server. Nếu admin chọn ca khác, không ghi nhầm.
- [ ] **LIVE-09 [P0]** — State machine tiếp nhận/trả AI/hoàn tất theo RPC; trạng thái đóng không hiện nút hành động sai; actor không sở hữu ca không gửi được tin.
- [ ] **LIVE-10 [P0]** — Hai nhân viên đồng thời nhận ca: chỉ một thành công; người còn lại thấy conflict và refresh, không tạo nhiều chủ ca.
- [ ] **LIVE-11** — Gửi tin: chỉ một request, chống double-click, giữ nháp nếu lỗi; không xóa ô nhập hoặc hiện “đã gửi” trước phản hồi server xác nhận.
- [ ] **LIVE-12** — Ghi chú nội bộ không xuất sang kênh khách; chỉ lưu người có quyền; thử tải lại trang và kiểm chứng quyền xem.
- [ ] **LIVE-13** — Chuyển cấp: danh sách nhân viên đích hợp lệ; lưu lý do; khóa trùng request; hiển thị chủ ca mới và lịch sử chuyển, cập nhật realtime.
- [ ] **LIVE-14** — Kết thúc ca: kiểm tra điều kiện được phép, trạng thái sau đóng, dữ liệu khảo sát CSAT (không tạo 2 lượt khi retry), trường hợp khách nhắn lại.
- [ ] **LIVE-15** — `init`/event listener/modal chỉ bind một lần hoặc có cleanup. Chuyển 3 tab lặp 10 lần, một click chỉ tạo một request.

### 1.3. SLA và tóm tắt AI theo vụ việc (P1)

- [ ] **LIVE-16** — Xác định SLA bắt đầu/kết thúc/tạm dừng trong từng trạng thái, lấy mốc thời gian từ server. **Không** đánh dấu SLA đã hoàn tất chỉ vì ca có `isHandover`.
- [ ] **LIVE-17** — Kiểm tra timer qua refresh, takeover, release, chuyển cấp, kết thúc; cảnh báo nhẹ theo ngưỡng thay vì nhấp nháy/bão popup.
- [ ] **LIVE-18** — Nút “Mở tóm tắt AI”, “Xem thêm”, “Ẩn”, Vận đơn/Camera phải có hành vi thật có quyền; nếu không có backend thì disable/ẩn và ghi backlog, không để nút giả.
- [ ] **LIVE-19** — Tóm tắt ca theo cấu trúc: **Khách gặp vấn đề gì → bằng chứng/cần xác minh → mức khẩn → hành động hợp lệ tiếp theo**. Nhãn “AI tạo — cần kiểm tra”.
- [ ] **LIVE-20** — Gợi ý phản hồi từ FAQ/câu mẫu/policy theo ngữ cảnh; điền **bản nháp chỉnh sửa được** vào composer; KHÔNG tự gửi, KHÔNG hứa bồi hoàn/timeline chưa được duyệt.
- [ ] **LIVE-21** — “Thông tin khách” chỉ hiển thị hồ sơ đúng `customer_id` qua khóa authoritative, không đoán qua tên/số điện thoại; chỉ tải dữ liệu phù hợp quyền, ưu tiên pet/đơn/lịch/ticket liên quan ca.

### 1.4. Các tác vụ trong menu và modal (P0–P1)

- [ ] **LIVE-22 [P0]** — **Tặng Pawpoint**: đúng khách, đủ quyền, chính sách hạn mức/phê duyệt, idempotency, audit; modal đóng chỉ khi server thành công; balance lấy từ `customer_point_balance` chứ không suy qua hạng.
- [ ] **LIVE-23 [P0]** — **Tạo khiếu nại**: đúng khách/ca, chọn đúng order/booking theo record thực, phân loại/mức ưu tiên hợp lệ; không tạo trùng ticket khi retry; trả mã/liên kết ticket mới.
- [ ] **LIVE-24 [P0]** — **Chuyển nhân viên/quản lý**: người nhận được quyền nhận, có lý do, RPC cập nhật assigned staff, audit; xử lý conflict nếu ca đã thay đổi.
- [ ] **LIVE-25** — **Hoàn tất ca**: có xác nhận hợp lý, cập nhật state, ghi người hoàn tất; CSAT gửi tối đa một lần theo nghiệp vụ.
- [ ] **LIVE-26** — **Thư viện câu mẫu**: tìm theo title/shortcut/category, chỉ dùng mẫu `is_active=true`; click chèn vào input để kiểm tra và chỉnh sửa.
- [ ] **LIVE-27** — **Ảnh đính kèm**: chốt quyết định sản phẩm. Nếu hỗ trợ, upload qua private Storage/đường server kiểm tra MIME/dung lượng/quyền, URL ký hạn, metadata và dọn upload lỗi. Nếu chưa hỗ trợ, disable rõ ràng và loại bỏ bước giả.
- [ ] **LIVE-28** — Các modal phải có: validate, loading, success/error, đóng bằng X/Esc/overlay khi an toàn, focus/keyboard, dữ liệu không mất khi thất bại, và nút Xác nhận không chạy hai lần.

### 1.5. Toxic Shield — bảo vệ admin khi xử lý khách căng thẳng (P0–P1)

- [ ] **SAFE-01** — Phân biệt **công kích trực tiếp / phàn nàn hợp lệ / tình huống khẩn cấp / câu trích dẫn**. Không che từ ngữ làm mất nội dung khiếu nại thật.
- [ ] **SAFE-02** — Chỉ hiển thị bản đã lọc hoặc **tóm tắt trung tính** trong inbox/timeline/notification mặc định theo quyền; dữ liệu raw không lộ trong response/Network cho người không được phép.
- [ ] **SAFE-03 [P0]** — Mở nguyên văn phải được **RPC/server xác nhận quyền** và có audit actor/message/time; client localStorage chỉ hỗ trợ trình bày, không dùng làm quyết định bảo mật.
- [ ] **SAFE-04** — Giữ lại số tiền, mốc thời gian, mã đơn, loại dịch vụ, diễn biến thú cưng, yêu cầu giải quyết và bằng chứng quan trọng khi lọc.
- [ ] **SAFE-05** — Gợi ý 2–3 câu phản hồi tôn trọng, không đổ lỗi vô cớ; gợi ý chuyển cấp khi khách quá căng thẳng hoặc ca kéo dài; **không đánh giá sức khỏe tâm lý** nhân viên hay khách.
- [ ] **SAFE-06** — Chống cảnh báo dồn dập: gộp sự kiện lặp, giới hạn nhấp nháy/âm thanh, ưu tiên một cảnh báo có hành động cụ thể.
- [ ] **SAFE-07** — Test tiếng Việt có dấu/không dấu, chèn ký tự, phủ định, trích dẫn, lỗi false-positive và lỗi lọt từ khóa; có người đánh giá các trường hợp nhạy cảm.

**Gate 1:** `LIVE-07/08/09/10/22/23/24`, `SAFE-03` và các bài test tương ứng đạt; không còn tác vụ có thể ghi vào ca/khách sai. Mọi nút/modal trong tab Live có trạng thái được kiểm chứng.

## V. GIAI ĐOẠN 2 — TRỢ LÝ AI COPILOT

**File chính:** `subtabs/tab-chatbot-copilot.js`, `chatbot.html`, `chatbot.css`. **Nguồn sự thật của query và quyền:** API active `/api/admin-chat` và DB/RPC, không sửa AI chỉ ở frontend.

### 2.1. Chính xác dữ liệu và hiểu ý định (P0–P1)

- [x] **AI-01** — Tách 2 nhóm: **thống kê/truy vấn xác định bằng SQL hoặc RPC** và **diễn giải/soạn thảo bằng LLM**. Không cho LLM tự bịa số, tự sinh/chạy SQL tuỳ ý. PASS offline: metric chỉ gọi RPC, không gọi model/history.
- [ ] **AI-02** — Khai báo intent tối thiểu: `appointment.count/list`, `inventory.low_stock`, `ticket.open/priority`, `customer.lookup`, `order.lookup`, `draft.reply`, `workflow.guide`, `unknown`.
- [ ] **AI-03** — Ánh xạ filter: ngày (Asia/Ho_Chi_Minh), trạng thái, danh mục dịch vụ, SKU, tên/mã, user scope; khi thiếu điều kiện thì nêu giới hạn hoặc hỏi ngắn gọn, không đoán.
- [x] **AI-04 [P0]** — Câu “Hôm nay có bao nhiêu lịch Spa đang chờ phục vụ?”: lọc theo danh mục dịch vụ thật, `appointment` + `appointment_item` + `service` + `service_category`, trạng thái đã đối chiếu, đếm mỗi lịch một lần bằng `EXISTS` tương đương count distinct, ngày tại VN. PASS planner, SQL fixture và oracle Cloud; chưa E2E API đang deploy.
- [x] **AI-05 [P0]** — Câu “Có bao nhiêu SKU dưới ngưỡng?”: điều kiện `quantity_in_stock < minimum_stock` (không lẫn `<=`), join SKU + tên sản phẩm; đếm trên toàn bộ phạm vi rồi mới phân trang danh sách. PASS fixture có dưới/bằng/trên ngưỡng và oracle Cloud.
- [x] **AI-06** — Tổng số `N` phải là count đúng, danh sách đầu là `k/N`; không dùng `items.length` từ mẫu `limit(40/50)` làm tổng. PASS SQL fixture danh sách 20 và tổng ít nhất 25; formatter độc lập tổng 100 và danh sách mẫu.
- [x] **AI-07** — Trả tên/SKU/mã lịch/mã ticket dễ hiểu, không để UUID kỹ thuật làm nhãn chính. Không trộn “số SKU” với “số sản phẩm”. Đã đổi formatter cho các intent mới; kiểm tra offline, chưa nghiệm thu mọi dữ liệu thực tế.
- [ ] **AI-08** — Phân biệt **0 bản ghi xác thực / nguồn lỗi / 403 thiếu quyền / lấy chưa đủ dữ liệu / AI timeout**; không nói “không có” khi nguồn chưa truy vấn thành công.
- [ ] **AI-09** — Khi hỏi khiếu nại tồn, đơn chậm, tình hình ca chat: lọc đúng thời gian/trạng thái/quyền và đưa bước tiếp theo dựa trên chính sách thực.
- [ ] **AI-10** — Truy xuất tri thức RAG chỉ khi route active thực sự dùng: xác minh index, vector/model, quyền tài liệu, nguồn, phiên bản và ngày hiệu lực; có `document_embeddings` không chứng minh RAG hoạt động.

### 2.2. Hợp đồng phản hồi và chất lượng trả lời (P1)

- [ ] **AI-11** — Thiết kế response contract có `answer_type`, `summary`, `facts`, `source`, `scope`, `as_of`, `limitations`, `suggested_actions`, `request_id` **nếu backend hỗ trợ**; không yêu cầu frontend suy cấu trúc từ markdown LLM.
- [ ] **AI-12** — Hiển thị **kết luận đã xác minh → nguồn/khoảng thời gian → danh sách/giải thích → bước tiếp theo**; câu hỏi số liệu không mở đầu dài dòng.
- [ ] **AI-13** — Chỉ đề xuất các hành động admin được quyền thực hiện. Nếu có liên kết đến phân hệ khác, là nút điều hướng hợp lệ; **không tự ghi dữ liệu**.
- [ ] **AI-14** — Khi khách đang căng thẳng, câu trả lời cho admin cần tóm tắt trung tính, chỉ rõ bước cần kiểm tra và dự thảo phản hồi để người dùng sửa.
- [ ] **AI-15** — Giữ ranh giới prompt: nội dung khách/FAQ/tài liệu là dữ liệu tham khảo, không thể thay system policy hoặc nâng quyền; test prompt injection.
- [ ] **AI-16** — Escape/sanitize Markdown và URL (XSS, script/link độc hại), test bảng, list, code, unicode và nội dung dài.

### 2.3. Lịch sử, gửi tin, tốc độ và trải nghiệm (P1–P2)

- [x] **AI-17** — Giữ phân trang phiên/tin đã có; bỏ tải lại lịch sử sau mỗi câu trả lời. PASS regression: 10 phiên/trang, 30 tin/lần và UI không thêm GET lịch sử sau gửi. Mô tả vòng offset 200 từ audit cũ không còn đúng baseline hiện tại.
- [ ] **AI-18** — Tìm lịch sử, phân trang, chọn phiên, xóa phiên, tạo phiên mới; đúng actor, không thấy hoặc xóa phiên nhân viên khác.
- [ ] **AI-19** — Khi API lỗi, giữ câu hỏi và requestId; cho phép retry có kiểm soát; timeout/429/503 phân biệt; không ghi hoặc hiện câu trả lời phantom.
- [x] **AI-20** — Bỏ độ trễ “typewriter”; hiển thị câu trả lời ngay khi server xác nhận. PASS UI offline.
- [ ] **AI-21** — Rà nút “Đồng bộ RAG”: nếu thực chất chỉ tải lại lịch sử phải đặt nhãn đúng. Không tuyên bố đang đồng bộ kho tri thức khi không có nghiệp vụ đó.
- [ ] **AI-22** — Thông báo các trạng thái: đang tra DB / đang soạn / hoàn tất / thiếu quyền / mất kết nối / tạm hết quota. Không lạm dụng toast/animation.
- [ ] **AI-23** — Đo Gemini token/cost, DB calls, p95 latency, request size; có rate limit, timeout/retry hữu hạn và cache read-only phù hợp quyền.

**Gate 2:** Bộ oracle số liệu đúng; 0 UUID làm nhãn chính; không lộ session người khác; mất mạng vẫn giữ nháp; câu trả lời biết nêu nguồn/giới hạn; không có tác vụ ghi qua Copilot.

## VI. GIAI ĐOẠN 3 — QUY ĐỊNH / KHO TRI THỨC / BENCHMARK

**File chính:** `subtabs/tab-chatbot-rules.js`, `chatbot.html`, `chatbot.css`. **Nguồn:** `chatbot_knowledge_faq`, `chatbot_profanity_filter`, `chatbot_canned_response`, `chatbot_compensation_policy`, `chatbot_handover_rule`, `chatbot_scenario_matrix`.

### 3.1. FAQ (P1)

- [ ] **RULE-01** — Tìm, lọc danh mục/trạng thái, 10 dòng/trang, tổng đúng; loading/empty/error rõ.
- [ ] **RULE-02** — Thêm/sửa/bật tắt/xóa: validate không rỗng, độ dài, từ khóa, thứ tự ưu tiên, trùng câu hỏi; quyền và xác nhận thao tác nguy hiểm.
- [ ] **RULE-03** — Khi admin sửa cùng FAQ trên 2 phiên: dùng expected snapshot/concurrency, không ghi đè âm thầm; có thông báo reload.
- [ ] **RULE-04** — Phân biệt FAQ đã duyệt/đang hiệu lực/hết hạn nếu chính sách nguồn có trường tương ứng; kiểm tra tác động chatbot thực tế.

### 3.2. Bộ lọc ngôn từ / Toxic Shield (P1)

- [ ] **RULE-05** — Thêm/sửa/tạm tắt/xóa từ khóa; validate `severity`, `action`, `replacement` và dữ liệu trùng; không tắt đồng thời cả chính sách bảo vệ do thao tác nhầm.
- [ ] **RULE-06** — Test phrase có ngữ cảnh (công kích, phàn nàn hợp lệ, lời trích dẫn, tiếng Việt biến thể); đo false-positive và false-negative.
- [ ] **RULE-07** — Sau thay đổi rule, test thấy hiệu lực đúng trên luồng moderation active và không ảnh hưởng dữ liệu lịch sử không chủ đích.

### 3.3. Mẫu phản hồi (P1)

- [ ] **RULE-08** — Quản lý `shortcut/title/content/category/is_active` đầy đủ; tìm/lọc/phân trang; tránh shortcut trùng và mẫu câu chứa lời hứa sai chính sách.
- [ ] **RULE-09** — Tab Live chỉ hiển thị mẫu đang bật, chọn mẫu chèn bản nháp chỉnh sửa được; test đồng bộ thay đổi giữa 2 tab.

### 3.4. Hạn mức bồi hoàn & chuyển ca (P0–P1)

- [ ] **RULE-10** — Đối chiếu bảng **hạn mức bồi hoàn** với hành động thực `adjust_customer_points`, kiểm tra phê duyệt ở RPC/server; hiển thị rõ ai có quyền và ngưỡng nào.
- [ ] **RULE-11** — Đối chiếu **quy tắc chuyển ca** với `transfer_admin_chat`, vai trò người nhận, điều kiện và SLA. Không để UI hiển thị policy khác với RPC active.
- [ ] **RULE-12** — Xác định hai bảng này có quyền chỉnh sửa hay chỉ đọc. Nếu triển khai quản trị, phải có version, phê duyệt, audit, kiểm thử và rollback. **Không tự thêm nút sửa nếu backend chưa hỗ trợ**.
- [ ] **RULE-13** — Kiểm thử xung đột: hai policy cùng áp dụng, thiếu cấp phê duyệt, điểm cao hơn hạn, chuyển ca đến người không đủ quyền.

### 3.5. Ma trận kịch bản & quy chuẩn CSKH (P1–P2)

- [ ] **RULE-14** — Nút “Kiểm tra quy tắc” hiển thị tách `passed / failed / pending`; không quy toàn bộ thành “Đạt” nếu còn pending.
- [ ] **RULE-15** — Chạy benchmark đúng API, chỉ actor được phép, có chống trùng và log run/version/test time; không tạo tác dụng phụ lên đơn/điểm/chat.
- [ ] **RULE-16** — Bộ benchmark đủ nhóm: thông tin nghiệp vụ, ngữ cảnh ca, quyền, toxic, handover, phê duyệt, lỗi nguồn và prompt injection.
- [ ] **RULE-17** — Quy chuẩn văn hóa CSKH trong HTML: xác định tài liệu nào đang là nguồn chính thức; nếu chỉ tĩnh thì ghi rõ, không để nhân viên tưởng đã được đồng bộ sang AI.
- [ ] **RULE-18** — Rà từng bảng, từng filter, từng modal CRUD, pagination, action dropdown, keyboard, permissions theo chuẩn Admin; không chỉ sửa tab FAQ.

**Gate 3:** Thao tác FAQ/filter/canned được test end-to-end; thay đổi quy tắc có kiểm chứng hiệu lực; bồi hoàn/chuyển cấp theo quyền server; benchmark minh bạch passed/failed/pending.

## VII. GIAI ĐOẠN 4 — BẢO MẬT, TOÀN VẸN VÀ TỐI ƯU CHUNG

- [ ] **SEC-01 [P0]** — Backend kiểm tra JWT/session nhân viên, map `auth.users` ↔ `staff`, trạng thái hoạt động và quyền action; không tin `role`/`permissions` tự gửi từ browser.
- [ ] **SEC-02 [P0]** — Kiểm tra trực tiếp RLS/grants/RPC, gồm `read_admin_chat_raw`, `act_admin_chat`, `adjust_customer_points`, `create_chat_complaint`, `transfer_admin_chat`, `save_admin_chat_rule`, `get_admin_chat_handlers`.
- [ ] **SEC-03 [P0]** — Không lộ thông tin khách hoặc lịch sử Copilot của nhân viên khác qua sessionId, customerId, conversationId giả hoặc query tùy ý.
- [ ] **SEC-04 [P0]** — Mọi ghi nghiệp vụ có permission, validation, idempotency/requestId, transaction phù hợp và audit; retry không tạo 2 ticket, 2 lần tặng điểm, 2 CSAT.
- [ ] **SEC-05** — Chống XSS/HTML injection từ khách, tên thú cưng, FAQ, câu trả lời AI, Markdown và link trong rich card.
- [ ] **SEC-06** — Xem lại `chat_conversation.session_token` legacy/token guest; chỉ thay đổi sau khi hiểu dữ liệu thực, auth và rollback; không DROP mù.
- [ ] **PERF-01** — Dùng phân trang server cho inbox, message timeline, lịch sử Copilot và bảng rules; tránh query all rows theo vòng lặp khi mở tab.
- [ ] **PERF-02** — Realtime unsubscribe/cleanup đúng, không tạo lặp subscription/ticker sau chuyển tab và reload.
- [x] **PERF-03** — Không gọi Gemini cho các số đếm đã trả được bằng SQL; không lấy toàn bộ bảng catalog/FAQ/tồn kho để làm context cho mọi câu hỏi. PASS offline; ngữ cảnh giới hạn 6 tin lịch sử, 12 tin chat đã lọc, tối đa 5 FAQ liên quan.
- [ ] **PERF-04** — Theo dõi DB egress và quota; benchmark 1/5/20 phiên có kiểm soát trên môi trường test, không stress-test project miễn phí production.
- [ ] **PERF-05** — Không lưu token, password, raw toxic/PII không cần thiết trong localStorage/log/analytics. Kiểm tra secret key chỉ ở server.

## VIII. MA TRẬN TEST BẮT BUỘC (KHÔNG ĐÁNH DẤU QUA CHỈ VÌ CODE ĐÃ VIẾT)

Các kết quả bên dưới dẫn chiếu [test evidence](docs/chatbot/test-evidence.md). `Một phần` giữ ô trống; `PASS SQL/offline` chỉ xác nhận lớp đã chạy, không thay thế E2E bản deploy.

| Test ID | Tình huống | Kết quả kỳ vọng | Ưu tiên | Đạt |
|---|---|---|---|---|
| T01 | Không chọn hội thoại, bấm Tặng điểm/Tạo khiếu nại/Chuyển cấp | Không thực hiện; không lấy tự động ca đầu tiên | P0 | [ ] Một phần: tặng điểm và bỏ tự chọn ca PASS UI offline; còn các nút khác |
| T02 | Mở modal ở ca A, chuyển ca B trước khi xác nhận | Không ghi nhầm A/B; hiển thị trạng thái hợp lệ hoặc khóa modal | P0 | [ ] Một phần: modal điểm PASS UI offline; còn modal khác |
| T03 | Hai admin cùng tiếp nhận ca A | Một thành công, người còn lại conflict; state đúng | P0 | [ ] |
| T04 | Chat đã đóng vẫn thấy nút tiếp nhận | Vô hiệu hoặc đường reopen riêng theo quyền | P0 | [ ] |
| T05 | Nhận ca đang chạy SLA | Không mất timer nếu SLA chưa được đáp ứng | P1 | [ ] |
| T06 | Gửi tin khi mạng ngắt / RPC lỗi / bấm 2 lần | Không lặp tin, giữ nháp, thông báo chưa gửi | P1 | [ ] |
| T07 | Tạo ticket hai lần cùng requestId | Chỉ một ticket, gắn đúng khách/ca/giao dịch | P0 | [ ] |
| T08 | Tặng điểm vượt quyền/hạn mức | Server từ chối; balance không đổi | P0 | [ ] Một phần: SQL chặn actor không hợp lệ/vượt hạn/cần duyệt; chưa đủ ma trận staff và balance |
| T09 | Chuyển cấp đến nhân viên không đủ quyền | Server từ chối; chủ ca không thay đổi | P0 | [ ] |
| T10 | Chuyển tab Live ↔ Copilot ↔ Rules 10 lần | Một click một handler/RPC, không thêm ticker/subscription | P1 | [ ] Một phần: init Live ×10 PASS; chưa đủ chuỗi 3 tab |
| T11 | Tin toxic có mã đơn và yêu cầu hoàn tiền | Lọc lời công kích, vẫn hiểu đúng yêu cầu | P1 | [ ] |
| T12 | Nhân viên không quyền đọc nguyên văn | RPC từ chối và không trả raw trong Network | P0 | [ ] |
| T13 | Nhân viên có quyền mở nguyên văn | Có audit; đóng/mở lại mặc định an toàn | P0 | [ ] |
| T14 | Copilot hỏi số lịch Spa chờ phục vụ hôm nay | Đúng SQL oracle, đúng ngày VN, đúng trạng thái, count distinct lịch | P0 | [x] PASS planner offline + SQL oracle Cloud |
| T15 | Lịch gồm 2 `appointment_item` Spa | Chỉ đếm 1 appointment | P0 | [x] PASS SQL fixture hoàn tác |
| T16 | Copilot hỏi tồn kho **dưới ngưỡng** | Đếm đúng SKU có `<`, hiển thị tên/SKU và số liệu | P0 | [x] PASS formatter offline + SQL fixture/oracle |
| T17 | DB có 100 SKU thiếu nhưng list chỉ có 20 | Hiển thị tổng 100, danh sách 20/100 | P0 | [ ] Một phần: formatter tổng 100/list mẫu; SQL ít nhất 25/list 20, chưa đúng fixture 100 |
| T18 | DB lỗi / thiếu quyền | Không trả 0, không bịa số; hiển thị lỗi/403 rõ | P0 | [ ] Một phần: API/RPC quyền và UI 503 PASS; chưa đầy đủ lỗi DB qua API thật |
| T19 | Gemini 429/503/timeout sau khi bấm Gửi | Giữ câu hỏi; retry có giới hạn, không mất/lặp lịch sử | P1 | [ ] Một phần: 503 giả lập PASS; chưa gọi Gemini thật/429/timeout |
| T20 | Nhân viên A truy cập session Copilot của B | Không thể đọc/xóa history | P0 | [ ] Một phần: SQL context không nhận tin staff khác; còn xóa phiên và E2E |
| T21 | FAQ có prompt injection/HTML độc hại | Không nâng quyền, không chạy script | P0 | [ ] |
| T22 | FAQ/rules cùng sửa ở 2 tab | Phát hiện conflict, không ghi đè im lặng | P1 | [ ] |
| T23 | Benchmark còn pending | Tổng và từng nhóm hiện rõ pending | P1 | [ ] |
| T24 | Tác vụ nêu có ảnh đính kèm khi upload chưa triển khai | Nút disabled hoặc giải thích đúng; không báo gửi ảnh thành công | P1 | [ ] |
| T25 | Không có dữ liệu thật ở khoảng lọc | Trả “0” chỉ khi query thành công; empty state rõ | P1 | [ ] Một phần: Cloud tồn thấp = 0 khớp oracle; còn UI empty E2E |
| T26 | Giao diện ở 1366/1440/1920px, zoom 125% | Không tràn bảng, modal, toolbar, composer | P2 | [ ] |
| T27 | Truy vấn lịch qua mốc 00:00 ngày Việt Nam | Không sót/trùng ngày | P0 | [x] PASS planner/ngày VN + SQL fixture hai mốc nửa đêm |
| T28 | 5–20 phiên trên môi trường test | Không bùng query/egress hoặc subscribe không cleanup | P1 | [ ] |
| T29 | Cùng customer có nhiều pet/order/booking | Không liên kết nhầm ca, ticket, lịch hoặc mã đơn | P0 | [ ] |
| T30 | Copilot được yêu cầu tự hoàn tiền, cộng điểm, gửi tin | Chỉ tư vấn theo quy trình; không ghi dữ liệu | P0 | [x] PASS các câu yêu cầu cố định offline; model không có tool ghi nghiệp vụ. API vẫn lưu lịch sử hỏi/đáp |

### Bằng chứng tối thiểu cho mỗi test

- [ ] Ghi **môi trường/commit SHA** + vai trò test + dữ liệu mẫu (đã che PII) + bước tái hiện.
- [ ] Chụp kết quả **UI trước/sau**, response API/RPC đã che token, DB diff hoặc SQL oracle nếu có ghi/truy vấn số liệu.
- [ ] Ghi `Expected / Actual / Pass|Fail / người kiểm / ngày` cho từng test.
- [ ] Sau sửa lỗi P0/P1 phải chạy lại các test liên quan và một smoke test đủ cả **3 tab**.

## IX. THỨ TỰ THỰC HIỆN DẠNG PR — KHÔNG SỬA Ồ ẠT

| PR | Mức | Phạm vi thay đổi chính | Chặn nghiệm thu bởi |
|---|---|---|---|
| PR-00 | P0 | Xác nhận route/CSDL/RPC/quyền, test fixtures, baseline, rollback | BASE-01..10 |
| PR-01 | P0 | Kiểm tra đúng đối tượng ghi và quyền server; đóng fallback ca đầu, chống ghi nhầm/đúp | LIVE-07..10, SEC-01..04, T01..04/T07..09 |
| PR-02 | P1 | Live inbox, SLA, context, action buttons, modal binding, retry | LIVE-01..06, 11..28, T05..06/T10/T24 |
| PR-03 | P0/P1 | Toxic Shield, quyền raw, tóm tắt an toàn | SAFE-01..07, T11..13 |
| PR-04 | P0/P1 | API Copilot: SQL oracle Spa/tồn kho/ticket, source/scope/response contract | AI-01..16, T14..18/T27/T30 |
| PR-05 | P1/P2 | Copilot UI: session paging, recover draft, states, renderer | AI-17..23, T19..21 |
| PR-06 | P1 | Rules: FAQ/filter/canned, policy, benchmark, nguồn tri thức | RULE-01..18, T22..23 |
| PR-07 | P1/P2 | Performance/quota/realtime cleanup; CSS chính chuẩn từng tab | PERF-01..05, FILE-01..10, T26/T28 |
| PR-08 | P0 | Full regression, tài liệu, nghiệm thu, rollback thực tập, phát hành | T01..T30, Gate 0–3 và checklist bàn giao |

**Trong từng PR bắt buộc thực hiện vòng:** `Đọc code active → chọn đúng phạm vi → test tái hiện → sửa nhỏ → test unit/integration → test UI từng tab → so snapshot DB/Network → cập nhật MD → đóng PR`. Không cộng dồn nhiều lỗi mà chưa có test.

## X. CHẤT LƯỢNG & ĐIỀU KIỆN CHỐT HOÀN THÀNH

### KPI đề xuất để đo (không phải kết quả hiện tại)

| Trục | Mục tiêu nghiệm thu đề xuất | Phương pháp |
|---|---|---|
| Quyền / an toàn | **0 lỗ hổng P0**; 0 trường hợp ghi sai khách/ca; 0 dữ liệu lộ ngoài quyền | Ma trận RLS/RPC/Network và E2E |
| Tính chính xác | **100%** test định lượng có SQL oracle trả đúng số/filter | Bộ T14–T18/T27 + >=40 câu cố định |
| Toàn vẹn | **0** gửi trùng/tặng điểm trùng/ticket trùng do retry; 0 ca hỏng khi 2 người thao tác | T02–T10, DB diff |
| Chất lượng CSKH | >=80% tình huống có “vấn đề + hành động đúng tiếp theo” theo reviewer | 20–30 kịch bản ca thật đã ẩn danh |
| An toàn tâm lý | Không lộ nguyên văn cho staff thiếu quyền; lọc đúng mà vẫn giữ thông tin nghiệp vụ | 30 ca toxic/câu hợp lệ, reviewer CSKH |
| Hiệu năng | Đặt p95 mục tiêu ban đầu <=8 giây cho câu hỏi dữ liệu đơn giản, điều chỉnh theo baseline | 50–100 requests trên môi trường test |
| Quota / Egress | Không tăng request/bytes ngoài budget sau refactor; có so sánh trước/sau | Đếm request và dung lượng phản hồi từ Network/API; không truy vấn Supabase Logs |
| UX | 100% nút/tab/modal có trạng thái hoàn chỉnh, không nút giả; responsive desktop đạt | Checklist thủ công + screenshot regression |

### Checklist cuối cùng trước khi giao

- [ ] **DONE-01** — 3 tab và toàn bộ tab con Quy định được rà đầy đủ; không bỏ sót bảng/filter/modal/nút/empty/loading/error/permission.
- [ ] **DONE-02** — T01..T30 đã có **PASS thực tế**, không chỉ tick trong tài liệu; test fail có bug ID và người chịu trách nhiệm.
- [ ] **DONE-03** — 0 bug P0/P1 đang mở; quyền RPC được xác minh ở server, DB dữ liệu đúng.
- [ ] **DONE-04** — Frontend giữ cây file chuẩn, không thêm file CSS phụ/inline style mới; HTML IDs và event hooks không bị phá.
- [ ] **DONE-05** — So sánh số request DB, egress, latency và số lỗi trước/sau, chú ý Copilot history và realtime.
- [x] **DONE-06** — Có `README.md`, test evidence, changelog theo từng tab, hướng dẫn rollback và ghi rõ hạng mục **chưa triển khai**. Xem ba tài liệu trong `docs/chatbot/`; đây là bàn giao đợt hiện tại, chưa phải nghiệm thu toàn bộ.
- [ ] **DONE-07** — Đóng gói ZIP code đã chạy test, đúng tên file/đường dẫn; bàn giao tài liệu Markdown riêng, không dùng ảnh preview thay mã nguồn.

---

## XI. MẪU BÁO CÁO MỖI LẦN SỬA

```markdown
### PR-XX — [Tên đầu việc]
- Trạng thái: [ ] Chưa làm  [ ] Đang làm  [ ] Chờ test  [ ] PASS  [ ] BLOCKED
- Mức ưu tiên: P0 / P1 / P2
- Môi trường, commit trước/sau:
- Phạm vi file thay đổi:
- Lỗi/tình huống cần sửa:
- Vì sao xảy ra (root cause):
- Giải pháp (chỉ thay đổi đúng phạm vi):
- Tên API/RPC/schema liên quan (nếu có):
- Ảnh/Network/SQL trước và sau (đã che dữ liệu nhạy cảm):
- Test IDs đã PASS:
- Các chức năng khác đã regression test:
- Rủi ro còn lại:
- Rollback thực hiện thế nào:
- Người nghiệm thu / ngày:
```

### Việc cần làm tiếp theo sau đợt 25/10

1. Đóng phần còn lại của `PR-00/01`: quyền các RPC cũ, hai người cùng nhận ca, retry ticket, chuyển ca và raw audit. Chưa đánh dấu Gate 0/1 đạt.
2. Kiểm thử bản nháp Gemini thật với các ca đã ẩn danh; review nguồn, chính sách, prompt injection và chất lượng CSKH. Không dùng điểm số planner để suy ra chất lượng mô hình.
3. Hoàn thiện Rules CRUD/xung đột/benchmark, kiểm tra responsive và các trạng thái lỗi còn thiếu.
4. Xác minh cấu hình deploy và thực hiện E2E khi API/giao diện mới được triển khai; hiện chưa push/deploy.

### Các mục đã làm một phần nhưng chưa đánh dấu hoàn tất

| Mục | Đã có | Còn thiếu để đóng |
|---|---|---|
| FILE-02/05/09/10 | CSS chính, class mới, tài liệu và ZIP đợt hiện tại | Dọn CSS phụ cũ; rà toàn bộ style và tác vụ; ZIP hiện là bộ file cập nhật, không phải toàn bộ dự án |
| BASE-01/02/04/05/06 | SHA/nhánh/Cloud, nguồn route, đối chiếu schema và mapping cho intent mới | Chứng minh bản deploy, sơ đồ và state transition đầy đủ |
| BASE-07/09 | Fixture tồn kho/lịch/chat/điểm/context, 3 số đo phản hồi Cloud | Guest/multi-pet/concurrency đầy đủ; baseline p50/p95 và tổng egress |
| LIVE-06/07/08/22 | Bỏ chọn ca ngầm; disable thao tác; guard modal; RPC điểm có policy và test hoàn tác | E2E tất cả nút/modal, quyền tài khoản thật, kiểm tra balance/audit UI |
| LIVE-15/16 | Init ×10 offline; bỏ SLA hoàn tất giả khi handover | Chuyển đủ 3 tab ×10; kiểm tra toàn bộ timer và SLA server |
| AI-02/03/09/11/12 | Intent cố định, ngày VN, query tên/mã, nguồn/phạm vi/tổng và danh sách | Priority ticket, đơn chậm, mọi bộ lọc và contract/hành động gợi ý đầy đủ |
| AI-08/19/22 | Lỗi nguồn/quyền không thành 0; UI 503 giữ câu hỏi/requestId | Mọi trạng thái quota/timeout/mất mạng thật và thông báo phân biệt |
| AI-13/14/15 | Không có tool ghi cho model; prompt coi dữ liệu là nguồn không tin cậy; nhãn bản nháp | Review Gemini thật, quyền hành động gợi ý và injection end-to-end |
| AI-18, SEC-03 | Context cá nhân không đọc history của staff khác; paging theo actor | Xóa phiên người khác, mọi ID giả và E2E đầy đủ |
| RULE-10/13, SEC-04 | Server chặn điểm vượt hạn/cần duyệt; retry không cộng trùng | Xung đột policy, chuyển ca, ticket và CSAT retry |
| PERF-01/02, AI-23 | Regression phân trang/cache/realtime, giới hạn context và timeout | Đo tải đồng thời, tổng request/bytes, token/cost và p95 |
| DONE-07 | Có [ZIP đợt cập nhật](docs/deliverables/chatbot-business-2026-10-25.zip), giữ đường dẫn file | Chưa phải gói toàn dự án hoặc bản phát hành đã nghiệm thu; checklist trong ZIP là snapshot lúc đóng gói |

**Ưu tiên vẫn là tính đúng đắn, quyền và băng thông Supabase. Không mở thêm tác vụ AI tự ghi nghiệp vụ.**

**Nguồn xây dựng:** 7 file frontend Chatbot do người dùng gửi ngày 24–25/10/2026; tài liệu `PAWPAL_ADMIN_CHATBOT_MASTER_AUDIT_UPGRADE_CHECKLIST_2026-10-22.md` (bản audit trước). Các mục cần backend/RPC, migration hoặc runtime đều được đặt ở trạng thái cần kiểm chứng, không mặc định đã tồn tại hoặc đã sửa.
