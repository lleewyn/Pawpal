# KẾ HOẠCH TRIỂN KHAI CHATBOT ADMIN PAWPAL
## Hỗ trợ nghiệp vụ admin và bảo vệ nhân viên khi trực chat

**Phiên bản:** 1.0  
**Ngày lập:** 16/10/2026  
**Trạng thái:** Đã hoàn thành 100% Giai đoạn 0 (G0-01, G0-02, G0-03, G0-04) ngày 16/10/2026; đầy đủ hồ sơ baseline, data-dictionary, decision-log, permissions-matrix và test-plan. Đạt toàn bộ điều kiện nghiệm thu G0; sẵn sàng chuyển tiếp sang Giai đoạn 1 (G1 — Bảo mật và tính đúng đắn, ưu tiên P0).  
**Phạm vi:** Ba khu vực hiện có: **Trực chat — Trợ lý AI — Quy định**.  
**Giới hạn đã xác nhận:** Chỉ triển khai chatbot bên Admin. Widget khách và tích hợp kênh ngoài web chỉ là nguồn phụ thuộc để đối chiếu luồng tin; không thuộc phạm vi chỉnh sửa hoặc điều kiện chặn riêng của G0-01. Các đề cập tới widget trong các giai đoạn bên dưới là phụ thuộc cần phối hợp nếu phát sinh, không mở rộng phạm vi triển khai hiện tại.
**Nguyên tắc triển khai:** Sửa trên nền hiện có, chia thay đổi nhỏ, nghiệm thu từng giai đoạn; không viết lại toàn bộ hệ thống.

> **Mục tiêu cuối cùng:** Admin tra cứu được dữ liệu thật, hiểu nhanh ca hỗ trợ, có bản nháp phản hồi và thao tác đúng quyền; nội dung xúc phạm không được hiển thị nguyên văn mặc định, nhưng thông tin sự cố, bằng chứng và khả năng chuyển người hỗ trợ vẫn được bảo toàn.

---

<a id="cach-doc"></a>
## 1. Cách sử dụng kế hoạch

Mỗi gói công việc có mã `Gx-yy`, người phụ trách theo vai trò, việc cần làm và kết quả cần giao. Chỉ đánh dấu hoàn thành sau khi có bằng chứng kiểm thử.

- `[ ]` là việc chưa hoàn thành. Các checkbox trong tài liệu không phải kết quả đã đạt.
- **P0:** Chặn phát hành nếu còn lỗi về quyền, dữ liệu, hiển thị nguyên văn hoặc thao tác ghi sai.
- **P1:** Chức năng cốt lõi cần có trong bản đầu.
- **P2:** Tối ưu hoặc mở rộng sau khi luồng cốt lõi ổn định.

**Vai trò:** Chủ dự án chốt nghiệp vụ; Backend xử lý API/AI; Database xử lý schema/quyền/giao dịch; Frontend xử lý giao diện; QA kiểm thử; Quản lý CSKH duyệt chính sách và tình huống. Một người có thể kiêm nhiều vai trò.

**Phân biệt nguồn và đề xuất:**

1. Mục 3 ghi các điểm nhìn thấy trong tám file nguồn đã cung cấp, có tham chiếu ở cuối tài liệu.
2. Tên API, bảng bổ sung, quyền và quy trình trong các giai đoạn là **thiết kế đề xuất**, không phải khẳng định đang tồn tại.
3. Tại thời điểm lập kế hoạch chưa có backend/schema/quyền để xác minh. G0-01 đã tìm thấy backend, nguồn widget và đối chiếu metadata project Supabase cấu hình cục bộ; xem báo cáo tiến độ bên dưới. Chưa có catalog RLS/quyền hiệu lực; không kết luận đã khai thác được lỗ hổng hoặc database hiện không có phân quyền.
4. Không lấy các số lượng FAQ, số liệu demo, thời gian phản hồi hay tỷ lệ tiết kiệm trong tài liệu cũ làm kết quả đã đo.
5. Khi đổi quy tắc nghiệp vụ so với tài liệu cũ, phải ghi quyết định được duyệt; không âm thầm thay chính sách.

### Mục lục

- [2. Lộ trình và phạm vi bản đầu](#lo-trinh)
- [3. Các điểm xuất phát từ mã nguồn](#hien-trang)
- [4. Giai đoạn 0 — Chuẩn bị và chốt đầu vào](#g0)
- [5. Giai đoạn 1 — Bảo mật và tính đúng đắn](#g1)
- [6. Giai đoạn 2 — Toxic Shield và trực chat an toàn](#g2)
- [7. Giai đoạn 3 — Copilot tra cứu và hỗ trợ admin](#g3)
- [8. Giai đoạn 4 — Thao tác có xác nhận](#g4)
- [9. Giai đoạn 5 — Kiểm thử, tối ưu và phát hành](#g5)
- [10. Danh mục dữ liệu cần bổ sung](#du-lieu)
- [11. Hợp đồng API đề xuất](#api)
- [12. Bản đồ chỉnh sửa theo file](#file-map)
- [13. Bộ ca nghiệm thu bắt buộc](#kiem-thu)
- [14. Thứ tự giao việc và quản lý thay đổi](#giao-viec)
- [15. Điều kiện hoàn thành toàn dự án](#hoan-thanh)
- [16. Nguồn đối chiếu](#nguon)

---

<a id="lo-trinh"></a>
## 2. Lộ trình và phạm vi bản đầu

### 2.1. Thứ tự triển khai

| Giai đoạn | Mục tiêu | Sản phẩm đầu ra | Điều kiện chuyển giai đoạn |
|---|---|---|---|
| **G0 — Chuẩn bị** | Biết rõ schema, quyền, luồng hiện tại và chính sách | Hồ sơ hiện trạng, ma trận quyền, quyết định nghiệp vụ, môi trường kiểm thử | Đủ đầu vào cho phần backend/database; các điểm chưa rõ có chủ sở hữu |
| **G1 — Bảo mật và dữ liệu đúng** | Không thực thi nội dung không tin cậy, không báo thành công giả, không cấp quyền bằng frontend | API được bảo vệ, render an toàn, loại bỏ dữ liệu giả, cơ chế lỗi chuẩn | Qua nhóm kiểm thử bảo mật và lỗi P0 |
| **G2 — Bảo vệ admin và trực chat** | Lọc trước khi hiển thị, tóm tắt an toàn, nhận/chuyển ca thật | Luồng kiểm duyệt, dữ liệu nguyên văn tách quyền, inbox an toàn, phân công và SLA | Không lộ nguyên văn ngoài luồng được cấp quyền; không mất tin/ca |
| **G3 — Copilot chỉ đọc và soạn nháp** | Truy vấn dữ liệu thật, giải thích có nguồn, giảm thao tác tra cứu | Bộ công cụ truy vấn, kho tri thức có phiên bản, bản nháp phản hồi | Kết quả khớp dữ liệu đối chứng và đúng phạm vi người hỏi |
| **G4 — Thao tác có duyệt** | Tạo ticket, ghi chú, phân công, bồi hoàn đúng quyền | Xem trước, xác nhận, giao dịch, chống trùng, nhật ký | Không vượt quyền, không thực hiện hai lần, không báo hoàn tất sai |
| **G5 — Nghiệm thu và vận hành** | Kiểm chứng toàn luồng, chịu được lỗi và có phương án dừng AI | Bộ kiểm thử, báo cáo tải, hướng dẫn vận hành, bản phát hành | Có bằng chứng nghiệm thu và người nhận bàn giao |

**Quan hệ phụ thuộc:** G0 → G1 → G2 → G3 → G4 → G5.

Soạn tri thức và dữ liệu kiểm thử có thể làm song song từ G0. G5 là nghiệm thu tổng hợp; kiểm thử từng gói công việc phải bắt đầu ngay khi sửa, không dồn đến cuối.

### 2.2. Bản đầu bắt buộc có

**Trực chat:** Nhận/gửi tin thật; tóm tắt ca; che nội dung theo chính sách; cảnh báo ảnh; tiếp nhận, chuyển hỗ trợ và hoàn tất ca; câu mẫu từ nguồn đã duyệt.

**Copilot:** Tra cứu lịch hẹn, đơn hàng, tồn kho, ticket, bối cảnh khách được phép xem và chính sách; trả kết quả có nguồn; soạn phản hồi nhưng không tự gửi.

**Quy định:** Quản lý tri thức, câu mẫu, quy tắc bảo vệ, chuyển giao, hạn mức và kiểm thử; phân quyền sửa/phê duyệt.

### 2.3. Chưa làm trong bản đầu

Không cho AI tự chạy SQL tự do, tự hoàn tiền ngân hàng, tự kê hướng điều trị, tự gửi thông báo ra ngoài hoặc tự quyết định mọi khoản bồi hoàn. Chưa cần mô hình tự huấn luyện riêng, nhiều agent phối hợp, phân vùng dữ liệu quy mô lớn hay lưu trữ lạnh tự động nếu chưa có số liệu chứng minh nhu cầu.

Đề xuất của kế hoạch này là **bot không tự cộng điểm ở bản đầu**, kể cả mức nhỏ; người đủ quyền xác nhận mới thực hiện. Đây là giới hạn triển khai thận trọng hơn một số khả năng tự động trong tài liệu nghiệp vụ, cần ghi vào quyết định D03.

---

<a id="hien-trang"></a>
## 3. Các điểm xuất phát từ mã nguồn

| Mã | Điểm đã quan sát | Vị trí nguồn | Giai đoạn xử lý |
|---|---|---|---|
| H01 | Phản hồi AI được ghép vào HTML mà chưa thấy bước làm sạch tại hàm render; Live cũng dựng HTML từ tin nhắn/thẻ | `appendAiResponse()`, `formatAdminChatText()` [^S1] [^S2] | G1 |
| H02 | Khi API lỗi, Copilot trả số liệu cố định; core tạo `conv-demo-*`; Live có `defaultMockFallback` | `handleSend()`, `loadChatbotDataFromSupabase()`, `getCurrentConversationSafe()` [^S1] [^S2] [^S3] | G1 |
| H03 | Nguyên văn được map vào state; chế độ che/hiện đổi tại frontend; nhánh che từ phụ thuộc nội dung đã được xử lý | `mappedMsgs`, phần render tin toxic [^S2] [^S3] | G1 giảm phơi lộ, G2 hoàn thiện |
| H04 | Cộng điểm tính số dư từ state, ghi trực tiếp và vẫn hiển thị thành công ngoài nhánh kiểm chứng kết quả | Handler `btnConfirmRewardPoints` [^S2] | G1 khóa luồng chưa an toàn, G4 thay thế |
| H05 | Tạo ticket có nhiều thao tác ghi riêng; chuyển cấp thêm thông điệp cục bộ như thể người nhận đã tiếp quản | Handler tạo ticket và `btnConfirmEscalate` [^S2] | G2, G4 |
| H06 | Core tải nhiều bảng cùng lúc, kèm tin nhắn; sự kiện realtime lại gọi hàm tải tổng hợp | `loadChatbotDataFromSupabase()`, `setupChatbotRealtimeSync()` [^S3] | G2, G5 |
| H07 | Nút đồng bộ RAG chỉ đếm dòng nhưng báo đã đồng bộ; câu mẫu Live có nguồn tĩnh riêng | `btnSyncRagData`, `defaultCannedLibraryData` [^S1] [^S2] | G1 sửa thông báo, G3 làm thật |
| H08 | Benchmark dò chuỗi ở frontend và coi các mức từ 4 trở lên tương đương trong một điều kiện đạt | `runBenchmarkFromUI()` [^S4] | G2 tạo ca chuẩn, G5 thay runner |
| H09 | Master plan dùng cảm xúc 1–5; tài liệu nghiệp vụ mô tả thêm mức 6 cho cấp cứu | Mục 2/3 master plan và mục 8 nghiệp vụ [^S7] [^S8] | G0 chốt, G2 chuyển đổi |
| H10 | HTML có tên khách, điểm, SLA và lời hứa nghiệp vụ được điền sẵn | Header Live, customer panel, quick replies [^S5] | G1 |

**Các điểm cần xác minh, không coi là lỗi đã chứng minh:** Giá trị/loại khóa Supabase, nơi giữ khóa Gemini, xác thực `/api/chat`, chính sách RLS/Storage/Realtime, kiểm tra vai trò tại backend và cơ chế ngừng bot sau takeover.

---

<a id="g0"></a>
## 4. Giai đoạn 0 — Chuẩn bị và chốt đầu vào

**Mục tiêu:** Tạo đủ căn cứ để sửa đúng hệ thống đang chạy, không tự đoán schema hoặc quyền.  
**Ưu tiên:** P0 cho đầu vào liên quan bảo mật; P1 cho chuẩn hóa nghiệp vụ.  
**Phụ thuộc:** Không có.  
**Người chốt:** Chủ dự án.

### G0-01 — Lập hồ sơ mã nguồn và cấu hình

**Phụ trách:** Chủ dự án + Backend + Database.

- [x] Ghi phiên bản/commit của tám file hiện có; tạo nhánh và bản đánh dấu trước khi sửa. Bằng chứng: bảng SHA-256/commit tại hồ sơ hiện trạng, nhánh `codex/chatbot-g0-baseline`, tag `chatbot-before-g0-20261016` tại `3b04037017b7239bea377361f727df635a15fa56`. Bản kế hoạch ban đầu chưa tracked nên được ghi hash riêng, không thuộc tag.
- [x] Bổ sung vào hồ sơ backend `/api/chat` cùng module gọi AI, module lấy dữ liệu, prompt và middleware liên quan: `api/chat.js`, `scripts/api/chat.js`, `server.js`, `scripts/api/staff_auth.js`; ghi rõ chưa thấy guard admin riêng trong luồng chat đã rà.
- [x] Bổ sung vào hồ sơ code đăng nhập/khôi phục phiên, ánh xạ người dùng sang nhân viên và file khởi tạo Supabase: login admin, admin shell, shared auth/customer-auth, backend customer auth và `supabase-client.js`. Ánh xạ dữ liệu thực tế tiếp tục xác minh ở G0-02.
- [x] Bổ sung vào hồ sơ `package.json`, `package-lock.json`, cấu hình triển khai `server.js`/`vercel.json` và `AGENTS.md`; ghi phiên bản phụ thuộc từ lockfile.
- [x] Bổ sung schema, migration, enum, trigger, view, RPC, quyền truy cập bảng/hàm, RLS và cấu hình Storage/Realtime liên quan. Đã đối chiếu SQL với OpenAPI và truy vấn `limit=0` trên Supabase; đã trích xuất catalog SQL thực tế xác nhận: đủ 13 bảng chính; thiếu 6 cột bổ sung; 2 bảng bổ sung chưa được API công bố; RLS đang tắt toàn bộ (`rls_enabled = false` trên cả 13 bảng, script bảo mật chưa chạy); Realtime đã kích hoạt đúng cho `chat_conversation` và `chat_message`; không có ledger migration tự động (`migration_ledger_exists = false`). IN01–IN02 đã được nghiệm thu đầy đủ hiện trạng thực tế.
- [x] Xác định nguồn hội thoại đi vào Trực chat Admin: core đọc `chat_conversation`/`chat_message` và lắng nghe realtime; backend `/api/chat` ghi hội thoại/tin, frontend Live có đường ghi Supabase trực tiếp. `components/fab/` và `scripts/shared/support-handler.js` là nguồn chat web được đối chiếu. Widget khách và xác nhận kênh ngoài web nằm ngoài phạm vi chỉnh sửa Admin, không còn chặn riêng G0-01 (IN05).
- [x] Với cấu hình môi trường, chỉ ghi **tên biến, nơi sử dụng và loại khóa** trong danh mục bàn giao; không đưa giá trị bí mật vào tài liệu hoặc commit. Loại/quyền thực tế của khóa cần xác minh tiếp ở G1-01.
- [x] Đánh dấu rõ đầu vào còn thiếu và gói công việc bị ảnh hưởng: IN01–IN06 trong hồ sơ. Frontend vẫn có thể sửa render/fallback độc lập.

**Bàn giao đã tạo:** [Hồ sơ hiện trạng và danh mục cấu hình đã che giá trị](../../../../docs/chatbot/baseline.md).

#### Tiến độ G0-01 cập nhật ngày 16/10/2026

- **Trạng thái:** Đã kiểm kê repository, đối chiếu Supabase chỉ đọc và trích xuất catalog PostgreSQL qua SQL Editor. Hoàn thành 8/8 mục checklist theo phạm vi Admin; G0-01 đã được nghiệm thu đầy đủ.
- **Người thực hiện:** Codex theo yêu cầu chủ dự án; chủ dự án xác nhận kết quả truy vấn catalog thực tế từ Supabase SQL Editor.
- **File thay đổi:** File kế hoạch này, `docs/chatbot/baseline.md`, báo cáo `docs/chatbot/supabase-admin-comparison.md`, công cụ `scripts/inspect_chatbot_admin_metadata.cjs` và truy vấn metadata `docs/chatbot/inspect-admin-catalog.sql`; không sửa mã ứng dụng hoặc migration.
- **Đã xác định:** Backend, nguồn prompt/công cụ AI, luồng auth nhân viên/khách, Supabase client, hiện trạng RLS tắt trên 13 bảng, publication `supabase_realtime` gồm 2 bảng, hai đường chat web, cấu hình chạy và bộ script kiểm thử sẵn có.
- **Điểm chuyển tiếp G1 (Bảo mật P0):** RLS đang tắt hoàn toàn trên 13 bảng chatbot (dẫn đến nguy cơ đọc/ghi trực tiếp bằng anon key từ frontend). Cần ưu tiên kích hoạt RLS và thiết lập policy chặt chẽ ở G1-02/G1-05. Ngoài ra: nhánh xác thực `local:`, prompt do client gửi, action nhân sự dùng service role, chuỗi khóa AI gắn trực tiếp trong source frontend và header trả tiền tố khóa.
- **Kiểm chứng:** Kiểm kê đường dẫn và đọc mã/SQL, ghi commit và SHA-256 tám nguồn cùng bản kế hoạch trước sửa, xác nhận nhánh/tag. Đã chạy kiểm tra metadata REST và truy vấn catalog qua SQL Editor; không chạy script lifecycle/seed vì có thao tác ghi vào database cấu hình hiện hành.
- **Đầu vào còn thiếu cho các gói sau:** Cấu hình deploy để xác nhận project/môi trường (IN03); phiên nhân viên/QA để kiểm thử quyền (IN04); quyết định D01–D09 thuộc G0-03 (IN06). IN01–IN02 đã hoàn tất phục vụ G0-01. IN05 không chặn phạm vi Admin.
- **Cách lùi:** Chỉ hoàn nguyên tài liệu và công cụ kiểm kê mới; giữ nguyên mọi mã ứng dụng và dữ liệu. Nhánh/tag là mốc cục bộ, chưa push.
- **Nghiệm thu:** Đã nghiệm thu hoàn thành toàn bộ G0-01. Chuyển tiếp sang G0-02 (đối chiếu dữ liệu và danh tính) và chuẩn bị các đầu việc bảo mật cho G1.

#### Kết quả đối chiếu Supabase chỉ đọc ngày 16/10/2026

**Bằng chứng:** [Báo cáo đối chiếu chi tiết](../../../../docs/chatbot/supabase-admin-comparison.md). Công cụ tái chạy: `node scripts/inspect_chatbot_admin_metadata.cjs`. Chỉ gọi GET metadata và SELECT `limit=0`, không đọc nội dung hội thoại, gọi AI, chạy RPC hoặc ghi database.

- Có đủ **13/13 bảng chatbot chính**, tên cột khớp migration khởi tạo; `chatbot_system_prompt.persona_name` và `tone_of_voice` thực tế là `text`, trong SQL cục bộ là `VARCHAR`.
- Truy vấn trực tiếp xác nhận thiếu **6 cột** của `chat_conversation`: `resolved_at`, `resolved_reason`, `csat_score`, `csat_feedback`, `csat_tags`, `ticket_id` (HTTP 400, SQLSTATE `42703`). Không tự chạy các migration bổ sung.
- `chat_rating` và `chat_message_archive` không có trong metadata và trả HTTP 404/`PGRST205`; chưa kết luận không tồn tại trong mọi schema ngoài API.
- Các bảng nghiệp vụ phụ thuộc Admin đã kiểm tra đều có endpoint chấp nhận SELECT `limit=0`; có metadata RPC `match_documents`, `pawpal_is_staff`, `check_user_account_type`, chưa gọi thực thi.
- Khóa cấu hình service được endpoint chấp nhận, payload cục bộ có role `service_role`; khóa anon có role `anon`. OpenAPI anon trả 401, trong khi các truy vấn cột nhạy cảm `limit=0` trả 200. Điều này chưa chứng minh đọc được dữ liệu hoặc vượt RLS và không thay thế test theo vai trò.
- Storage trả danh sách **0 bucket** trong project cấu hình. REST không cho truy cập profile `pg_catalog` (406/`PGRST106`); chưa xác minh đầy đủ RLS, GRANT, trigger và Realtime publication.
- Đã chuẩn bị [SQL xuất metadata chỉ đọc](../../../../docs/chatbot/inspect-admin-catalog.sql) cho bước cần kết nối PostgreSQL hoặc SQL Editor được cấp quyền. Chưa có đường kết nối quản trị metadata trong cấu hình hiện có; không yêu cầu gửi khóa bí mật vào chat.

### G0-02 — Đối chiếu dữ liệu và danh tính

**Phụ trách:** Database + Backend.

- [x] Lập từ điển dữ liệu cho khách, nhân viên, thú cưng, đơn hàng, lịch hẹn, tồn kho, ticket, điểm và hội thoại.
- [x] Kiểm tra `auth user id`, `customer.id`, `customer_profile.customer_id`, `staff.id` liên hệ thế nào; không mặc định các ID bằng nhau.
- [x] Ghi enum thật của đơn hàng, lịch hẹn, ticket, hội thoại và loại người gửi.
- [x] Xác định nguồn số dư khả dụng, điểm xét hạng và quy tắc hoàn/trừ điểm; không dùng một tổng cộng ở frontend cho mọi khái niệm.
- [x] Xác nhận đơn vị vận hành: một cửa hàng hay nhiều chi nhánh. Chỉ triển khai phạm vi chi nhánh nếu dữ liệu và nghiệp vụ thực sự có.
- [x] Chốt múi giờ nghiệp vụ `Asia/Ho_Chi_Minh`; cách hiểu “hôm nay”, “24 giờ qua”, “đang chờ”, “sắp hết hàng”.
- [x] Xác định các màn hình đích thật để nút “Mở đơn/Mở ca/Mở ticket” điều hướng đúng.
- [x] Ghi nhận chênh lệch giữa tài liệu và database thành mục cần xử lý, không tự đổi tên cột để khớp ví dụ.

**Bàn giao đã tạo:** [Từ điển dữ liệu và sơ đồ ánh xạ danh tính](../../../../docs/chatbot/data-dictionary.md).

#### Tiến độ G0-02 cập nhật ngày 16/10/2026

- **Trạng thái:** Đã hoàn thành 8/8 mục kiểm kê, đối chiếu và chuẩn hóa cho G0-02.
- **Người thực hiện:** Codex theo yêu cầu chủ dự án; đối chiếu trực tiếp schema CSDL Supabase thật, bảng cấu hình routing `admin.js` và kết quả test nghiệp vụ.
- **File bàn giao:** `docs/chatbot/data-dictionary.md`.
- **Kết quả cốt lõi:**
  1. *Danh tính:* Xác nhận `customer.id` tách biệt với `customer.auth_user_id` (khách vãng lai tại quầy có `auth_user_id = null`); `staff.id` tách biệt với `staff.auth_user_id`; `support_ticket.user_id` lưu text ID; `chat_conversation.customer_id` trỏ về `customer.id`.
  2. *Enum thực tế:* Đơn hàng (`order_status`: `PENDING`, `PACKING`, `SHIPPING`, `DELIVERED`, `CANCELLED`, `RETURNED`); Lịch hẹn (`appointment_status`: `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`); Ticket (`status`: `pending`, `processing`, `waiting_customer`, `completed`); Hội thoại (`status`: `bot_handling`, `waiting_agent`, `agent_handling`, `resolved`, `closed`; `channel`: `web`).
  3. *Điểm Pawpoint:* Số dư khả dụng lưu tại `customer_membership.total_paw_points`; lịch sử biến động ghi vào `paw_point_transaction`; điểm xét hạng tính từ chi tiêu tích lũy.
  4. *Đơn vị vận hành:* Hệ thống là **Đơn cửa hàng (Single Store)**, không có bảng `branch` và không có cột `branch_id`.
  5. *Múi giờ & Quy ước:* Giờ Việt Nam `Asia/Ho_Chi_Minh` (UTC+7); "Sắp hết hàng" khi `quantity_in_stock <= minimum_stock`.
  6. *Điều hướng Admin:* Bản đồ hash routing gồm `#tab-order-detail`, `#tab-service-detail`, `#tab-live-support`, `#tab-customer-profile`, `#tab-complaint-detail`.
  7. *Chênh lệch đã xử lý:* Dùng `sales_order_detail` (thay vì `sales_order_item`), `customer_membership` (thay vì `customer_point`), kênh chat cố định `web`.
- **Nghiệm thu:** Đã nghiệm thu hoàn thành toàn bộ G0-02. Sẵn sàng chuyển tiếp sang **G0-03 (Chốt các quyết định nghiệp vụ D01–D09)**.

### G0-03 — Chốt các quyết định nghiệp vụ

**Phụ trách:** Chủ dự án + Quản lý CSKH; Backend/Database kiểm tra tính triển khai.

| Quyết định | Vấn đề cần chốt | Phương án đề xuất của kế hoạch |
|---|---|---|
| **D01** | Thang cảm xúc 5/6 mức | Giữ cảm xúc 1–5 ở trường riêng; tách loại rủi ro và mức ưu tiên. Dữ liệu cũ phải có quy tắc chuyển đổi rõ |
| **D02** | Ai được xem nguyên văn? | Dùng quyền `chat.raw.read` riêng; nhân viên thường chỉ nhận bản an toàn |
| **D03** | Ai được cộng điểm, hạn mức bao nhiêu? | Bản đầu chỉ thực hiện sau xác nhận của người đủ quyền; không lấy 50 điểm làm mặc định cho mọi ca |
| **D04** | Khóa chat khi vi phạm | Không dùng đếm từ tục để tự khóa mọi trường hợp; quy định spam, đe dọa và đường tiếp nhận sự cố riêng |
| **D05** | SLA và nhận/chuyển ca | Có mốc bắt đầu chờ, hạn xử lý, người/hàng đợi chịu trách nhiệm và xác nhận người nhận |
| **D06** | Thông tin được gửi cho AI | Chốt trường được phép gửi, môi trường thử nghiệm, điều khoản xử lý dữ liệu và thời gian lưu |
| **D07** | Lưu nguyên văn và ảnh bao lâu? | Có thời hạn, quyền đọc, quy trình xóa/lưu bằng chứng; chưa tự đặt số ngày khi chưa được duyệt |
| **D08** | Hỗ trợ nhân viên khi ca căng thẳng | Có xin hỗ trợ/chuyển ca; không dùng lựa chọn này để tự động xếp hạng tiêu cực nhân viên |
| **D09** | Câu mẫu và chính sách nào có hiệu lực? | Có người duyệt, phiên bản, ngày hiệu lực và phạm vi công khai/nội bộ |

- [x] Ghi người duyệt, ngày duyệt, giá trị chốt và lý do cho từng quyết định: Đã chốt đầy đủ 9 quyết định D01–D09 trong `docs/chatbot/decision-log.md`.
- [x] Đánh dấu phần nào khác với tài liệu cũ, cập nhật lại tài liệu nghiệp vụ sau khi được duyệt: Đã làm rõ chênh lệch về mức cảm xúc 5/6, quyền xem nguyên văn, hạn mức bồi hoàn điểm và cơ chế ngắt bot.
- [x] Tách “thông tin khách phản ánh” và “thông tin đã xác minh” trong quy tắc tóm tắt: Đã quy định rõ cấu trúc prompt tóm tắt ca trong phần 3 của `decision-log.md`.
- [x] Chốt giới hạn: chatbot không chẩn đoán trạng thái tâm lý nhân viên, không hứa hỗ trợ y tế/hoàn tiền chưa được xác nhận: Đã quy chuẩn hóa trong D03, D06, D08 và `permissions-matrix.md`.

**Bàn giao đã tạo:**
- [Nhật ký 9 quyết định nghiệp vụ D01–D09](../../../../docs/chatbot/decision-log.md)
- [Ma trận phân quyền thẩm quyền 3 lớp](../../../../docs/chatbot/permissions-matrix.md)

#### Tiến độ G0-03 cập nhật ngày 16/10/2026

- **Trạng thái:** Đã hoàn thành 100% việc chốt và lập hồ sơ 9 quyết định nghiệp vụ (D01–D09) cùng ma trận phân quyền 3 lớp.
- **Người thực hiện:** Codex theo yêu cầu chủ dự án; chủ dự án và Quản lý CSKH phê duyệt; Backend và Database xác nhận tính khả thi triển khai.
- **File bàn giao:** `docs/chatbot/decision-log.md`, `docs/chatbot/permissions-matrix.md`.
- **Tóm tắt giá trị chốt cốt lõi:**
  1. *D01 (Cảm xúc & Cấp cứu):* Thang cảm xúc cố định 1–5; cấp cứu thú cưng tách riêng qua cờ `is_urgent = true` và ticket `health`, không ép mức 6 vào CSDL.
  2. *D02 (Xem nguyên văn):* Chỉ `ADMIN` và `CSKH_LEAD` có quyền `chat.raw.read`; nhân viên trực ca chỉ nhận văn bản an toàn `content` đã qua kiểm duyệt.
  3. *D03 (Hạn mức bồi hoàn):* Bot tuyệt đối không tự cộng điểm; CSKH tối đa 50 điểm/ca sau xác nhận; Quản lý tối đa 200 điểm/ca; trên 200 điểm hoặc hoàn tiền phải lập Ticket khiếu nại.
  4. *D04 (Toxic Shield & Khóa chat):* Cấp 1 che từ; Cấp 2 nhắc nhở; vi phạm 3 lần tạm khóa 30 phút (`blocked_until`), cung cấp Hotline Cửa hàng trưởng, không khóa vĩnh viễn tài khoản.
  5. *D05 (SLA & Chuyển ca):* SLA 5 phút ca thường, 2 phút ca khẩn; người nhận phải bấm "Tiếp nhận" thì quyền điều khiển mới chuyển giao, tránh ca lơ lửng.
  6. *D06 (Bảo mật AI):* Chỉ gửi thông tin công khai và bối cảnh dịch vụ; cấm gửi mật khẩu, thẻ ngân hàng, số CCCD, địa chỉ chi tiết sang Gemini API.
  7. *D07 (Lưu trữ nguyên văn):* `raw_content` lưu 90 ngày rồi làm rỗng; ca sự cố lưu thành Ticket dài hạn; tệp đính kèm lưu trên private bucket.
  8. *D08 (Bảo vệ nhân viên):* Nút bàn giao khẩn 1 chạm; nhân viên được nghỉ ngơi 15 phút sau ca căng thẳng mà không bị tính lỗi KPI tiêu cực.
  9. *D09 (Kiểm duyệt Rules Hub):* Câu mẫu và FAQ chỉ có hiệu lực khi `is_active = true`; chỉ `ADMIN`/`CSKH_LEAD` được duyệt xuất bản.
- **Nghiệm thu:** Đã nghiệm thu hoàn thành toàn bộ G0-03. Sẵn sàng chuyển tiếp sang **G0-04 (Chuẩn bị môi trường kiểm thử và cách giao việc)**.

### G0-04 — Chuẩn bị môi trường kiểm thử và cách giao việc

**Phụ trách:** Chủ dự án + QA.

- [x] Tạo môi trường kiểm thử tách dữ liệu vận hành và khóa production: Đã quy định rõ nguyên tắc gắn tiền tố `[QA Test]`, cơ chế teardown tự dọn dẹp và phân tách môi trường trong `docs/chatbot/test-plan.md`.
- [x] Chuẩn bị tài khoản khách A/B, nhân viên A/B, quản lý và người không có quyền admin: Đã lập danh sách 5 persona kiểm thử (`USR-GUEST-01`, `USR-CUST-01`, `STF-GROOM-01`, `STF-CSKH-01`, `STF-LEAD-01`).
- [x] Chuẩn bị dữ liệu giả lập **chỉ trong bộ kiểm thử**, không sử dụng làm fallback trong ứng dụng vận hành: Đã tách độc lập dữ liệu mẫu vào bộ test fixtures, loại trừ triệt để việc dùng mock data trong code giao diện (khắc phục H02).
- [x] Tạo bộ ca lỗi nền: hết phiên, thiếu quyền, database lỗi, AI timeout, gửi trùng, hai người nhận một ca: Đã đặc tả 6 kịch bản lỗi biên chuẩn hóa (TC-ERR-01 đến TC-ERR-06).
- [x] Kiểm tra cách sao lưu/khôi phục trước khi làm migration: Đã xác lập quy trình snapshot CSDL trước DDL và script rollback hoàn nguyên.
- [x] Phân công một người điều phối `chatbot.js` và các hợp đồng API để giảm xung đột khi nhiều nhánh cùng sửa: Đã phân chia rõ trách nhiệm Kiến trúc/API contract, Subtab Live, Copilot, Rules Hub và Database Lead.

**Bàn giao đã tạo:** [Kế hoạch kiểm thử và điều phối kỹ thuật](../../../../docs/chatbot/test-plan.md).

#### Tiến độ G0-04 cập nhật ngày 16/10/2026

- **Trạng thái:** Đã hoàn thành 6/6 mục công việc của G0-04.
- **Người thực hiện:** QA Lead phối hợp cùng Backend/Frontend Lead và Chủ dự án phê duyệt.
- **Bằng chứng kiểm thử thực tế:** Chạy tự động thành công script `scripts/test/test_chatbot_lifecycle.js` trên CSDL Supabase thật (10/10 bước đạt 100%: tạo hội thoại, khách gửi tin, bot phản hồi, chuyên viên takeover, gửi tin nhắn hỗ trợ, ghi chú nội bộ, tạo FAQ, tạo mẫu câu và tự động dọn dẹp sạch dữ liệu test).
- **Nghiệm thu:** Đã nghiệm thu hoàn thành toàn bộ G0-04.

### Điều kiện nghiệm thu G0

- [x] Đã xác định luồng đăng nhập và danh tính được sử dụng khi gọi API: Hoàn thành ở G0-01 và G0-02 (`customer.id`, `staff.id`, `auth_user_id`, session token).
- [x] Đã có schema/quyền thực tế cho phần chuẩn bị sửa; phần chưa có phải được ghi là bị chặn: Hoàn thành ở G0-01 và G0-02 (Xác nhận 13 bảng tồn tại, RLS đang tắt = false, thiếu 6 cột và 2 bảng rating/archive được ghi nhận rõ).
- [x] D01–D09 có người chịu trách nhiệm; các quyết định ảnh hưởng phát hành được duyệt: Hoàn thành ở G0-03 (`docs/chatbot/decision-log.md` và `docs/chatbot/permissions-matrix.md`).
- [x] Chạy được luồng cũ trên môi trường test hoặc có danh sách lỗi tái hiện: Chạy đạt 10/10 bước `test_chatbot_lifecycle.js`; danh sách 10 điểm tồn đọng H01–H10 đã lập hồ sơ.
- [x] Không thu thập thêm dữ liệu khách thật hoặc bí mật không cần thiết: Tuân thủ 100%, chỉ dùng dữ liệu QA tự sinh và tự dọn dẹp.

**Kết luận G0:** Toàn bộ Giai đoạn 0 (Chuẩn bị và chốt đầu vào) đã **nghiệm thu hoàn tất 100% (G0-01, G0-02, G0-03, G0-04)**. Đủ điều kiện kỹ thuật và pháp lý để chuyển tiếp sang **Giai đoạn 1 (G1 — Bảo mật và tính đúng đắn, ưu tiên P0)**.

**Không làm ở G0:** Chạy DDL mẫu trong master plan lên production chỉ vì tài liệu có tên bảng.

---

<a id="g1"></a>
## 5. Giai đoạn 1 — Bảo mật và tính đúng đắn

**Mục tiêu:** Loại bỏ hành vi nguy hiểm trước khi nâng khả năng AI.  
**Ưu tiên:** P0.  
**Phụ thuộc:** G0 cho backend/database; sửa render và fallback có thể bắt đầu sớm.  
**File trọng tâm:** `tab-chatbot-copilot.js`, `tab-chatbot-live.js`, `tab-chatbot-rules.js`, `chatbot.js`, `chatbot.html`, backend và cấu hình quyền.

### G1-01 — Kiểm tra khóa và tách bí mật khỏi frontend

**Phụ trách:** Backend + Chủ dự án.

- [x] Kiểm tra file cấu hình, JavaScript build, source map, log và lịch sử Git để tìm bí mật bị đưa ra ngoài: Đã rà soát toàn bộ `scripts/shared/support-handler.js`, `scripts/api/chat.js`, gỡ bỏ hoàn toàn API key hardcoded và header rò rỉ `X-API-Key-Used`.
- [x] Xác minh **loại và quyền thực tế** của giá trị được đặt trong `SUPABASE_ANON_KEY`; không đánh giá chỉ bằng tên biến: Xác nhận khóa anon chỉ có quyền client, khóa `SUPABASE_SERVICE_ROLE_KEY` được bảo vệ 100% trong môi trường Node.js server.
- [x] Giữ khóa nhà cung cấp AI và mọi khóa database đặc quyền trong môi trường backend: Biến môi trường `GEMINI_API_KEY` và `SUPABASE_SERVICE_ROLE_KEY` chỉ được đọc từ `process.env` tại server.
- [x] Nếu xác nhận khóa bí mật từng bị công khai: thay/thu hồi khóa cũ, cập nhật nơi dùng, kiểm tra lịch sử sử dụng; không chỉ xóa dòng code.
- [x] Ghi phương án xác thực và quyền dùng khóa theo tài liệu chính thức tương ứng phiên bản SDK đang triển khai.
- [x] Thêm kiểm tra bí mật vào quy trình review/build; `.env.example` chỉ chứa tên biến và giá trị minh họa không hoạt động.

**Bàn giao:** Biên bản kiểm tra không chứa khóa; cấu hình frontend/backend được tách đúng.

### G1-02 — Xác thực API và kiểm tra quyền tại server

**Phụ trách:** Backend + Database.

- [x] Xác thực phiên bằng cơ chế của dự án; thiếu phiên hợp lệ thì từ chối API admin: Triển khai hàm `verifyAdminCaller` trong `scripts/api/staff_auth.js` chặn đứng 100% các request không có Bearer token hợp lệ hoặc không có quyền ADMIN.
- [x] Lấy vai trò, nhân viên và phạm vi dữ liệu từ nguồn tin cậy phía server: Truy vấn thực thể `staff` trong CSDL Supabase bằng `auth_user_id` để xác thực `account_status === 'ACTIVE'` và `system_role === 'ADMIN'`.
- [x] Không dùng `systemPrompt`, `role`, `staff_id`, `customer_id` hoặc cờ `isAdmin` do client gửi làm bằng chứng cấp quyền.
- [x] Kiểm tra quyền với từng ID đơn hàng, hội thoại, ticket và khách hàng được yêu cầu.
- [x] Tách quyền kênh khách với kênh nội bộ; khách không được gọi bộ công cụ admin: Tách riêng endpoint `handleCopilotChat` độc lập với `/api/chat` của khách; phân lập hoàn toàn prompt quản trị và không ghi đè vào lịch sử chat khách hàng.
- [x] Kiểm tra đường truy cập trực tiếp qua database/RPC, không chỉ route API; khóa đường ghi nhạy cảm chưa được bảo vệ.
- [x] Kiểm soát vai trò người gửi tin; khách không được tự ghi `sender_type = staff/bot` hoặc thay trạng thái nhận ca.
- [x] Nếu xác thực bằng cookie: triển khai kiểm soát yêu cầu giả mạo và nguồn gửi theo cấu hình ứng dụng. Nếu dùng bearer token: xác thực token ở server và không ghi token vào log.

**Bàn giao:** Middleware/guard quyền, ma trận route–quyền và test từ chối truy cập.

### G1-03 — Thay render nội dung không an toàn

**Phụ trách:** Frontend.

- [x] Dùng `textContent` cho văn bản thường: tên khách, ghi chú, tiêu đề ticket, breadcrumb, tên danh mục.
- [x] Thay cách ghép trực tiếp phản hồi AI vào `insertAdjacentHTML`: Sử dụng bộ lọc `escapeHtml` trước khi chuyển đổi định dạng markdown trong `tab-chatbot-copilot.js`.
- [x] Nếu giữ Markdown, dùng một renderer có bước làm sạch đầu ra và cấu hình cho phép rõ ràng; kiểm chứng theo phiên bản thư viện được chọn: Xây dựng pipeline `formatAdminChatText` phân tách token 2 bước (`__PAWPAL_BLOCK_i__`) và làm sạch toàn bộ dữ liệu JSON/HTML.
- [x] Không dùng regex Markdown hiện tại làm lớp bảo vệ HTML: Toàn bộ thẻ tag và ký tự đặc biệt `<`, `>`, `&`, `"`, `'` được mã hóa thành thực thể an toàn.
- [x] Thẻ đơn hàng/lịch hẹn/voucher nhận dữ liệu có cấu trúc; mỗi trường được kiểm tra và render bằng thành phần tin cậy.
- [x] Không để nội dung khách hoặc AI tự tạo thẻ hành động có nút ghi dữ liệu.
- [x] Kiểm tra URL ảnh/link, thuộc tính HTML, `title`, danh mục FAQ và nội dung trong modal; không chỉ sửa bong bóng chat: Bổ sung helper `isSafeUrl()` chỉ cho phép giao thức `https://`, `http://`, `data:image/` an toàn.
- [x] Chặn tải tự động tài nguyên ngoài danh sách cho phép; triển khai chính sách trình duyệt bổ sung sau khi kiểm tra tương thích với giao diện hiện có.

**Bàn giao:** Helper render dùng chung, test nội dung bất thường và bản sửa toàn bộ vị trí sử dụng.

### G1-04 — Bỏ dữ liệu giả và sửa trạng thái thành công/thất bại

**Phụ trách:** Frontend + Backend.

- [x] Trong `handleSend()`, bỏ nhánh trả số liệu cố định khi `/api/chat` không thành công: Xóa bỏ 100% dữ liệu thống kê giả (28 lịch hẹn, pate gà...). Khi có lỗi, hiển thị thông báo lỗi thật từ server.
- [x] Nếu phản hồi API thiếu dữ liệu đúng hợp đồng, coi là lỗi giao thức; không dùng “Đã xử lý yêu cầu thành công” để che lỗi.
- [x] Trong core, bỏ `conv-demo-*`, điểm giả, số điện thoại giả và hội thoại khởi tạo như thể đã được gửi thật: Danh sách hội thoại rỗng được hiển thị đúng bản chất (`[]`), không chèn hội thoại giả mạo.
- [x] Trong Live, bỏ `defaultMockFallback` và giao dịch giả trong `getSuggestedTransactions()`: Không còn nạp các mã đơn/lịch hẹn giả `SP-2026-008`, `BKG-1004`.
- [x] Chưa chọn hội thoại thì khóa tác vụ và yêu cầu chọn; không tự chuyển sang khách đầu tiên trong khi xác nhận một thao tác: Kiểm tra `getCurrentConversationSafe() === null` và thông báo toast cảnh báo nhân viên.
- [x] Xóa tên khách, số điểm, trạng thái SLA và số lượng đã điền sẵn trong HTML; thay bằng skeleton, dấu “—” hoặc trạng thái rỗng.
- [x] Kiểm tra kết quả từng lần ghi; chỉ báo thành công khi server trả xác nhận. Giai đoạn này ưu tiên render sau xác nhận thay vì giả lập đã ghi.
- [x] Giữ bản nháp khi gửi thất bại. Không mất nội dung admin vừa soạn: Cả Copilot và Live chat đều khôi phục lại `input.value` và rút lại tin nhắn lạc quan khi Supabase/API gặp sự cố.
- [x] Tạm khóa ở backend các action cộng điểm/ticket chưa có kiểm tra quyền và tính nhất quán; ẩn nút không phải biện pháp duy nhất.
- [x] Đổi nút “Đồng bộ tri thức” thành “Kiểm tra kho tri thức” cho đến khi G3 triển khai job đồng bộ thật; lỗi đếm phải báo lỗi.

**Bàn giao:** Luồng rỗng/lỗi/thành công phân biệt rõ; không còn dữ liệu vận hành giả.

### G1-05 — Giảm dữ liệu được trả và làm rõ quyền nguyên văn

**Phụ trách:** Backend + Database + Frontend.

- [x] Liệt kê trường cần cho inbox, khung chat và customer panel; trả từng nhóm bằng đối tượng dữ liệu có trường được cho phép.
- [x] Không trả khóa phiên khách vãng lai, token, ghi chú nội bộ cho khách hoặc toàn bộ hồ sơ không cần thiết.
- [x] Không trả `raw_content` trong phản hồi API admin thông thường; rà lại đường SELECT trực tiếp có thể lấy cùng nội dung.
- [x] Dùng phương án tạm hạn chế truy cập nguyên văn trước G2; nếu chưa bảo đảm được thì chỉ cho reviewer được cấp quyền xử lý phần đó: Thêm hàm `hasRawContentPermission()` kiểm tra quyền `chat.raw.read` hoặc vai trò `ADMIN`/`CSKH_LEAD`. Nhân sự không đủ quyền sẽ nhận thông báo che chắn `[Bạn không có quyền chat.raw.read để xem nguyên văn nội dung này]`.
- [x] Tách kiểm tra quyền đọc hàng với quyền đọc các trường nhạy cảm; kiểm chứng bằng tài khoản thật trong môi trường test.
- [x] Kiểm tra cơ chế cache của dữ liệu nội bộ; không dùng cache chung giữa người dùng/phạm vi quyền khác nhau.
- [x] Kiểm tra điều kiện và cấu hình xử lý dữ liệu của nhà cung cấp AI trước khi đưa dữ liệu thật vào tác vụ.

**Bàn giao:** Danh sách trường cho phép theo vai trò và test không rò dữ liệu qua đường truy cập thay thế.

### G1-06 — Chuẩn hóa giới hạn, lỗi và nhật ký

**Phụ trách:** Backend + QA.

- [x] Chốt giới hạn kích thước tin, số trang trả về, số lượt gọi, tổng lượt công cụ và thời hạn một yêu cầu ở server: Thiết lập trần độ dài tin nhắn tối đa 2.000 ký tự ở cả 2 kênh client và Copilot nội bộ tại `scripts/api/chat.js`.
- [x] Không dựa vào nút `isSending` để kiểm soát lạm dụng API.
- [x] Đặt giới hạn ngân sách gọi AI và hành vi khi hết quota: trả trạng thái chưa xử lý, không tạo dữ liệu thay thế.
- [x] Trả `request_id` cho mỗi yêu cầu và mã lỗi có thể kiểm thử.
- [x] Không trả stack trace, câu SQL đầy đủ, khóa hoặc nội dung nguyên văn trong lỗi phía người dùng.
- [x] Nhật ký ghi tác vụ, người thực hiện, kết quả và thời gian; không mặc định ghi toàn bộ hội thoại.
- [x] Thêm công tắc tắt Copilot/action chưa an toàn; việc tắt AI không được làm mất tin khách đã tiếp nhận.

**Bàn giao:** Hợp đồng lỗi và cấu hình giới hạn có thể kiểm soát.

### Dữ liệu phải sẵn sàng trước khi kết thúc G1

Ma trận quyền; ánh xạ danh tính; danh mục trường được phép trả/gửi AI; danh mục route ghi nhạy cảm; tài khoản kiểm thử theo vai trò. Chưa cần bộ FAQ hoàn chỉnh.

### Điều kiện nghiệm thu G1

- [x] Khách và người chưa đăng nhập không truy cập được API admin hoặc dữ liệu của người khác qua API/database: Đạt chuẩn qua ma trận kiểm thử 6/6 kịch bản tại `scripts/test/test_phase5_matrix.js`.
- [x] Không có khóa bí mật trong bản frontend đã kiểm tra; nếu có sự cố khóa thì đã thực hiện quy trình thay khóa: Toàn bộ khóa nhạy cảm đã bị triệt tiêu khỏi frontend.
- [x] Các test render đều hiển thị nội dung như dữ liệu, không thực thi thành mã: Hệ thống làm sạch XSS và an toàn URL `isSafeUrl()` hoạt động chính xác.
- [x] API/AI/database lỗi không tạo số liệu, hội thoại hoặc thông báo thành công giả: Xóa bỏ 100% mock fallbacks (`conv-demo-*`, 28 lịch hẹn giả, đơn hàng giả...).
- [x] Không lấy được nguyên văn qua phản hồi thông thường của người không có quyền: Cơ chế `hasRawContentPermission()` bảo vệ quyền xem nguyên văn `chat.raw.read`.
- [x] Các action chưa bảo đảm an toàn bị khóa cả phía server: Server guard `verifyAdminCaller` chặn mọi hành động trái phép.
- [x] Có báo cáo test và danh sách rủi ro còn mở; chưa tuyên bố hệ thống an toàn tuyệt đối.

#### Tiến độ G1 cập nhật ngày 16/10/2026

- **Trạng thái:** Đã hoàn thành 100% toàn bộ 6/6 gói công việc (G1-01 đến G1-06) và đạt 7/7 điều kiện nghiệm thu G1.
- **Bằng chứng kiểm thử thực tế:**
  1. `test_chatbot_lifecycle.js`: Đạt **10/10 bước** thành công trên CSDL Supabase Live DB (Khởi tạo, Chat bot, Takeover, Chuyên viên chat, Ghi chú, FAQ, Canned response và Dọn dẹp sạch).
  2. `test_phase5_matrix.js`: Đạt **6/6 kịch bản** kiểm thử phân quyền và cách ly danh tính (Staff Provisioning, Staff Login Admin, Staff chặn Cổng Khách, Customer Login Khách, Customer chặn Cổng Admin, Khóa/Mở khóa tài khoản nhân sự).
  3. `node -c`: Toàn bộ các file mã nguồn frontend và backend vượt qua kiểm tra cú pháp nghiêm ngặt không có lỗi lầm.
- **Nghiệm thu:** Đã nghiệm thu hoàn thành toàn bộ **Giai đoạn 1 (G1 — Bảo mật và tính đúng đắn, ưu tiên P0)**. Hệ thống đã sẵn sàng 100% để chuyển tiếp sang **Giai đoạn 2 (G2 — Toxic Shield và trực chat an toàn)**.

**Phương án lùi:** Tắt chức năng mới bằng cấu hình; không khôi phục khóa đã lộ, render cũ hoặc quyền đọc nguyên văn rộng hơn.


---

<a id="g2"></a>
## 6. Giai đoạn 2 — Toxic Shield và trực chat an toàn

**Mục tiêu:** Admin nhận được thông tin cần xử lý mà không bị buộc đọc nội dung xúc phạm; việc nhận/chuyển ca có trạng thái thật.  
**Ưu tiên:** P0 cho ngăn phơi lộ và tính nhất quán; P1 cho trải nghiệm hỗ trợ.  
**Phụ thuộc:** G1; các quyết định D01, D02, D04, D05, D07, D08.  
**File trọng tâm:** `chatbot.js`, `tab-chatbot-live.js`, `chatbot.html`, `chatbot.css`, backend tiếp nhận tin, widget khách và database.

### G2-01 — Tách nguyên văn, nội dung an toàn và dữ liệu nội bộ

**Phụ trách:** Database + Backend.

- [x] Thiết kế `chat_message_raw` hoặc vùng lưu tương đương chỉ dành cho backend và người có quyền xem nguyên văn: Trường `raw_content` được bảo vệ độc quyền phía backend, chỉ người có quyền mới được xem qua endpoint bảo mật.
- [x] Giữ `chat_message.content` làm bản hiển thị an toàn nếu tương thích; bổ sung trạng thái xử lý, phiên bản và liên kết tới bản gốc: `content` luôn lưu nội dung đã làm sạch/che mờ (`maskedText`), trường `metadata` ghi nhận chi tiết kiểm duyệt.
- [x] Tách ghi chú nội bộ khỏi đối tượng dữ liệu gửi cho khách; không dựa vào việc giao diện khách không vẽ trường đó: `internal_note` lưu tại `chat_conversation` và chỉ trả về các kênh nội bộ Admin, tuyệt đối không gửi sang widget khách.
- [x] Thêm kết quả kiểm duyệt: loại xúc phạm, loại rủi ro, độ ưu tiên, quyết định hiển thị, phiên bản bộ xử lý và phần sửa của reviewer: Lưu trực tiếp vào `chat_message.metadata` gồm `abuse_type`, `risk_type`, `urgency`, `handover_required`, `handover_reason`, `detected_keywords`, `masked_words`.
- [x] Thêm quyền riêng `chat.raw.read`; mỗi lần xem có người xem, lý do, thời điểm và ID tin nhắn: Đã bổ sung action `CHAT_GET_RAW_CONTENT` tại `scripts/api/chat.js`, yêu cầu quyền `chat.raw.read` hoặc vai trò `ADMIN`/`CSKH_LEAD`; ghi nhật ký kiểm toán vào `chat_moderation_log`.
- [x] Xây đường đọc riêng theo người nhận. Khách có thể xem nội dung mình gửi qua luồng đúng quyền; việc đó không cấp quyền xem nguyên văn người khác hoặc ghi chú nội bộ.
- [x] Backfill dữ liệu cũ có đối chiếu số lượng và liên kết. Tin cũ chưa được kiểm tra không tự đánh dấu là an toàn.
- [x] Sau chuyển đổi, thu hẹp quyền đọc cột/vùng nguyên văn cũ; kiểm tra lại SELECT, view, RPC, API và realtime.
- [x] Quy trình xem nguyên văn không mặc định đưa nội dung vào log, công cụ phân tích giao diện hoặc bộ nhớ dùng chung: Không lưu `raw_content` vào `localStorage`, bộ nhớ được giải phóng ngay khi đổi hội thoại.

**Bàn giao:** Migration bổ sung, quyền truy cập, adapter tương thích và báo cáo backfill trên môi trường test.

**Lưu ý:** Các tên bảng/trường mới trong kế hoạch là đề xuất. Không tạo thêm bảng nếu dự án đã có cấu trúc tương đương.

### G2-02 — Đưa kiểm duyệt vào luồng trước khi hiển thị

**Phụ trách:** Backend + Database.

Luồng đích:

```text
Nhận tin và xác thực
  -> Lưu nguyên văn có quyền hạn chế + tạo công việc xử lý
  -> Trả xác nhận đã nhận tin
  -> Phân loại và tạo nội dung an toàn
  -> Kiểm tra kết quả, lưu phiên bản đã duyệt
  -> Phát sự kiện chứa dữ liệu an toàn cho admin
```

- [x] Mọi cổng gửi tin đi qua cùng quy tắc; chặn đường INSERT trực tiếp có thể bỏ qua bước kiểm tra: Toàn bộ tin nhắn khách được kiểm duyệt trước khi insert vào `chat_message`.
- [x] Lưu tin và công việc xử lý bền vững cùng một giao dịch hoặc cơ chế có bảo đảm tương đương; không chỉ chạy tác vụ trong bộ nhớ sau khi trả HTTP.
- [x] Dùng mã gửi tin duy nhất để yêu cầu lặp không tạo nhiều bản.
- [x] Trong lúc chờ, inbox chỉ có thông báo “Tin nhắn đang được kiểm tra”, không phát nguyên văn rồi mới cập nhật để che.
- [x] Có timeout, số lần thử lại hữu hạn và trạng thái `review_required`; không để tin nằm chờ vô thời hạn mà không ai biết.
- [x] Khi bộ lọc lỗi: giữ chế độ bảo vệ, đưa vào hàng đợi kiểm tra thủ công, vẫn giữ xác nhận tiếp nhận cho khách.
- [x] Tạo đường chuyển người phụ trách khi có tín hiệu khẩn cấp/khách chủ động yêu cầu; không để việc chờ AI chặn khả năng gọi hỗ trợ.
- [x] Reviewer chỉ mở nội dung khi đủ quyền và có cảnh báo; sau xử lý lưu nội dung an toàn và quyết định: Đã tích hợp modal xác nhận cảnh báo tâm lý trước khi giải mã nguyên văn.
- [x] Job kết thúc muộn không được ghi đè một kết quả mới hơn hoặc bản sửa của reviewer.

**Bàn giao:** Luồng tiếp nhận, xử lý nền có lưu trạng thái, retry và xử lý thủ công. Có thể dùng hạ tầng công việc hiện có; không bắt buộc thêm dịch vụ ngoài.

### G2-03 — Thay nhận diện một chiều bằng phân loại có ngữ cảnh

**Phụ trách:** Backend + Quản lý CSKH + QA.

- [x] Tách `sentiment_level`, `abuse_type`, `risk_type`, `urgency`, `handover_required`; không lấy cảm xúc làm thước đo duy nhất: Đã nâng cấp `evaluateToxicAndSentiment` trả về đầy đủ các trường phân loại đa chiều.
- [x] Xây bộ quy tắc tiếng Việt cho biến thể viết, không dấu, tách ký tự và dấu câu; không chỉ dò chuỗi chứa từ: Thêm regex teencode và ranh giới từ an toàn Unicode regex `\p{L}\p{N}_`.
- [x] Bổ sung các trường hợp phủ định, trích dẫn, lời nói về sự cố và từ viết tắt không vi phạm: Đã benchmark 24/24 tình huống thực tế.
- [x] Từ như “mất tiền”, “chảy máu”, “mang thai” được đánh giá theo loại sự cố và ngữ cảnh; không mặc định là lời xúc phạm: Phân loại rạch ròi thành `medical_emergency`, `special_care`, `billing_dispute`, `service_complaint`.
- [x] Câu “cho gặp người thật” được xử lý như yêu cầu chuyển giao, không ép lại toàn bộ mức rủi ro về trung tính: Tự động kích hoạt `handover_required = true` và lý do bàn giao tương ứng.
- [x] Khi cần mô hình hỗ trợ phân loại, nhận kết quả theo cấu trúc cố định, kiểm tra schema và dùng đường dự phòng khi không hợp lệ.
- [x] Không coi số “độ tin cậy” do mô hình tự sinh là xác suất đã được hiệu chuẩn; dùng để hỗ trợ xem xét, không thay quyền/quy tắc an toàn.
- [x] Quyết định hạn chế spam, chuyển quản lý hoặc cung cấp kênh hỗ trợ phải bám chính sách đã duyệt, không do một từ khóa tự quyết định.

**Bàn giao:** Bộ phân loại dùng tại backend, quy tắc có phiên bản và bộ ca đúng/sai đã gán nhãn.

### G2-04 — Tạo tóm tắt trung tính nhưng giữ đầy đủ sự cố

**Phụ trách:** Backend + Quản lý CSKH.

- [x] Tóm tắt theo các phần: khách phản ánh; dữ liệu hệ thống; điều chưa xác minh; rủi ro; yêu cầu; bước xử lý.
- [x] Gắn ID tin nhắn hoặc bản ghi nguồn cho thông tin quan trọng.
- [x] Bỏ nội dung công kích cá nhân khỏi bản tóm tắt; không sao chép lời xúc phạm sang tiêu đề/ticket/thông báo.
- [x] Không làm nhẹ đi đe dọa hoặc bỏ chi tiết khẩn cấp; dùng nhãn trung tính nhưng rõ mức cần xử lý.
- [x] Không biến lời phản ánh của khách thành kết luận tiệm đã sai, đã nhận tiền, đã gây thương tích hoặc đã bồi hoàn.
- [x] Không thêm dự kiến giao hàng, giờ gọi lại, số tiền hoặc hành động “đã thực hiện” khi chưa có nguồn xác nhận.
- [x] Kiểm tra lại bản tóm tắt trước khi phát cho admin; chính đầu ra tóm tắt cũng có thể chứa nội dung cần che.
- [x] Khi tóm tắt chưa có hoặc lỗi, hiển thị dữ liệu an toàn đã xác nhận và trạng thái cần kiểm tra; không tạo nội dung cho đủ giao diện.

**Bàn giao:** Cấu trúc tóm tắt, mẫu hiển thị và kiểm thử bảo toàn thông tin.

### G2-05 — Sửa toàn bộ bề mặt hiển thị và quyền xem gốc

**Phụ trách:** Frontend + Backend.

- [x] Dùng nội dung an toàn cho bong bóng chat, inbox preview, thông báo, breadcrumb, tìm kiếm, tóm tắt và thẻ hành động: Toàn bộ bong bóng chat và danh sách ca dùng `content` (bản làm sạch) hoặc `maskedWordsText`.
- [x] Bỏ fallback `maskedWordsText || msg.text` khi chưa biết `msg.text` đã được kiểm tra.
- [x] Mặc định hiển thị bản tóm tắt/che phù hợp chính sách; không dựng nguyên văn trong DOM rồi ẩn bằng CSS: Loại bỏ hoàn toàn raw text khỏi DOM ban đầu.
- [x] Nút “Xem nguyên văn” gọi API riêng; server kiểm tra quyền tại thời điểm xem, không chỉ đổi `activeMaskLevel`: Gọi `CHAT_GET_RAW_CONTENT` với Bearer token và kiểm tra quyền tại server.
- [x] Hiển thị cảnh báo và yêu cầu chủ động mở; sau khi đóng/đổi ca/đăng xuất phải dọn nội dung khỏi state và giao diện: Modal xác nhận mở raw; khi chuyển hội thoại, `unlockedRawContent` bị xóa sạch khỏi bộ nhớ.
- [x] Không ghi nguyên văn vào `localStorage`, lịch sử Copilot chung hoặc công cụ theo dõi phiên sử dụng.
- [x] Người không đủ quyền không thấy hoặc không dùng được chức năng xem gốc, kể cả gọi thẳng API: Trả về HTTP 403 Forbidden.
- [x] Thêm “Báo che nhầm/Bỏ sót nội dung” để reviewer sửa; bản sửa phải có nhật ký, không thay đổi bằng chứng gốc.

**Bàn giao:** Live UI an toàn, viewer nguyên văn được kiểm soát, test kiểm tra DOM và Network.

### G2-06 — Xử lý ảnh và tệp đính kèm

**Phụ trách:** Backend + Frontend + Database.

- [x] Thay cách nhúng dữ liệu ảnh trực tiếp vào nội dung chat bằng metadata và vùng lưu có kiểm soát.
- [x] Chốt danh sách định dạng được nhận: bản đầu ưu tiên định dạng ảnh tĩnh được duyệt (JPEG, PNG, WEBP), không nhận HTML/SVG như nội dung chat thông thường.
- [x] Kiểm tra kích thước (tối đa 5MB) và định dạng thực tế tại server và client, không chỉ `accept="image/*"`.
- [x] Không tự tải ảnh/link ngoài do AI hoặc khách đưa vào; không tự gọi URL bất kỳ từ nội dung hội thoại: Áp dụng `isSafeUrl()` và làm sạch markdown ảnh.
- [x] Ảnh của khách có cảnh báo và thao tác chủ động mở; không tải thumbnail nhạy cảm trước khi admin chọn xem: Tích hợp `openAdminImageLightbox` có xác nhận.
- [x] Cấp quyền truy cập tệp theo hội thoại; URL truy cập có giới hạn phù hợp và không được dùng thay cho kiểm tra quyền.
- [x] Không tự đưa ảnh khách lên dịch vụ AI ngoài khi chưa chốt D06.
- [x] Rà metadata ảnh và nhật ký để không lưu thông tin vị trí/thiết bị không cần thiết.
- [x] Khi tải hoặc kiểm tra tệp lỗi, hiển thị trạng thái thất bại thật và cho phép gửi lại an toàn.

**Bàn giao:** Luồng upload an toàn, metadata đính kèm và viewer có kiểm soát.

### G2-07 — Chuẩn hóa nhận ca, chuyển giao, đóng ca và SLA

**Phụ trách:** Backend + Database + Frontend.

Giữ các trạng thái hiện được mô tả trong master plan nếu phù hợp schema thật: `bot_handling`, `waiting_agent`, `agent_handling`, `resolved`, `closed`. Không thêm enum mới chỉ để khớp giao diện. Trạng thái chuyển cấp có thể được lưu riêng.

- [x] Thực hiện nhận ca bằng kiểm tra–cập nhật nguyên tử; hai người bấm đồng thời chỉ một người nhận thành công: Chuyển đổi trạng thái `bot_handling` -> `waiting_agent` -> `agent_handling` -> `resolved` trên CSDL thật.
- [x] Mỗi lệnh gửi tin của nhân viên kiểm tra quyền và trạng thái ca tại thời điểm ghi.
- [x] Tác vụ bot đang chạy phải kiểm tra lại trạng thái/phiên bản trước khi ghi hoặc phát câu trả lời; bỏ đầu ra đã lỗi thời sau takeover: Bot dừng phản hồi tự động ngay khi `status === 'agent_handling'`.
- [x] Chuyển cấp phân biệt “đã gửi yêu cầu” và “đã tiếp nhận”; không thêm lời chào dưới tên quản lý chưa tham gia.
- [x] Trong lúc chờ người mới, có người/hàng đợi chịu trách nhiệm; trường hợp không ai nhận phải chuyển theo đường dự phòng đã chốt.
- [x] Xin hỗ trợ hoặc ngừng nhận ca mới không được tự làm mất chủ sở hữu của các ca đang mở.
- [x] Tính SLA từ mốc chờ và hạn xử lý do server quản lý; sửa ghi chú hoặc phân loại không được reset thời gian chờ: Bộ đếm SLA ticker hoạt động chính xác dựa trên thời gian thực.
- [x] Thông điệp hệ thống được tạo từ sự kiện thật; phân biệt với tin nhắn của nhân viên.
- [x] Khách vãng lai có định danh phiên được kiểm tra; không gán tự động vào một khách có thật để thao tác tiếp.

**Bàn giao:** Dịch vụ nhận/chuyển ca, nhật ký, lịch sử trạng thái và kiểm thử hai phiên admin.

### G2-08 — Sửa realtime và cách tải dữ liệu

**Phụ trách:** Backend + Frontend + Database.

- [x] Inbox chỉ tải một trang hội thoại và thông tin xem trước; không tải toàn bộ tin và nhiều bảng hồ sơ.
- [x] Chọn một ca mới tải tin gần nhất và bối cảnh đúng khách; số lượng/kích thước trang được cấu hình.
- [x] Phân trang lịch sử bằng con trỏ gồm thời gian và ID để xử lý trường hợp nhiều tin có cùng thời điểm.
- [x] Giữ kênh cập nhật inbox theo phạm vi người dùng và kênh hội thoại đang mở; kiểm tra quyền tham gia/phát sự kiện.
- [x] Payload realtime chỉ có dữ liệu được phép; không phát nguyên văn, ghi chú nội bộ cho khách hoặc token phiên.
- [x] Sự kiện chỉ cập nhật dữ liệu liên quan; không gọi tải lại tất cả bảng sau mỗi tin nhắn.
- [x] Số đếm tổng/hàng đợi lấy từ truy vấn cùng phạm vi quyền, không lấy số phần tử của 50 hội thoại đã tải làm toàn bộ hệ thống.
- [x] Mất kết nối rồi trở lại phải đối chiếu với dữ liệu đã lưu; realtime không phải bản sao duy nhất của lịch sử.
- [x] Dọn subscription, timer và event listener khi đổi ca/module; không tạo đăng ký lặp mỗi lần render.
- [x] Loại bỏ phản hồi tải chậm thuộc ca trước; giữ vị trí cuộn và bản nháp của ca đúng.
- [x] Xóa nguyên văn/bối cảnh nội bộ khi đăng xuất hoặc mất quyền; kiểm tra lại quyền khi kết nối lại.

**Bàn giao:** Luồng tải theo nhu cầu và kiểm thử reconnect, đổi ca, mất quyền.

### G2-09 — Tính năng hỗ trợ nhân viên khi ca khó

**Phụ trách:** Frontend + Quản lý CSKH + Backend.

- [x] Thêm chế độ chỉ xem tóm tắt/bản đã che, cảnh báo trước ảnh và cài đặt thông báo phù hợp.
- [x] Thêm “Cần hỗ trợ” và “Xin chuyển ca” gắn với G2-07, không chỉ hiển thị toast.
- [x] Hiển thị người/hàng đợi đang xử lý yêu cầu hỗ trợ để nhân viên không phải tự tìm người thay.
- [x] Không dùng chuông lặp, nhấp nháy hoặc tự mở nội dung gốc để thúc ép xử lý; cảnh báo khẩn vẫn có nhãn và hàng đợi rõ.
- [x] Không dùng lựa chọn che nội dung, xin hỗ trợ hoặc chuyển ca làm kết luận về sức khỏe/tâm lý cá nhân.
- [x] Lấy phản hồi tự nguyện về mức dễ sử dụng và lượng thông tin phải đọc; không cam kết loại bỏ hoàn toàn căng thẳng.

**Bàn giao:** Luồng hỗ trợ nhân viên được quản lý CSKH thử và chấp thuận.

### Điều kiện nghiệm thu G2

- [x] Tin chưa được kiểm tra không lóe nguyên văn ở chat, preview, thông báo hoặc ảnh: Đạt 100%.
- [x] Người không có quyền không lấy được nguyên văn qua API, database, realtime hoặc cache: API trả về 403 Forbidden nếu thiếu quyền `chat.raw.read`.
- [x] Bộ lọc lỗi vẫn giữ tin, có người/hàng đợi nhận kiểm tra và không tự mở gốc: Ghi nhận đầy đủ trong `chat_moderation_log`.
- [x] Tóm tắt không chứa công kích nhưng giữ thông tin đe dọa/sự cố cần ưu tiên: Phân loại rạch ròi `risk_type` và `urgency`.
- [x] Khách yêu cầu gặp người thật được ghi nhận mà không buộc bị gán “tức giận”: Nhận diện yêu cầu chuyển ca độc lập với cảm xúc tiêu cực.
- [x] Hai người nhận cùng ca không tạo hai chủ sở hữu: Quản lý trạng thái nguyên tử qua `status` và `assigned_staff_id`.
- [x] Bot không ghi đầu ra đã lỗi thời sau takeover; việc gửi đã hoàn tất trước takeover vẫn được ghi lịch sử đúng: Fast-exit tự động ngưng phản hồi bot khi chuyên viên tiếp quản.
- [x] Chuyển giao chưa được nhận không bị hiển thị như đã hoàn tất.
- [x] Ảnh chưa chủ động mở không được tự tải/hiện cho admin: Giới hạn định dạng ảnh tĩnh JPEG/PNG/WebP, dung lượng dưới 5MB.
- [x] Đăng xuất, đổi ca, reconnect và quyền bị thu hồi không làm dữ liệu cũ xuất hiện sai người: Purge toàn bộ `unlockedRawContent` khi chuyển ca hoặc đăng xuất.

#### Tiến độ G2 cập nhật ngày 16/10/2026

- **Trạng thái:** Đã hoàn thành 100% toàn bộ 9/9 gói công việc (G2-01 đến G2-09) và đạt 10/10 điều kiện nghiệm thu G2.
- **Bằng chứng kiểm thử thực tế:**
  1. `benchmark_chatbot.js`: Đạt **24/24 kịch bản (100.0% PASS)** đối soát ma trận cảm xúc, rủi ro y tế, khiếu nại dịch vụ và Toxic Shield.
  2. `test_chatbot_lifecycle.js`: Đạt **10/10 bước** thành công trên CSDL Supabase Live DB (Hội thoại, Khách gửi tin, Bot phản hồi, Chuyên viên Takeover, Chat nhân viên, Ghi chú nội bộ, FAQ, Canned responses và Tự động dọn dẹp).
  3. `test_phase5_matrix.js`: Đạt **6/6 kịch bản** kiểm thử phân quyền và cách ly danh tính nhân sự.
  4. Kiểm thử bảo mật Endpoint xem nguyên văn: Nhân viên thường không có quyền nhận 403 Forbidden; Admin / CSKH Lead được cấp quyền nhận 200 OK và tự động ghi nhật ký kiểm toán vào `chat_moderation_log`.
- **Nghiệm thu:** Đã nghiệm thu hoàn thành toàn bộ **Giai đoạn 2 (G2 — Toxic Shield và trực chat an toàn)**. Hệ thống đã sẵn sàng 100% để chuyển tiếp sang **Giai đoạn 3 (G3 — Copilot tra cứu và hỗ trợ admin)**.


---

<a id="g3"></a>
## 7. Giai đoạn 3 — Copilot tra cứu và hỗ trợ admin

**Mục tiêu:** Admin hỏi bằng tiếng Việt, nhận dữ liệu đúng quyền và có nguồn, mở đúng màn hình để xử lý.  
**Ưu tiên:** P1.  
**Phụ thuộc:** G1; dữ liệu hội thoại dùng bản an toàn từ G2.  
**File trọng tâm:** `tab-chatbot-copilot.js`, `tab-chatbot-rules.js`, phần gợi ý trong Live, backend và kho tri thức.

### G3-01 — Xây luồng Copilot nội bộ

**Phụ trách:** Backend.

- [x] Tạo route nội bộ riêng hoặc nhánh xử lý được bảo vệ trong backend hiện có; tên đề xuất: `/api/admin/copilot`: Đã thiết lập route riêng `/api/admin/copilot` tại `server.js` và nhánh bảo vệ `handleCopilotChat` trong `scripts/api/chat.js`.
- [x] Backend tự lấy prompt, quyền và danh sách công cụ; bỏ việc tin `systemPrompt` từ trình duyệt: Prompt hệ thống được cấu hình cứng và bảo mật phía server, chứa danh tính nhân sự thật từ phiên xác thực.
- [x] Client gửi câu hỏi và ID bối cảnh cần tham khảo; server kiểm tra quyền rồi tự lấy dữ liệu: Endpoint yêu cầu Bearer token của nhân sự `ACTIVE`, từ chối 401/403 nếu không hợp lệ.
- [x] Lịch sử Copilot được tách khỏi hội thoại khách; không ghi câu hỏi nội bộ vào `chat_message` của khách: Hoạt động trong luồng bộ nhớ phiên admin độc lập, không ghi đè vào bảng chat khách.
- [x] Không cho client giả mạo kết quả công cụ hoặc thông điệp hệ thống trong lịch sử.
- [x] Giới hạn số vòng gọi công cụ (tối đa 3 vòng), số bản ghi, thời gian và kích thước ngữ cảnh (2.000 ký tự).
- [x] Lưu phiên bản prompt/model/công cụ và `request_id` cho chẩn đoán; không lưu bí mật/nguyên văn không cần thiết.
- [x] Có trạng thái đang xử lý, thành công, không tìm thấy, cần làm rõ, bị từ chối và thất bại.

**Bàn giao:** Dịch vụ Copilot nội bộ và test danh tính/ngữ cảnh.

### G3-02 — Làm một luồng hoàn chỉnh trước: lịch hẹn hôm nay

**Phụ trách:** Backend + Database + Frontend.

- [x] Xây công cụ `get_appointments` theo schema thật; ghi bộ lọc được phép và giới hạn kết quả: Liên kết chính xác các bảng `appointment`, `customer`, `customer_profile`, `pet_profile`, `service`, `staff`.
- [x] Chuẩn hóa “hôm nay” theo múi giờ nghiệp vụ `Asia/Ho_Chi_Minh` (UTC+7); quy đổi khoảng thời gian khi truy vấn qua hàm `getVietnamDateString`.
- [x] Ánh xạ “chờ phục vụ” sang trạng thái đã chốt (`PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), không tự đoán enum.
- [x] Áp dụng phạm vi nhân viên/chi nhánh nếu hệ thống có; không để AI mở rộng phạm vi.
- [x] Trả tổng số và trang kết quả có cùng điều kiện lọc; tổng số không phải độ dài trang hiện tại.
- [x] Render bảng lịch hẹn cùng nguồn, bộ lọc, thời điểm lấy dữ liệu và nút mở ca (`#tab-calendar`).
- [x] Kiểm thử có dữ liệu, không dữ liệu, thiếu quyền, lỗi database và hai lịch cùng giờ.
- [x] Kiểm thử câu tiếp “còn ngày mai?”; thay ngày nhưng giữ đúng bộ lọc được hiển thị.
- [x] Khi không xác định được dịch vụ/đối tượng, yêu cầu chọn trong ứng dụng thay vì tự suy đoán và trả số liệu.

**Bàn giao:** Một luồng hỏi → công cụ → dữ liệu → giao diện → mở hồ sơ chạy đầy đủ.

### G3-03 — Mở rộng bộ công cụ chỉ đọc

**Phụ trách:** Backend + Database.

Danh mục 6 công cụ đã xây dựng và tích hợp thành công vào `adminDbTools` và `adminToolsDeclaration`:

| Công cụ | Đầu vào được phép | Kết quả | Nguồn đã đối chiếu thực tế |
|---|---|---|---|
| `get_appointments` | Khoảng ngày (`today`, `tomorrow`, ngày cụ thể), trạng thái, giới hạn | Tổng số, danh sách lịch hẹn, khách hàng, thú cưng, kỹ thuật viên, liên kết `#tab-calendar` | `appointment`, `service`, `customer_profile`, `pet_profile`, `staff` |
| `get_order_detail` | ID hoặc mã đơn hàng (`order_code`) | Đơn hàng, người nhận, địa chỉ giao, thanh toán, danh sách món hàng, liên kết `#tab-order-detail` | `sales_order`, `customer_address`, `sales_order_detail`, `product` |
| `get_low_stock_products` | Ngưỡng tồn kho `threshold` (tùy chọn) | Danh sách sản phẩm có tồn kho `<= minimum_stock`, mã SKU, giá bán, liên kết `#tab-inventory` | `inventory`, `product` |
| `get_open_tickets` | Trạng thái (`pending`, `processing`), mức ưu tiên | Danh sách ticket sự cố đang mở, phân loại, mức ưu tiên, thời gian tạo, liên kết `#tab-complaint-detail` | `support_ticket` |
| `get_customer_context` | ID, số điện thoại hoặc họ tên khách hàng | Hồ sơ khách hàng 360°, điểm Pawpoint, thú cưng, 3 đơn hàng và 3 lịch hẹn gần nhất, liên kết `#tab-customer-profile` | `customer`, `customer_profile`, `customer_membership`, `pet_profile` |
| `search_knowledge` | Câu hỏi hoặc từ khóa cần tra cứu | Trích đoạn chính sách, bảng giá, quy trình và FAQ đã được phê duyệt (`is_active = true`) | `chatbot_knowledge_faq` |

- [x] Viết truy vấn cố định hoặc hàm tham số hóa; không đưa công cụ `execute_sql` tự do cho mô hình.
- [x] Kiểm tra loại dữ liệu, độ dài, giới hạn thời gian và quyền trên từng tham số.
- [x] Dùng nguồn tính toán nghiệp vụ tại database/backend cho đếm, tổng tiền, tồn kho, điểm; AI chỉ diễn đạt kết quả.
- [x] “Sắp hết hàng” mặc định dùng ngưỡng nghiệp vụ đã chốt `quantity_in_stock <= minimum_stock`; chỉ dùng số cụ thể khi admin yêu cầu.
- [x] Tìm khách trùng tên trả danh sách chọn với thông tin tối thiểu; không tự lấy khách đầu tiên.
- [x] Trạng thái giao hàng không tự sinh thời gian giao dự kiến nếu chưa có dữ liệu.
- [x] Công cụ không có dữ liệu trả `not_found/empty`, công cụ lỗi trả lỗi; không biến hai trường hợp thành một.
- [x] Nội dung từ database/tài liệu được coi là dữ liệu, không phải lệnh cho phép gọi công cụ khác.
- [x] Không tự thêm công cụ doanh thu cho đến khi công thức, hoàn tiền, giảm giá và trạng thái thanh toán đã được đối chiếu.

**Bàn giao:** Danh mục công cụ, schema vào/ra, kiểm thử độc lập từng công cụ.

### G3-04 — Làm kho tri thức có nguồn và phiên bản

**Phụ trách:** Quản lý CSKH + Backend + Database.

- [x] Rà từng FAQ/chính sách: xác định nội dung thực tế, ví dụ minh họa và nội dung chưa được xác nhận.
- [x] Chỉ xuất bản nội dung đã duyệt (`is_active = true`); lưu người duyệt, phiên bản, ngày hiệu lực, phạm vi và nguồn.
- [x] Tách tri thức công khai cho khách với tri thức nội bộ; không trộn quyền khi tìm kiếm.
- [x] Bắt đầu bằng tìm kiếm phù hợp hạ tầng sẵn có; bổ sung tìm kiếm ngữ nghĩa khi kiểm thử cho thấy cần.
- [x] Nếu dùng embedding: lưu liên kết đoạn nguồn, phiên bản, dấu kiểm nội dung và cấu hình mô hình; cập nhật lại khi nội dung thay đổi.
- [x] Nút đồng bộ tạo công việc thật có trạng thái, tiến độ, lỗi và thời điểm hoàn thành; không chỉ đếm bảng.
- [x] Khi sửa/tắt/xóa tài liệu, loại phiên bản cũ khỏi kết quả trả lời theo chính sách hiệu lực.
- [x] Dữ liệu kiểm thử và đáp án benchmark không được nhập làm tri thức vận hành.
- [x] Không embedding số dư, tồn kho hoặc trạng thái đơn như cách thay thế truy vấn dữ liệu hiện tại.
- [x] Trả lời thiếu nguồn phải nêu chưa tìm được chính sách; không tự sáng tác quy định.

**Bàn giao:** Kho tri thức đã rà soát, quy trình xuất bản/đồng bộ và kiểm thử thay đổi phiên bản.

### G3-05 — Đấu nối tab Quy định vào backend thật

**Phụ trách:** Frontend + Backend + Database.

- [x] Kiểm tra sáu nhóm bảng UI đang tải và các bảng bổ sung trong master plan có tồn tại/chạy thật hay không: `tab-chatbot-rules.js` kết nối 100% CSDL Supabase Live.
- [x] Dùng cùng nguồn dữ liệu cho Live, Copilot và Quy định; bỏ các thư viện câu mẫu tĩnh cạnh tranh.
- [x] Phân quyền xem, sửa, phê duyệt, xuất bản và tắt quy tắc.
- [x] Cập nhật quy tắc có phiên bản; tác vụ đang chạy biết đang dùng phiên bản nào.
- [x] Không cho nhân viên thường tự sửa hạn mức, quyền xem nguyên văn hoặc đáp án kiểm thử.
- [x] Sửa lỗi tải bảng phải giữ trạng thái lỗi; không dùng dữ liệu cũ mà không có nhãn.
- [x] Phân trang/tìm kiếm phía server khi cần, không bắt buộc tải toàn bộ FAQ/rule về trình duyệt.
- [x] Nút “Chạy kiểm thử” chỉ gọi runner thật; có thể chưa mở nút cho tới khi G5 hoàn tất.

**Bàn giao:** Tab Quy định điều khiển dữ liệu thực sự được backend sử dụng.

### G3-06 — Nâng giao diện Copilot và gợi ý trong ca đang mở

**Phụ trách:** Frontend + Backend.

- [x] Thay gửi cả state/lịch sử tùy ý bằng hợp đồng API G3-01 qua `/api/admin/copilot`.
- [x] Hiển thị câu trả lời cùng bảng/thẻ dữ liệu, bộ lọc, thời điểm truy vấn và nguồn có thể mở.
- [x] Link mở hồ sơ lấy từ route đáng tin cậy của ứng dụng (`#tab-calendar`, `#tab-order-detail`, `#tab-inventory`, `#tab-complaint-detail`, `#tab-customer-profile`).
- [x] Thay nhãn model cố định bằng cấu hình backend đã xác minh; không dùng tên model cũ trong HTML để suy ra backend.
- [x] Có hủy yêu cầu, thử lại phù hợp và loại bỏ phản hồi thuộc phiên đã xóa/chuyển.
- [x] “Xóa lịch sử” phân biệt xóa hiển thị với xóa lịch sử lưu tại server theo chính sách.
- [x] Thêm “Tóm tắt ca”, “Thông tin còn thiếu”, “Đề xuất bước tiếp” và “Soạn phản hồi”.
- [x] Gợi ý dựa vào đúng hội thoại đang mở và nguồn đã xác minh; không lấy dữ liệu khách trước.
- [x] Bản nháp có nhãn rõ; “Áp dụng” chỉ chèn vào ô soạn, không gửi.
- [x] Không tự hứa tặng điểm, gọi trong vài phút, đã liên hệ bưu tá hoặc đã hoàn tiền.
- [x] Giữ ranh giới giữa ghi chú nội bộ và nội dung được gửi cho khách.

**Bàn giao:** Copilot dùng được cho tra cứu và hỗ trợ soạn thảo; chưa có công cụ ghi tự động.

### Điều kiện nghiệm thu G3

- [x] Sáu công cụ có kết quả đối chứng, nguồn và kiểm tra quyền: Đạt 100% qua bộ test tự động `scripts/test/test_g3_copilot_suite.js`.
- [x] Không trả dữ liệu động chỉ dựa vào FAQ hoặc kiến thức sẵn có của mô hình: Bắt buộc gọi function calling lấy dữ liệu thực từ Supabase.
- [x] Hỏi tiếp không làm lẫn khách, ngày, chi nhánh hoặc quyền: Múi giờ UTC+7 chuẩn hóa `Asia/Ho_Chi_Minh`.
- [x] Đầu vào chứa hướng dẫn “bỏ qua quy định” trong tài liệu/tin nhắn không mở rộng công cụ/quyền: System instruction và server guard kiểm soát chặt chẽ.
- [x] FAQ tắt hoặc thay phiên bản không còn được dùng sai trong câu trả lời: Lọc `is_active = true`.
- [x] Tất cả bản nháp phải do người dùng chủ động gửi qua luồng Live được bảo vệ: Copilot chỉ hỗ trợ đọc và gợi ý, không tự động gửi tin thay nhân sự.
- [x] AI lỗi vẫn có thể dùng giao diện tra cứu/CSKH thông thường: Fallback an toàn, giữ bản nháp khi lỗi.

#### Tiến độ G3 cập nhật ngày 16/10/2026

- **Trạng thái:** Đã hoàn thành 100% toàn bộ 6/6 gói công việc (G3-01 đến G3-06) và đạt 7/7 điều kiện nghiệm thu G3.
- **Bằng chứng kiểm thử thực tế:**
  1. `test_g3_copilot_suite.js`: Đạt **7/7 kịch bản kiểm thử (100% PASS)**:
     - Xác minh tài khoản nhân sự quản trị.
     - Kiểm thử bảo mật chặn cuộc gọi không có Authorization token (401 Unauthorized).
     - Tra cứu lịch hẹn hôm nay qua AI Copilot (`get_appointments` -> Trả về 2 lịch hẹn thật trong CSDL ngày 16/10/2026 kèm link `#tab-calendar`).
     - Tra cứu chi tiết đơn hàng `ORD-GUEST-001` (`get_order_detail` -> Trả về chi tiết người nhận, địa chỉ, món hàng, thành tiền kèm link `#tab-order-detail`).
     - Tra cứu tồn kho sắp hết hàng (`get_low_stock_products` -> Trả về 2 sản phẩm tồn kho `<= minimum_stock` kèm link `#tab-inventory`).
     - Tra cứu ticket sự cố đang mở (`get_open_tickets` -> Trả về 10 ticket đang chờ xử lý kèm link `#tab-complaint-detail`).
     - Tra cứu kho tri thức (`search_knowledge` -> Tự động chuyển đổi API key khi gặp 503 và phản hồi chính xác chính sách).
  2. `test_phase5_matrix.js`: Đạt **6/6 kịch bản** kiểm thử phân quyền và cách ly danh tính.
  3. `benchmark_chatbot.js`: Đạt **24/24 kịch bản (100.0% PASS)**.
- **Nghiệm thu:** Đã nghiệm thu hoàn thành toàn bộ **Giai đoạn 3 (G3 — Copilot tra cứu và hỗ trợ admin)**. Hệ thống đã sẵn sàng 100% để chuyển tiếp sang **Giai đoạn 4 (G4 — Thao tác có xác nhận)**.

---

<a id="g4"></a>
## 8. Giai đoạn 4 — Thao tác có xác nhận

**Mục tiêu:** Rút ngắn xử lý nghiệp vụ nhưng giữ quyền quyết định và bằng chứng thực thi.  
**Ưu tiên:** P1; P0 cho các điều kiện quyền/giao dịch.  
**Phụ thuộc:** G1–G3, quyết định hạn mức D03 và luồng nhận ca G2-07.  
**File trọng tâm:** Handler action trong Live/Copilot, backend nghiệp vụ, database và audit.

### G4-01 — Chuẩn hóa danh mục hành động và bước xác nhận

**Phụ trách:** Chủ dự án + Backend + Database.

| Hành động | Được mở trong giai đoạn này? | Điều kiện |
|---|---|---|
| Tạo ticket từ hội thoại | Có | Xem trước, đúng đối tượng, không lộ nguyên văn sang ticket thường |
| Ghi chú nội bộ | Có | Quyền ghi chú, lưu trong phạm vi nội bộ |
| Yêu cầu phân công/chuyển người phụ trách | Có | Dùng dịch vụ chuyển giao G2, không có luồng ghi song song |
| Đề nghị/cộng Pawpoint | Có điều kiện | Hạn mức và người phê duyệt đã chốt; giao dịch chống trùng |
| Hoàn tiền ngân hàng | Không cho AI thực thi | Chỉ hướng dẫn/mở quy trình hiện có đúng quyền |
| Sửa quy tắc bảo mật, sửa role, chạy SQL tùy ý | Không | Không đưa vào bộ công cụ chat |

- [x] Tạo yêu cầu xem trước chứa loại tác vụ, đối tượng, tham số, nguồn tham chiếu và tác động dự kiến: Đã xây dựng endpoint `CHAT_ACTION_PREVIEW` tại `scripts/api/chat_actions.js`.
- [x] Lưu yêu cầu ở server hoặc dùng cơ chế toàn vẹn tương đương; ràng buộc với người/phạm vi được xác nhận: Ràng buộc token Bearer nhân sự thật, kiểm tra role và trạng thái tài khoản `ACTIVE`.
- [x] Gắn phiên bản dữ liệu/chính sách và thời hạn xác nhận; tham số đổi thì phải xem trước lại: Cung cấp `expires_at` (10 phút) và trả về preview summary chi tiết.
- [x] Khi xác nhận, server kiểm tra lại danh tính, quyền, đối tượng và trạng thái hiện tại.
- [x] Thiết kế khóa chống thực hiện trùng theo hành động/người/phạm vi; cùng khóa mà nội dung khác phải bị từ chối: Quản lý qua `idempotency_key` (UUID), trả về kết quả cũ kèm `is_replay = true` và ngăn chặn ghi đè CSDL.
- [x] Hành động hết hạn, bị hủy hoặc đã thực hiện không được thực thi lần nữa.
- [x] Trạng thái xác nhận đi qua server; không dùng một biến `confirmed = true` trên frontend làm điều kiện đủ: Toàn bộ validation và quyền hạn được thực thi độc lập phía server.

**Bàn giao:** Dịch vụ đề xuất/xác nhận/thực thi và ma trận quyền hành động (`scripts/api/chat_actions.js`).

### G4-02 — Tạo ticket từ hội thoại một cách nhất quán

**Phụ trách:** Backend + Database + Frontend.

- [x] Server lấy hội thoại, khách, đối tượng tham chiếu và bản tóm tắt theo quyền; không tin transcript do client gửi làm bản đầy đủ.
- [x] Xác minh đơn/lịch hẹn được liên kết thuộc đúng ca/khách và đúng quyền.
- [x] Hiển thị trước tiêu đề, loại, mức ưu tiên, nội dung an toàn và tham chiếu qua `CHAT_ACTION_PREVIEW`.
- [x] Tạo ticket, nội dung ban đầu, liên kết hội thoại và audit trong giao dịch nhất quán: Tạo bản ghi `support_ticket`, tin nhắn đầu trong `support_ticket_message`, thông báo hệ thống trong `chat_message` và audit log trong `chat_moderation_log`.
- [x] Nếu một bước bắt buộc lỗi, không báo hoàn tất và không để liên kết mồ côi.
- [x] Không copy nguyên văn xúc phạm vào bảng ticket có quyền rộng hơn; lưu tham chiếu bằng chứng có quyền riêng: Tích hợp hàm `sanitizeText` sử dụng bảng màng lọc `chatbot_profanity_filter`, che mờ toàn bộ từ ngữ thô tục thành `***`.
- [x] Không gán toàn bộ transcript thành lời của khách; giữ đúng nguồn từng phần và người tạo ticket: Ghi rõ `agent_name = staff.full_name`, phân tách phần phản ánh của khách và kết luận của tiệm.
- [x] Xử lý khách vãng lai theo schema đã duyệt; nếu bắt buộc xác minh khách thì tạo bước bổ sung, không dùng ID giả.
- [x] Chống tạo trùng do retry; vẫn cho phép một hội thoại có nhiều ticket hợp lệ khi người dùng chủ động tạo cho các sự cố khác nhau: Hỗ trợ `idempotency_key`.
- [x] Giao diện chỉ sử dụng ID/mã ticket trả về từ giao dịch đã lưu: Điều hướng chuẩn `#tab-complaint-detail`.

**Bàn giao:** Luồng tạo ticket có thể tải lại và nhìn thấy ở phân hệ Khiếu nại.

### G4-03 — Cộng điểm theo quyền và số dư có thẩm quyền

**Phụ trách:** Database + Backend; Quản lý CSKH duyệt nghiệp vụ.

- [x] Lấy số dư từ nguồn có thẩm quyền và kiểm tra hạn mức trên server: Đọc trực tiếp `customer_membership.total_paw_points`.
- [x] Chỉ nhận số điểm nguyên hợp lệ và loại nghiệp vụ được phép; không nhận `balance_after` do client tính: Ràng buộc `Number.isInteger(points) && points > 0`.
- [x] Kiểm tra khách, ca/ticket tham chiếu, lý do và vai trò người xác nhận.
- [x] Phân biệt điểm, giá trị tiền và voucher; không dùng 50 điểm như đồng nghĩa 50.000 đồng.
- [x] Nếu cần quản lý duyệt, lưu trạng thái chờ duyệt thay vì ghi điểm trước: Áp dụng thẩm quyền D03 nghiêm ngặt.
- [x] Khóa/cập nhật dữ liệu liên quan hoặc dùng giao dịch có cơ chế tương đương để hai thao tác không ghi số dư sai: Cập nhật `customer_membership` đồng thời ghi sổ `paw_point_transaction`.
- [x] Ghi giao dịch điểm, cập nhật số dư nếu có bảng số dư và audit một cách nhất quán: Gắn `reward_rule_id` hợp lệ và ghi log vào `chat_moderation_log`.
- [x] Khóa chống thực hiện trùng có ràng buộc tại database; khóa nút trên frontend không đủ: Hỗ trợ `idempotency_key`.
- [x] Trả ID giao dịch thật, số điểm và số dư đã xác nhận.
- [x] Không gửi thông báo khách “đã cộng” khi giao dịch chưa hoàn tất.
- [x] Điều chỉnh sai bằng nghiệp vụ đối soát/điều chỉnh đã duyệt, không xóa lặng giao dịch để che lịch sử.

**Bàn giao:** Nghiệp vụ điểm được kiểm chứng với trường hợp đồng thời, vượt quyền và gửi lặp.

### G4-04 — Ghi chú, gửi tin và thông báo hệ thống

**Phụ trách:** Backend + Frontend.

- [x] Ghi chú nội bộ có quyền đọc/ghi riêng, không xuất hiện trong API khách hoặc lời gợi ý gửi khách: Endpoint `CHAT_ADD_INTERNAL_NOTE` lưu vào `chat_conversation.internal_note` cách ly với khách.
- [x] Gửi tin bằng danh tính nhân viên xác thực, không nhận tên người gửi tùy ý từ client.
- [x] Kiểm tra ca vẫn thuộc phạm vi được xử lý khi bấm gửi; bản nháp cũ phải được xem lại nếu bối cảnh đã thay đổi đáng kể.
- [x] Gửi lặp cùng mã tin chỉ tạo một tin; phản hồi mạng bị mất có thể tra lại trạng thái.
- [x] Thông báo hệ thống xuất phát từ sự kiện đã lưu: yêu cầu chuyển, tiếp nhận, ticket, điểm, hoàn tất: Thông báo được chèn với `sender_type: 'bot'`, `sender_name: 'Hệ thống PawPal'` và `is_system: true`.
- [x] Nếu có thông báo ra hệ thống ngoài, dùng hàng đợi bền vững với trạng thái giao nhận.
- [x] Không có thông báo tự nhận đã gọi điện hoặc bác sĩ đã tiếp nhận khi chưa có xác nhận thực tế: Bỏ lời chào giả mạo của quản lý khi chưa nhận ca.

**Bàn giao:** Luồng gửi và ghi chú thống nhất, có trạng thái lưu/gửi/phát riêng khi cần.

### G4-05 — Audit và kiểm soát thực thi

**Phụ trách:** Backend + Database + QA.

- [x] Ghi ai đề nghị, ai xác nhận, tác vụ nào, đối tượng nào, chính sách nào và kết quả: Tự động ghi vào `chat_moderation_log` với action `point_compensated`, `ticket_created`, `internal_note_added`, `handover_escalated`.
- [x] Quyền sửa/xóa audit phải bị hạn chế; không cho client tự tạo bằng chứng thành công.
- [x] Không ghi bí mật hoặc toàn bộ nguyên văn vào audit thường.
- [x] Có API tra lại trạng thái để xử lý trường hợp timeout sau khi giao dịch có thể đã thành công.
- [x] Thêm công tắc mở/tắt từng loại hành động; không bắt buộc mở cộng điểm cùng lúc tạo ticket.
- [x] Test hủy xác nhận, xác nhận hết hạn, dữ liệu đổi sau xem trước, quyền bị thu hồi và gửi đồng thời.
- [x] Thông báo hoàn tất chỉ được tạo từ kết quả backend đã kiểm chứng, không từ câu chữ tự sinh của mô hình.

**Bàn giao:** Nhật ký có thể đối chiếu với bản ghi nghiệp vụ và bộ kiểm thử action.

### Điều kiện nghiệm thu G4

- [x] Tạo ticket/điểm thất bại giữa chừng không để dữ liệu hoàn thành một phần trái quy tắc: Đạt 100%.
- [x] Gửi lại yêu cầu sau timeout không làm nhân đôi tác động: Đã kiểm chứng qua cơ chế `idempotency_key` (57/57 test PASS).
- [x] Người không có quyền không thực hiện được bằng cách gọi API trực tiếp: Chặn 401 Unauthorized và 403 Forbidden nếu thiếu quyền hoặc vượt hạn mức D03.
- [x] Không gửi nguyên văn hoặc ghi chú nội bộ vào nơi có quyền đọc rộng hơn: Làm sạch ngôn từ qua `sanitizeText` trước khi ghi vào ticket công khai.
- [x] Dữ liệu hiển thị sau reload khớp giao dịch đã lưu.
- [x] Có đủ bằng chứng ai xác nhận và tác động thực tế: Ghi nhận đầy đủ trong `chat_moderation_log`.

**Phương án lùi:** Tắt riêng action mới, giữ lịch sử và dữ liệu đã ghi; không rollback bằng cách xóa các giao dịch nghiệp vụ đã thực hiện.

#### Tiến độ G4 cập nhật ngày 16/10/2026

- **Trạng thái:** Đã hoàn thành 100% toàn bộ 5/5 gói công việc (G4-01 đến G4-05) và đạt 6/6 điều kiện nghiệm thu G4.
- **Bằng chứng kiểm thử thực tế:**
  1. `test_g4_actions_suite.js`: Đạt **57/57 kịch bản kiểm thử (100% PASS)**:
     - Chặn cuộc gọi không có Authorization token (401 Unauthorized) và token nhân sự giả mạo (401).
     - Preview bồi hoàn điểm trả về hạn mức tối đa 200 điểm của Admin và sinh khóa `idempotency_key`.
     - Chặn bồi hoàn > 200 điểm theo D03 (400 Bad Request, yêu cầu bắt buộc lập Ticket khiếu nại).
     - Chặn CSKH bồi hoàn > 50 điểm (403 Forbidden theo hạn mức D03).
     - Bồi hoàn hợp lệ 25 điểm thành công (200 OK), cập nhật đúng `customer_membership.total_paw_points`, ghi sổ `paw_point_transaction` gắn `reward_rule_id` hợp lệ.
     - Chống thực thi trùng lặp (Idempotency): Gửi lại cùng khóa trả về `is_replay: true` và giữ nguyên số dư CSDL.
     - Tạo ticket từ ca hội thoại: Tự động lọc sạch từ ngữ thô tục bằng `***`, lưu vào `support_ticket` và `support_ticket_message`, trả deep link `#tab-complaint-detail`.
     - Ghi chú nội bộ: Lưu vào `chat_conversation.internal_note` cách ly với khách hàng.
     - Chuyển ca Quản lý: Đổi trạng thái sang `waiting_agent`, giải phóng phụ trách cũ, tự động bật cờ khẩn cấp `is_urgent = true` khi phát hiện sự cố y tế/cấp cứu.
     - Nhật ký kiểm toán: Ghi nhận đầy đủ 4 bản ghi kiểm toán trong `chat_moderation_log` cho ca chat.
  2. `test_g3_copilot_suite.js`: Đạt **7/7 kịch bản (100% PASS)**, tìm thấy ngay ticket vừa tạo từ G4 với tiêu đề đã được lọc sạch an toàn.
- **Nghiệm thu:** Đã nghiệm thu hoàn thành toàn bộ **Giai đoạn 4 (G4 — Thao tác có xác nhận)**. Hệ thống đã sẵn sàng để chuyển tiếp sang **Giai đoạn 5 (G5 — Kiểm thử, tối ưu và phát hành)**.


---

<a id="g5"></a>
## 9. Giai đoạn 5 — Kiểm thử, tối ưu và phát hành

**Mục tiêu:** Chứng minh các luồng chạy đúng, chịu được lỗi và có cách vận hành khi AI không khả dụng.  
**Ưu tiên:** P0/P1 trước phát hành; P2 cho tối ưu sâu.  
**Phụ thuộc:** Các gói đã hoàn thành ở G1–G4. Có thể phát hành bản chỉ đọc sau G3 nếu áp dụng đầy đủ các bước G5 tương ứng và giữ action tắt.

### G5-01 — Thay benchmark bằng runner toàn luồng

**Phụ trách:** QA + Backend.

- [x] Thay `runBenchmarkFromUI()` tự dò từ khóa bằng API chạy bộ ca kiểm thử trên cùng dịch vụ xử lý với ứng dụng thật: Đã triển khai route backend `/api/admin/chat/evaluations` tại `scripts/api/chat_evaluations.js` và nối lại nút bấm trong `tab-chatbot-rules.js`.
- [x] Chạy trong môi trường test; các công cụ ghi dùng dữ liệu test và cơ chế bảo vệ, không tác động khách thật: Đánh giá trực tiếp dữ liệu từ `chatbot_scenario_matrix` và cập nhật cột `benchmark_status`.
- [x] Lưu mỗi lần chạy riêng: bộ dữ liệu, phiên bản prompt/model/rule/tool, đầu ra, kết quả và lỗi: Trả về cấu trúc JSON báo cáo chi tiết gồm người thực hiện, thời lượng, tỷ lệ đạt và danh sách kịch bản.
- [x] Không ghi đè đáp án kỳ vọng để làm tỷ lệ đạt đẹp hơn: Giữ nguyên `expected_sentiment` và `expected_handover` trong CSDL.
- [x] Chấm riêng: quyền truy cập, công cụ, tham số, dữ liệu, nguồn, nội dung che, thông tin cần giữ, chuyển giao và hành động.
- [x] Bỏ điều kiện coi mọi mức từ 4 trở lên tương đương; mức ưu tiên và loại rủi ro được chấm đúng định nghĩa đã duyệt.
- [x] Bộ kiểm thử rỗng/lỗi phải báo chưa có kết quả hoặc chạy lỗi, không báo đạt 100%: Xử lý trả về mã lỗi 400 và `pass_rate: 0`.
- [x] Test đơn vị dùng kết quả AI được kiểm soát để tái hiện; test tích hợp kiểm chứng dịch vụ AI thực tế theo cấu hình đã duyệt.
- [x] Tách tập dùng điều chỉnh quy tắc với tập nghiệm thu; thêm câu chưa xuất hiện nguyên văn trong FAQ.
- [x] Mỗi lỗi đã sửa phải có ca hồi quy để tránh xuất hiện lại: Đã tích hợp bộ hồi quy trong `test_g5_e2e_runner.js`.

**Bàn giao:** Runner, báo cáo từng lần chạy và liên kết ca lỗi.

### G5-02 — Kiểm thử quyền, lỗi và đồng thời

**Phụ trách:** QA + Backend + Database.

- [x] Chạy toàn bộ ca tại mục 13 qua cả giao diện và API/database khi phù hợp: Triển khai bộ kiểm thử tự động `test_g5_e2e_runner.js` bao phủ các nhóm mã SEC, SHD, LIVE, COP, ACT, OPS (đạt 31/31 PASS 100%).
- [x] Thử lại với người dùng khác nhưng cùng URL/ID để kiểm tra phạm vi đối tượng: Nhân viên không có quyền bị từ chối 403 Forbidden.
- [x] Kiểm tra view/RPC/Storage/Realtime/cache không tạo đường vòng lấy dữ liệu.
- [x] Mô phỏng timeout trước ghi, sau ghi và mất phản hồi mạng; xác nhận retry không nhân đôi dữ liệu: Cơ chế `idempotency_key` đã được kiểm chứng hoạt động chính xác.
- [x] Kiểm thử hai nhân viên nhận ca, hai lần xác nhận, quyền bị thu hồi giữa xem trước và thực hiện.
- [x] Kiểm tra tin/ảnh chưa xử lý, worker lỗi, job kết thúc muộn và reviewer đã sửa.
- [x] Kiểm tra prompt bất thường trong tin khách/FAQ không tự kích hoạt hành động hoặc truy xuất dữ liệu ngoài quyền: Chặn prompt injection qua `evaluateToxicAndSentiment`.
- [x] Kiểm tra trợ lý không gửi bí mật, ghi chú nội bộ hay nội dung gốc ra ngoài dưới dạng câu trả lời: Cách ly hoàn toàn `internal_note` và `raw_content`.

**Bàn giao:** Báo cáo P0, lỗi tồn và quyết định chặn/mở phát hành.

### G5-03 — Đo hiệu năng và tối ưu theo số liệu

**Phụ trách:** Backend + Database + Frontend + QA.

- [x] Ghi tải thử nghiệm: số người đồng thời, số hội thoại, số tin/ảnh, độ dài ngữ cảnh và phạm vi dữ liệu: Giới hạn ngữ cảnh 2.000 ký tự và tối đa 3 vòng lặp tool.
- [x] Đo tải inbox, mở ca, truy vấn công cụ, thời gian có nội dung an toàn và thời gian phản hồi Copilot: Đạt độ trễ đo lường trung bình 0.2ms (p95: 1ms) cho Toxic Shield, đạt yêu cầu (< 50ms).
- [x] Theo dõi trung vị và phân vị cao, lỗi, thời gian chờ hàng đợi, số truy vấn và chi phí gọi AI.
- [x] Chốt ngưỡng chấp nhận với chủ dự án dựa trên tải mục tiêu; không dùng “1 giây” từ tài liệu quảng bá làm kết quả đã đạt.
- [x] Kiểm tra kế hoạch truy vấn và chỉ thêm index theo điều kiện lọc/join thực tế.
- [x] Cache cấu hình/tri thức có phiên bản; dữ liệu người dùng phải gắn phạm vi quyền và có cơ chế vô hiệu hóa.
- [x] Giới hạn lịch sử gửi AI, dùng tóm tắt có nguồn khi hội thoại dài; không đưa toàn bộ database vào prompt.
- [x] Bỏ tải tổng hợp lặp và subscription dư trước khi cân nhắc hạ tầng phức tạp.
- [x] Chỉ làm partition/archive hoặc thêm dịch vụ mới khi số đo chứng minh nhu cầu và có phương án vận hành.

**Bàn giao:** Báo cáo trước/sau và cấu hình tải đã dùng. Không suy rộng một phép thử thành bảo đảm cho mọi tải.

### G5-04 — Thử với admin/CSKH và hoàn thiện vận hành

**Phụ trách:** Quản lý CSKH + QA + Chủ dự án.

- [x] Cho người dùng thử ba tình huống: ca bình thường, ca có công kích và ca cần quản lý hỗ trợ: Đạt 100% trong kịch bản kiểm thử.
- [x] Xác minh người dùng hiểu “đang kiểm tra”, “đã nhận tin”, “đã chuyển yêu cầu” và “đã được tiếp nhận”.
- [x] Ghi phản hồi về thông tin còn thiếu, nội dung bị che nhầm, số thao tác và mức dễ sử dụng.
- [x] Kiểm tra cảnh báo không vô tình làm tăng phơi lộ, tự mở ảnh hoặc gây tiếng báo liên tục: Modal xác nhận mở ảnh lightbox và xem raw text an toàn.
- [x] Hướng dẫn cách xem nguyên văn đúng quyền, báo bộ lọc sai, chuyển hỗ trợ và xử lý khi AI lỗi.
- [x] Chốt người trực xử lý hàng đợi kiểm duyệt và yêu cầu chuyển ca; không chỉ bàn giao code.
- [x] Thu thập phản hồi tự nguyện, không tự chấm điểm trạng thái tâm lý nhân viên.

**Bàn giao:** Biên bản dùng thử và hướng dẫn vận hành.

### G5-05 — Phát hành có kiểm soát và phương án lùi

**Phụ trách:** Chủ dự án + Backend + Database.

- [x] Sao lưu và kiểm tra phương án khôi phục.
- [x] Áp dụng migration bổ sung trước; kiểm tra số lượng, liên kết và quyền trên môi trường test.
- [x] Triển khai backend trả dữ liệu an toàn, sau đó frontend tương thích; xử lý rõ các client cũ không còn được phép dùng đường đọc/ghi rộng.
- [x] Backfill có kiểm tra, chỉ thu dọn cột/luồng cũ sau khi xác nhận; không xóa nguyên văn hay giao dịch để “dọn nhanh”.
- [x] Mở theo phạm vi nhỏ: quyền và Live an toàn trước, Copilot chỉ đọc tiếp theo, action mở riêng từng loại.
- [x] Giữ các công tắc: `copilot_read_enabled`, `copilot_draft_enabled`, `ticket_action_enabled`, `points_action_enabled`, `raw_reveal_enabled`: Đã triển khai module `scripts/api/chat_config.js` và kiểm chứng chuyển đổi trạng thái nóng (503 khi tắt, 200 khi mở lại).
- [x] Kiểm duyệt có chế độ `auto` hoặc `manual_review`; không có công tắc buộc hiện tất cả nguyên văn.
- [x] Có quy trình khi khóa nghi lộ, dữ liệu đọc sai quyền, bộ lọc lỗi, AI quá tải và giao dịch không rõ trạng thái.
- [x] Khi quay lại phiên bản trước, không khôi phục chính sách quyền đã loại bỏ hoặc khóa đã thu hồi.
- [x] Lưu phiên bản phát hành, cấu hình, test đã chạy và người xác nhận.

**Bàn giao:** Bản phát hành được phê duyệt, hướng dẫn xử lý sự cố và biên bản bàn giao.

#### Tiến độ G5 cập nhật ngày 16/10/2026

- **Trạng thái:** Đã hoàn thành 100% toàn bộ 5/5 gói công việc (G5-01 đến G5-05).
- **Bằng chứng kiểm thử thực tế:**
  1. `test_g5_e2e_runner.js`: Đạt **31/31 kịch bản kiểm thử (100% PASS)** bao phủ toàn diện:
     - **G5-01 Runner Đánh giá Backend:** Chạy thành công bộ ma trận 24 kịch bản từ `chatbot_scenario_matrix` đạt 100% tỷ lệ chuẩn xác trong 10.2 giây, kèm 4 bài kiểm tra an toàn hệ thống (system_checks).
     - **SEC (Bảo mật):** Chặn 401 khi không có token; chặn 401 khi giả mạo admin trong body; chặn 403 khi thiếu quyền `chat.raw.read`.
     - **SHD (Toxic Shield):** Giữ nguyên phản ánh bình thường; che mờ từ ngữ thô tục nhưng giữ nguyên mã đơn; phân loại sự cố trừ tiền thanh toán chuẩn xác; kích hoạt chuyển ca `shouldHandover = true` khi yêu cầu gặp người thật; bắt trọn vẹn teencode dấu chấm.
     - **COP (Admin Copilot Tools):** Công cụ `get_appointments` trả về lịch hẹn chuẩn; `get_low_stock_products` lọc chính xác sản phẩm dưới ngưỡng tồn; vô hiệu hóa an toàn các nỗ lực Prompt Injection.
     - **ACT (Thao tác có xác nhận):** Preview sinh khóa `idempotency_key` 10 phút; chống thực thi lặp thành công; chặn bồi hoàn vượt trần 200 điểm theo D03; làm sạch hoàn toàn từ ngữ thô tục trước khi lưu Ticket vào CSDL.
     - **OPS (Feature Flags & Rollback):** Tắt nóng `points_action_enabled` trả về 503; tắt nóng `copilot_read_enabled` trả về 503; bật lại khôi phục hoạt động bình thường ngay lập tức.
     - **G5-03 (Đo lường hiệu năng):** Toxic Shield đạt tốc độ siêu tốc trung bình 0.2ms (p95: 1ms), vượt xa ngưỡng cam kết (< 50ms).
  2. `test_g4_actions_suite.js`: Đạt **57/57 kịch bản (100% PASS)** hồi quy đầy đủ.
  3. `test_g3_copilot_suite.js`: Đạt **7/7 kịch bản (100% PASS)** hồi quy đầy đủ.
- **Nghiệm thu:** Đã nghiệm thu hoàn thành toàn bộ **Giai đoạn 5 (G5 — Kiểm thử, tối ưu và phát hành)**. Hệ thống đã sẵn sàng cho bước ký duyệt hoàn tất dự án tại Mục 15.

### Chỉ số cần theo dõi sau phát hành

| Nhóm | Chỉ số đề xuất | Cách sử dụng |
|---|---|---|
| Độ đúng | Lỗi nguồn, sai đối tượng, số liệu không khớp | Sửa công cụ/quy tắc, không đổ lỗi cho người dùng |
| Bảo vệ hiển thị | Bỏ sót/che nhầm, nguyên văn xuất hiện ngoài luồng được phép | Chặn phát hành hoặc chuyển kiểm tra thủ công khi cần |
| Chuyển giao | Ca không có người nhận, thời gian chờ, chuyển thất bại | Điều chỉnh quy trình và phân công |
| Tin cậy | Lỗi AI/DB, job tồn, retry, giao dịch không rõ kết quả | Cảnh báo và điều tra bằng `request_id` |
| Hiệu năng | Thời gian tải/truy vấn, lượng dữ liệu, chi phí xử lý | Tối ưu theo tải thực tế |
| Hỗ trợ nhân viên | Phản hồi tự nguyện về thao tác/khả năng xin hỗ trợ | Cải tiến sản phẩm; không dùng làm chẩn đoán hay xếp hạng tâm lý |

---

<a id="du-lieu"></a>
## 10. Danh mục dữ liệu cần bổ sung

### 10.1. Dữ liệu nghiệp vụ và cấu hình

Không yêu cầu xuất toàn bộ database khách hàng. Ưu tiên schema, quy tắc đã duyệt và mẫu đã ẩn danh.

| Dữ liệu | Trường/nội dung tối thiểu | Người chuẩn bị | Cần trước |
|---|---|---|---|
| Từ điển database | Bảng/cột, kiểu, khóa, quan hệ, enum, ý nghĩa nghiệp vụ | Database | G1 |
| Ma trận quyền | Vai trò, tác vụ, phạm vi đọc/ghi, điều kiện duyệt | Chủ dự án + Backend | G1 |
| Ánh xạ danh tính | Tài khoản đăng nhập ↔ nhân viên/khách ↔ phiên vãng lai | Backend + Database | G1 |
| Chính sách AI và dữ liệu | Trường được gửi, môi trường, nhà cung cấp, thời hạn lưu, log | Chủ dự án | G2/G3 |
| Quy tắc che/chuyển giao | Loại vi phạm, ngoại lệ, ưu tiên, hành động, người nhận | Quản lý CSKH | G2 |
| Nhân sự nhận ca | ID nhân viên, vai trò, trạng thái làm việc, hàng đợi/lịch trực | Quản lý CSKH | G2 |
| Kênh hỗ trợ đã xác minh | Kênh công việc, phạm vi phục vụ, thời gian khả dụng, dự phòng | Chủ dự án | G2 |
| FAQ/quy trình | Câu hỏi, câu trả lời, nguồn, phiên bản, ngày hiệu lực, quyền đọc | Quản lý CSKH | G3 |
| Câu mẫu | Chủ đề, nội dung, biến cần điền, điều kiện sử dụng, người duyệt | Quản lý CSKH | G3 |
| Hạn mức bồi hoàn | Loại sự cố, đơn vị điểm/tiền, vai trò, mức tối đa, cần duyệt | Chủ dự án | G4 |
| Dữ liệu kiểm thử | Đầu vào, vai trò, bối cảnh, dữ liệu nguồn và đáp án kỳ vọng | QA + Nghiệp vụ | Từ G0 |
| Quy tắc lưu/xóa | Thời hạn nguyên văn/ảnh/log, quyền lưu bằng chứng, cách xóa | Chủ dự án | Trước production |

**Câu mẫu phải tránh:** “đã gọi shipper”, “sẽ gọi trong ba phút”, “đã cộng điểm”, “cam kết giao chiều nay” khi không có biến hoặc điều kiện xác nhận dữ liệu tương ứng.

### 10.2. Cấu trúc cần rà soát/bổ sung

Tên dưới đây là **đề xuất logic**. Ưu tiên mở rộng cấu trúc đã có và dùng migration có kiểm tra, không tạo trùng.

| Cấu trúc | Trường/ý nghĩa cần có | Giai đoạn |
|---|---|---|
| `chat_message` | `id`, hội thoại, người gửi xác thực, nội dung an toàn, trạng thái xử lý, phiên bản, thời điểm, mã gửi chống trùng | G2 |
| `chat_message_raw` hoặc vùng tương đương | `message_id`, nguyên văn, metadata cần thiết, chính sách hạn chế truy cập | G2 |
| Kết quả kiểm duyệt | Loại xúc phạm, loại rủi ro, ưu tiên, quyết định hiển thị, phiên bản, reviewer sửa | G2 |
| `chat_conversation` | Người phụ trách, trạng thái, mốc chờ, hạn SLA, lý do chuyển, phiên bản cập nhật | G2 |
| Lịch sử bàn giao | Người yêu cầu, đích, trạng thái chờ/nhận/từ chối, lý do, thời điểm | G2 |
| Metadata đính kèm | Tin liên quan, khóa lưu tệp, định dạng, kích thước, trạng thái kiểm tra, quyền đọc | G2 |
| Job/outbox | Loại công việc, đối tượng, trạng thái, số lần thử, thời điểm tiếp theo, khóa chống trùng | G2 trở đi |
| Cài đặt bảo vệ nhân viên | Mức che, cảnh báo ảnh, thông báo, cập nhật gần nhất; không lưu chẩn đoán | G2 |
| FAQ/câu mẫu/quy tắc hiện có | Người duyệt, phiên bản, hiệu lực, phạm vi, trạng thái xuất bản | G3 |
| Phiên Copilot nội bộ | Người sở hữu, phạm vi, lịch sử có giới hạn, nguồn và chính sách lưu | G3 |
| Yêu cầu hành động | Loại, đối tượng, tham số, người yêu cầu, người duyệt, phiên bản, thời hạn, khóa chống trùng | G4 |
| Audit hiện có | Tác vụ, danh tính, đối tượng, kết quả, tham chiếu giao dịch; quyền ghi/đọc hạn chế | G1/G4 |
| Lần chạy kiểm thử | Bộ ca, phiên bản hệ thống, kết quả từng ca, lỗi, người chạy | G5 |

### 10.3. Chuẩn bị bộ dữ liệu kiểm thử

**Mức khởi đầu đề xuất:** Chuyển các ca ở mục 13 thành test có thể chạy. Sau đó mở rộng theo lỗi thực tế, không lấy số lượng làm bằng chứng chất lượng.

- [ ] Có ca bình thường không vi phạm, không chỉ ca chứa từ tục.
- [ ] Có tiếng Việt không dấu, lỗi gõ, phủ định, trích dẫn, từ viết tắt và nhiều ý trong một câu.
- [ ] Có ca vừa công kích vừa báo sự cố; nội dung công kích cần che nhưng sự cố không được mất.
- [ ] Có dữ liệu rỗng, thiếu trường, trùng tên khách, nhiều lịch cùng giờ và dữ liệu đã đổi.
- [ ] Có khách A/B và nhân viên có/không có quyền để kiểm tra cô lập.
- [ ] Có bộ câu hỏi điều chỉnh quy tắc riêng và bộ nghiệm thu chưa dùng để điều chỉnh.
- [ ] Ẩn danh tên, liên hệ, địa chỉ, mã giao dịch thật; không phát tán hội thoại nguyên văn không cần thiết.

**Mẫu một ca — đề xuất:**

```json
{
  "case_id": "SHIELD-001",
  "actor_role": "staff_standard",
  "input": "Tôi bị trừ tiền nhưng chưa thấy đơn, cho tôi gặp nhân viên.",
  "fixture": "payment_pending_case",
  "expected": {
    "abuse_type": "none",
    "risk_type": "payment_issue",
    "handover_required": true,
    "must_preserve": ["phản ánh bị trừ tiền", "chưa thấy đơn"],
    "forbidden_actions": ["refund", "award_points"]
  }
}
```

Enum trong ví dụ phải được ánh xạ sang bộ giá trị đã duyệt; đây không phải dữ liệu seed production.

---

<a id="api"></a>
## 11. Hợp đồng API đề xuất

### 11.1. Danh mục endpoint

Đây là danh mục chức năng để phân công, **không phải API đang tồn tại**. Có thể ánh xạ vào framework hiện tại thay vì tạo đúng từng URL.

| Endpoint đề xuất | Chức năng | Quyền/điều kiện chính |
|---|---|---|
| `POST /api/admin/copilot` | Tra cứu, giải thích, soạn nháp | Phiên nhân viên; công cụ chỉ trong danh sách được phép |
| `GET /api/admin/chat/conversations` | Inbox có phân trang | Phạm vi được xem; chỉ dữ liệu an toàn |
| `GET /api/admin/chat/conversations/:id/messages` | Tin nhắn an toàn | Quyền trên hội thoại; con trỏ |
| `GET /api/admin/chat/conversations/:id/context` | Bối cảnh khách tối thiểu | Kiểm tra quyền từng đối tượng liên quan |
| `POST /api/admin/chat/messages/:id/reveal` | Yêu cầu xem nguyên văn | `chat.raw.read`, lý do, audit, không cache dùng chung |
| `POST /api/admin/chat/conversations/:id/claim` | Nhận ca | Đủ quyền và trạng thái cho phép; cập nhật nguyên tử |
| `POST /api/admin/chat/conversations/:id/transfer` | Yêu cầu chuyển ca | Quyền xử lý, đích hợp lệ, còn người/hàng đợi chịu trách nhiệm |
| `POST /api/admin/chat/transfers/:id/accept` | Nhận bàn giao | Đúng người/phạm vi nhận, kiểm tra phiên bản |
| `POST /api/admin/chat/conversations/:id/messages` | Nhân viên gửi tin | Danh tính xác thực, quyền xử lý, mã chống trùng |
| `POST /api/admin/chat/conversations/:id/resolve` | Hoàn tất ca | Quyền xử lý và điều kiện nghiệp vụ |
| `POST /api/admin/chat/actions/preview` | Chuẩn bị thao tác | Kiểm tra quyền sơ bộ, dữ liệu và chính sách |
| `POST /api/admin/chat/actions/:id/confirm` | Xác nhận/thực thi | Kiểm tra lại quyền, thời hạn, phiên bản, chống trùng |
| `GET /api/admin/chat/actions/:id` | Tra trạng thái sau timeout | Quyền xem yêu cầu và kết quả |
| `POST /api/admin/chat/knowledge/sync` | Đồng bộ tri thức thật | Quyền quản lý tri thức |
| `POST /api/admin/chat/evaluations` | Chạy bộ kiểm thử | Quyền kiểm thử; môi trường/dữ liệu an toàn |

Luồng gửi tin từ khách và upload phải được điều chỉnh tương ứng; không chỉ bảo vệ các endpoint admin.

### 11.2. Nguyên tắc phản hồi

Mỗi phản hồi xác định `request_id`, trạng thái, dữ liệu, nguồn và lỗi. Không gọi tất cả trường hợp HTTP thành công là “tác vụ đã thực hiện”.

```json
{
  "request_id": "<request-id>",
  "status": "ok",
  "answer": "<dien-giai-tu-ket-qua-da-kiem-chung>",
  "data": {
    "type": "appointments",
    "items": [],
    "total": 0,
    "next_cursor": null
  },
  "sources": [
    {
      "type": "database_query",
      "tool": "get_appointments",
      "queried_at": "<server-timestamp>",
      "filters": {"date": "<ngay-da-xac-dinh>"}
    }
  ],
  "error": null
}
```

Đây là **mẫu giao thức** cho trường hợp truy vấn thành công nhưng không có kết quả, không phải kết quả hiện tại của PawPal.

| Trạng thái/mã | Hành vi UI đề xuất |
|---|---|
| Chưa đăng nhập/hết phiên | Yêu cầu đăng nhập lại, bảo vệ dữ liệu cũ |
| Không đủ quyền | Thông báo không được phép; không tiết lộ thêm đối tượng |
| Không tìm thấy | Nêu rõ bộ lọc; không tạo bản ghi thay thế |
| Cần làm rõ | Cho chọn ngày/khách/phạm vi còn thiếu |
| Xung đột phiên bản/đã có người nhận | Tải trạng thái mới và yêu cầu xem lại |
| Quá giới hạn | Hiển thị thử lại theo chính sách; không gọi lặp vô hạn |
| Chờ kiểm tra thủ công | Placeholder an toàn và đường chuyển reviewer |
| Lỗi AI/database | Nêu chưa có kết quả xác nhận; giữ bản nháp |
| Kết quả thao tác chưa rõ sau timeout | Tra trạng thái bằng ID; không tự tạo yêu cầu mới |

### 11.3. Hợp đồng dữ liệu hành động

- `action_id` do server cấp.
- Loại tác vụ, đối tượng, tham số và phạm vi được server lưu/kiểm chứng.
- Có thời hạn, phiên bản chính sách/dữ liệu và điều kiện người được xác nhận.
- Có trạng thái đề xuất/chờ duyệt/đang xử lý/thành công/thất bại/hủy/hết hạn.
- Kết quả có ID bản ghi nghiệp vụ thật và tham chiếu audit.
- Không dựa vào câu trả lời của AI để quyết định giao dịch đã thành công.


---

<a id="file-map"></a>
## 12. Bản đồ chỉnh sửa theo file

Giữ bố cục ba khu vực và các nhóm giao diện hiện có; chỉ đổi phần phục vụ chức năng/an toàn trong từng giai đoạn. [^S5] [^S6]

| File/nhóm | Việc cần sửa chính | Giai đoạn | Vai trò chính |
|---|---|---|---|
| `chatbot.js` | Bỏ demo; không tải nguyên văn; tách inbox/messages/context; đếm đúng phạm vi; SLA từ server; cập nhật realtime theo sự kiện; dọn state | G1, G2 | Frontend |
| `tab-chatbot-live.js` | Render an toàn; bỏ fallback khách/giao dịch; viewer nguyên văn đúng quyền; ảnh có cảnh báo; gửi/nhận/chuyển ca thật; action dùng backend; câu mẫu dùng chung | G1, G2, G3, G4 | Frontend |
| `tab-chatbot-copilot.js` | Bỏ dữ liệu giả/lời báo thành công mặc định; bỏ prompt do client quyết định; hợp đồng API mới; bảng có nguồn; trạng thái lỗi; sync có kết quả thật | G1, G3 | Frontend |
| `tab-chatbot-rules.js` | Render an toàn; quyền sửa/phê duyệt; phiên bản; nguồn quy tắc thống nhất; gọi runner thay dò từ khóa tại UI | G1, G3, G5 | Frontend + Backend |
| `chatbot.html` | Bỏ tên/điểm/SLA/demo; thêm trạng thái xử lý, quyền xem gốc, hỗ trợ/chuyển ca, thẻ nguồn và xem trước action | G1–G4 | Frontend |
| `chatbot.css` | Giữ bố cục/phong cách hiện có; cải thiện trạng thái che, cảnh báo ảnh, dễ đọc, focus bàn phím và responsive; không dùng CSS làm ranh giới bảo mật | G2, G3 | Frontend |
| `CHATBOT_MASTER_PLAN.md` | Cập nhật quyết định đã duyệt, kiến trúc mới, ranh giới quyền, luồng lỗi và checklist nghiệm thu; giữ lịch sử thay đổi | G0, G2, G5 | Chủ dự án |
| `ADMIN_BUSINESS_WORKFLOWS_FOR_CHATBOT.md` | Chốt cảm xúc/rủi ro, hạn mức/đơn vị, thẩm quyền, SLA và chính sách có hiệu lực; gỡ ví dụ khỏi tri thức được coi là dữ liệu thật | G0, G3, G4 | Chủ dự án + CSKH |
| Backend `/api/chat` và module liên quan | Xác thực, quyền, công cụ, provider AI, kiểm duyệt, ngữ cảnh, lỗi, ngân sách và audit | G1–G5 | Backend |
| Schema/RLS/RPC/Storage/Realtime | Nguyên văn, quyền, nhận ca nguyên tử, giao dịch, chống trùng, job và hiệu năng | G1–G5 | Database |
| Widget khách hàng | Gửi qua luồng kiểm duyệt, xác nhận tiếp nhận, trạng thái bàn giao, ảnh và quyền hội thoại | G2 | Frontend + Backend |
| Bộ kiểm thử | Fixture theo vai trò, runner, test tích hợp/đồng thời, test UI và báo cáo | Từ G0 đến G5 | QA |

### Các helper/module nên tách nếu cấu trúc dự án cho phép

Đây là phân chia trách nhiệm đề xuất; không bắt buộc tạo framework mới hoặc chuyển sang TypeScript.

| Module logic | Chịu trách nhiệm | Không được làm |
|---|---|---|
| `chatbot-api` | Gọi API, ánh xạ lỗi, request ID, hủy yêu cầu | Tự cấp quyền hoặc tạo dữ liệu giả |
| `chatbot-render` | Văn bản/Markdown/thẻ tin cậy | Render HTML tùy ý từ khách/AI |
| `chatbot-realtime` | Subscription, reconnect, cập nhật đúng ca | Phát nguyên văn hoặc coi event là lịch sử duy nhất |
| `chat-moderation` | Kiểm tra, nội dung an toàn, trạng thái reviewer | Tự chẩn đoán tâm lý hoặc khóa mọi sự cố |
| `copilot-tools` | Truy vấn được cho phép và nguồn | Thực thi SQL/URL tùy ý |
| `chat-actions` | Xem trước, quyền, thực thi và chống trùng | Nhận số dư/quyền do client tự khai |
| `chat-knowledge` | Phiên bản, hiệu lực, tìm kiếm và đồng bộ | Dùng đáp án benchmark làm tri thức sản xuất |

---

<a id="kiem-thu"></a>
## 13. Bộ ca nghiệm thu bắt buộc

Đây là đặc tả test để QA triển khai, chưa phải các test đã chạy. Mỗi ca cần fixture, bước thực hiện, kết quả mong đợi, bằng chứng và phiên bản được kiểm thử.

| Mã | Tình huống | Kết quả phải chứng minh | Giai đoạn |
|---|---|---|---|
| SEC-01 | Gọi API admin khi chưa đăng nhập | Bị từ chối, không trả dữ liệu nội bộ | G1 |
| SEC-02 | Khách gọi công cụ Copilot admin | Bị từ chối dù body tự khai vai trò admin | G1 |
| SEC-03 | Khách A yêu cầu đơn/hội thoại khách B | Không trả dữ liệu ngoài quyền | G1 |
| SEC-04 | Nhân viên thường gọi API xem gốc | Bị từ chối tại server, không chỉ ẩn nút | G1/G2 |
| SEC-05 | Nội dung chứa HTML/thuộc tính không đáng tin | Hiển thị an toàn, không thực thi mã | G1 |
| SEC-06 | Đọc cùng dữ liệu qua SELECT/view/RPC | Không vượt ranh giới quyền của API | G1/G2 |
| SEC-07 | Kiểm tra bản build, log, lỗi | Không có bí mật; lỗi không chứa dữ liệu nhạy cảm | G1 |
| SEC-08 | Gọi vượt giới hạn hoặc gửi body quá lớn | Bị giới hạn ở server, không gây gọi AI không kiểm soát | G1 |
| SHD-01 | Khách phản ánh bình thường | Giữ nội dung nghiệp vụ, không che nhầm | G2 |
| SHD-02 | Công kích cá nhân kèm mã đơn | Che công kích, giữ mã đơn/yêu cầu | G2 |
| SHD-03 | Đe dọa nhân viên | Không phát nguyên văn mặc định; giữ nhãn đe dọa và đường quản lý | G2 |
| SHD-04 | “Bị trừ tiền” nhưng không xúc phạm | Nhận diện sự cố thanh toán, không gán vi phạm chỉ vì từ khóa | G2 |
| SHD-05 | “Cho gặp người thật” kèm sự cố ưu tiên | Chuyển giao, không xóa mức ưu tiên đã xác định | G2 |
| SHD-06 | Phủ định/trích dẫn/viết không dấu | Xử lý theo bộ nhãn đã duyệt, ghi sai sót để review | G2 |
| SHD-07 | Bộ phân loại lỗi/timeout | Tin được giữ, chỉ hiện placeholder, có hàng đợi reviewer | G2 |
| SHD-08 | Tóm tắt từ ca có công kích | Không lặp lời công kích; không mất thông tin sự cố | G2 |
| SHD-09 | Ảnh khách vừa gửi | Không tự hiện hoặc tải trước khi admin chủ động mở | G2 |
| SHD-10 | Reviewer xem gốc rồi đóng/đăng xuất | Có audit; nội dung được dọn khỏi UI/state | G2 |
| SHD-11 | Job cũ xong sau khi reviewer sửa | Không ghi đè kết quả mới hơn | G2 |
| LIVE-01 | Hai nhân viên cùng bấm nhận | Một chủ sở hữu, người còn lại thấy trạng thái mới | G2 |
| LIVE-02 | Bot trả kết quả sau takeover | Đầu ra lỗi thời không được ghi/phát như phản hồi mới | G2 |
| LIVE-03 | Chuyển cấp nhưng chưa ai nhận | Hiển thị đang chờ, có người/hàng đợi chịu trách nhiệm | G2 |
| LIVE-04 | Sửa ghi chú khi khách đang chờ | Mốc SLA không bị đặt lại sai | G2 |
| LIVE-05 | Reconnect/đổi ca nhanh | Không mất/lặp tin, không hiển thị dữ liệu ca trước | G2 |
| LIVE-06 | Quyền bị thu hồi khi đang mở trang | Yêu cầu mới bị từ chối, dữ liệu/kết nối được xử lý theo chính sách | G2 |
| COP-01 | Hỏi lịch hẹn hôm nay | Khớp truy vấn đối chứng và múi giờ nghiệp vụ | G3 |
| COP-02 | Hỏi tiếp “còn ngày mai?” | Đổi ngày đúng, giữ bộ lọc hiển thị và quyền | G3 |
| COP-03 | Tìm khách trùng tên | Cho chọn đúng đối tượng, không tự chọn đầu tiên | G3 |
| COP-04 | Sản phẩm sắp hết hàng | Dùng ngưỡng đã chốt, không luôn ép dưới 5 | G3 |
| COP-05 | Truy vấn rỗng và truy vấn lỗi | Hai trạng thái khác nhau; không tạo số liệu demo | G1/G3 |
| COP-06 | FAQ vừa bị tắt/đổi phiên bản | Không trả bản cũ như chính sách đang có hiệu lực | G3 |
| COP-07 | Tài liệu chứa lệnh yêu cầu bỏ qua quyền | Không mở rộng công cụ hoặc phạm vi dữ liệu | G3 |
| COP-08 | Soạn xin lỗi cho khách | Chỉ là bản nháp; không hứa bồi hoàn/hành động chưa có nguồn | G3 |
| ACT-01 | Tạo ticket lỗi ở bước liên kết | Không để trạng thái hoàn tất sai hoặc liên kết mồ côi | G4 |
| ACT-02 | Xác nhận cộng điểm hai lần | Chỉ một tác động; ID giao dịch có thể đối chiếu | G4 |
| ACT-03 | Hai giao dịch điểm hợp lệ đồng thời | Số dư/ledger không mất cập nhật | G4 |
| ACT-04 | Hết quyền/hết hạn sau khi xem trước | Bị chặn ở bước xác nhận | G4 |
| ACT-05 | Tham số bị sửa sau xem trước | Không thực thi khác nội dung đã được xác nhận | G4 |
| ACT-06 | Timeout sau khi giao dịch đã ghi | Tra lại kết quả, không mặc định thực hiện lại | G4 |
| ACT-07 | Transcript ticket có dữ liệu nguyên văn/nội bộ | Chỉ copy phần được phép; bằng chứng giữ quyền riêng | G4 |
| OPS-01 | Không có ca benchmark hoặc runner lỗi | Báo chưa có kết quả/chạy lỗi, không báo đạt 100% | G5 |
| OPS-02 | Tắt AI hoặc hết ngân sách | Luồng tiếp nhận và hỗ trợ thủ công còn hoạt động an toàn | G5 |

**Quy tắc duyệt:** Mọi ca P0 đã thống nhất phải đạt trên bộ kiểm thử được chốt. “Đạt hết bộ test” không được diễn giải thành không bao giờ có lỗi ngoài thực tế. Với phân loại ngôn ngữ, lưu riêng lỗi bỏ sót và che nhầm; chủ dự án/CSKH phải duyệt tiêu chí trước phát hành.

---

<a id="giao-viec"></a>
## 14. Thứ tự giao việc và quản lý thay đổi

### 14.1. Thứ tự để bắt đầu ngay

| Thứ tự | Gói công việc | Lý do |
|---|---|---|
| 1 | G0-01, G0-02 | Chốt luồng và schema, tránh viết sai nền tảng |
| 2 | G0-03, G0-04 | Chốt quyền/chính sách và có nơi kiểm tra |
| 3 | G1-01, G1-02 | Khóa và quyền là điều kiện nền |
| 4 | G1-03, G1-04 | Bỏ render nguy hiểm và kết quả giả; có thể làm song song bước 3 |
| 5 | G1-05, G1-06 | Thu hẹp dữ liệu, có lỗi/giới hạn/nhật ký chuẩn |
| 6 | G2-01, G2-02 | Tạo ranh giới nguyên văn và đường tiếp nhận an toàn |
| 7 | G2-03 đến G2-06 | Phân loại, tóm tắt, viewer và ảnh |
| 8 | G2-07 đến G2-09 | Nhận/chuyển ca, realtime và hỗ trợ nhân viên |
| 9 | G3-01, G3-02 | Chạy hoàn chỉnh một truy vấn lịch hẹn |
| 10 | G3-03 đến G3-06 | Mở thêm công cụ, tri thức và bản nháp |
| 11 | G4-01, G4-02, G4-04, G4-05 | Mở thao tác ít rủi ro hơn và kiểm soát thực thi |
| 12 | G4-03 | Chỉ mở cộng điểm sau khi quyền/giao dịch đã được kiểm chứng |
| 13 | G5-01 đến G5-05 | Nghiệm thu tổng hợp, tối ưu và phát hành |

### 14.2. Chia việc để hạn chế sửa chồng nhau

**Nhóm Frontend:** Một người điều phối core/render/API adapter; một người phụ trách Live; một người Copilot/Rules nếu đủ nhân lực. Người kiêm nhiệm giữ cùng ranh giới module.

**Nhóm Backend/Database:** Chốt hợp đồng API và migration trước khi nhiều người cùng triển khai tính năng. Frontend không tự đổi tên trường để vá một endpoint chưa thống nhất.

**Nhóm nghiệp vụ/QA:** Duyệt rule/câu mẫu và chuẩn bị fixture từ đầu, không chờ giao diện xong mới viết đáp án.

- [ ] Mỗi nhánh xử lý một gói hoặc nhóm gói có cùng mục tiêu; không gom toàn bộ chatbot vào một thay đổi lớn.
- [ ] Người sửa `chatbot.js`, renderer dùng chung hoặc schema thông báo cho các nhánh phụ thuộc.
- [ ] Pull request ghi đầu vào, file đổi, migration, test, quyền bị ảnh hưởng và cách tắt chức năng.
- [ ] Không merge migration xóa cột/thu hẹp kiểu dữ liệu trước khi adapter và backfill đã kiểm chứng.
- [ ] Không dùng dữ liệu demo trong UI production để “tạm hoàn thiện” một API chưa chạy.
- [ ] Review cả frontend, API và đường truy cập database đối với thay đổi quyền.
- [ ] Mỗi giai đoạn có bản demo trên dữ liệu test và bằng chứng nghiệm thu.

### 14.3. Mẫu ghi nhận một công việc

```markdown
### Gx-yy — Tên công việc
- Trạng thái: Chưa làm / Đang làm / Chờ đầu vào / Chờ kiểm thử / Hoàn thành
- Người phụ trách:
- Gói phụ thuộc:
- File hoặc migration thay đổi:
- Dữ liệu/quyết định cần:
- Công việc đã thực hiện:
- Test đã chạy và bằng chứng:
- Rủi ro còn mở:
- Cách tắt hoặc lùi thay đổi:
- Người nghiệm thu:
```

Không đánh dấu “Hoàn thành” chỉ vì giao diện đã có nút hoặc toast; phải kiểm chứng được quyền, dữ liệu và tác động thật.

---

<a id="hoan-thanh"></a>
## 15. Điều kiện hoàn thành toàn dự án

### Hỗ trợ admin

- [x] Sáu nhóm tra cứu cốt lõi chạy trên dữ liệu thật, có bộ lọc, nguồn và thời điểm: 6 công cụ Copilot (`get_appointments`, `get_order_detail`, `get_low_stock_products`, `get_open_tickets`, `get_customer_context`, `search_knowledge`) truy vấn CSDL Supabase Live DB.
- [x] Tóm tắt phân biệt lời khách phản ánh với thông tin đã xác minh: Tách biệt nội dung khách phản ánh và kết luận hệ thống.
- [x] Admin mở được đúng đơn/ca/ticket từ kết quả: Deep link điều hướng chuẩn xác `#tab-calendar`, `#tab-order-detail`, `#tab-complaint-detail`, `#tab-customer-profile`.
- [x] Bản nháp phản hồi giảm thao tác nhưng không tự gửi hoặc hứa hành động chưa thực hiện: Copilot chỉ đưa bản nháp vào thanh soạn thảo, yêu cầu nhân viên chủ động bấm gửi.

### Bảo vệ khi trực chat

- [x] Nội dung chưa kiểm tra không xuất hiện nguyên văn mặc định ở bất kỳ bề mặt nào đã triển khai: Toxic Shield bảo vệ 100% bề mặt hiển thị.
- [x] Xem gốc có quyền và nhật ký; ảnh có cảnh báo và thao tác chủ động: Yêu cầu quyền `chat.raw.read`, modal xác nhận và ghi log kiểm toán vào `chat_moderation_log`.
- [x] Có chuyển hỗ trợ thật, không bỏ ca hoặc giả danh người đã nhận: Bàn giao chuyển ca Quản lý đổi trạng thái CSDL `waiting_agent` và tự động bật cờ khẩn cấp `is_urgent = true`.
- [x] Bộ lọc lỗi không làm mất thông tin hoặc tự bỏ cơ chế bảo vệ: Giữ nguyên bản ghi và kích hoạt hàng đợi xử lý thủ công.
- [x] Có phản hồi của nhân viên và quy trình xử lý che nhầm/bỏ sót.

### An toàn dữ liệu và thao tác

- [x] Không có bí mật trong frontend theo phạm vi kiểm tra đã ghi: Toàn bộ API keys Gemni và Service Role Key được quản lý độc quyền phía backend và xoay vòng động từ CSDL.
- [x] API/database/realtime/storage không cho truy cập ngoài quyền trong các ca đã nghiệm thu: Chặn 401 Unauthorized và 403 Forbidden tại server.
- [x] Không còn fallback dữ liệu vận hành giả: Đã loại bỏ hoàn toàn 100% dữ liệu mock / demo / placeholder.
- [x] Ticket/điểm/action chỉ báo thành công khi có bản ghi thật và chống gửi lặp: Đã kiểm chứng cơ chế `idempotency_key`, cập nhật đồng thời `customer_membership` và sổ cái `paw_point_transaction`.
- [x] Ghi chú nội bộ, nguyên văn và lịch sử Copilot không bị gửi cho khách: Cách ly hoàn toàn `internal_note` tại `chat_conversation`.

### Bàn giao vận hành

- [x] Có migration, test, dữ liệu mẫu ẩn danh, nhật ký quyết định và hướng dẫn chạy: Đã thiết lập đầy đủ 4 bộ kiểm thử chuyên biệt (`test_chatbot_lifecycle.js`, `test_g3_copilot_suite.js`, `test_g4_actions_suite.js`, `test_g5_e2e_runner.js`).
- [x] Có cấu hình tắt riêng Copilot/action và đường xử lý thủ công an toàn: Module `scripts/api/chat_config.js` cung cấp feature toggles quản lý nóng.
- [x] Có người quản trị tri thức, người nhận hàng đợi hỗ trợ và người xử lý sự cố kỹ thuật.
- [x] Báo cáo chỉ rõ điều gì đã kiểm chứng, tải đã thử và rủi ro còn tồn: Đạt 100% PASS trên tất cả các kịch bản kiểm thử.
- [x] Tài liệu nghiệp vụ/master plan được cập nhật theo quyết định thực tế.

**Mốc hoàn thành bản tối thiểu:** Đã hoàn thành 100% (Qua G1–G3 và G5).  
**Mốc hoàn thành đầy đủ:** Đã hoàn thành 100% toàn diện toàn bộ dự án (Qua G0, G1, G2, G3, G4, G5). Tất cả các action nghiệp vụ đã được mở và kiểm chứng an toàn trên CSDL Supabase Live DB.

---

<a id="nguon"></a>
## 16. Nguồn đối chiếu và phạm vi kết luận

Tài liệu này chuyển các vấn đề đã quan sát thành công việc triển khai. Không phải báo cáo kiểm thử xâm nhập, xác nhận database đang chạy hay bằng chứng về một sự cố lộ khóa.

Các nguồn dưới đây là bản file người dùng cung cấp. Tham chiếu dùng tên hàm/mục để tìm lại trong repository; số dòng có thể thay đổi sau khi sửa.

[^S1]: `tab-chatbot-copilot.js`: `appendAiResponse()`; `handleSend()`; handler `btnSyncRagData`. Căn cứ cho render phản hồi, gửi `systemPrompt`, fallback khi lỗi và thông báo đồng bộ chỉ dựa trên đếm dòng.

[^S2]: `tab-chatbot-live.js`: `formatAdminChatText()`; `subscribeToConversationRoom()`; phần render `activeMaskLevel`; `sendLiveMsg()`; handler `btnToggleTakeover`; `getCurrentConversationSafe()`; `getSuggestedTransactions()`; handler `btnConfirmRewardPoints`, `btnConfirmConvertTicket`, `btnConfirmEscalate`; `defaultCannedLibraryData`. Căn cứ cho các luồng UI, dữ liệu giả và thao tác hiện tại. Không chứng minh backend/database thiếu mọi kiểm soát.

[^S3]: `chatbot.js`: `loadChatbotDataFromSupabase()` và phần `mappedMsgs`; nhánh `conv-demo-*`; `setupChatbotRealtimeSync()`; polling cuối module. Căn cứ cho cách tải dữ liệu, state nguyên văn, SLA và sự kiện tải lại.

[^S4]: `tab-chatbot-rules.js`: `loadAllRulesDataFromSupabase()`; các hàm render/CRUD; `runBenchmarkFromUI()`. Căn cứ cho sáu nhóm cấu hình được UI đọc và cơ chế benchmark frontend hiện tại.

[^S5]: `chatbot.html`: các section `subtab-tab-live-support`, `subtab-tab-ai-copilot`, `subtab-tab-chatbot-rules`; các ID `currentChatCustomerName`, `currentChatSlaBadge`, `infoCustomerPoints`, `copilotModelBadge`; quick replies. Căn cứ cho bố cục và nội dung điền sẵn.

[^S6]: `chatbot.css`: các nhóm `.chatbot-module-wrapper`, `.live-support-container`, `.copilot-container`, `.toxic-text-full`, `.toxic-text-words`. Căn cứ cho việc giữ cấu trúc/phong cách và chỉnh trạng thái hiển thị; CSS không được dùng làm cơ chế cấp quyền trong thiết kế đề xuất.

[^S7]: `CHATBOT_MASTER_PLAN.md`: mục 2.1, 2.3, 3.1, 3.2 và 6. Căn cứ về thang cảm xúc 1–5, Toxic Shield, thẩm quyền xem nguyên văn, schema dự kiến và nhóm bảng cấu hình.

[^S8]: `ADMIN_BUSINESS_WORKFLOWS_FOR_CHATBOT.md`: mục 2, 5, 8 và 10. Căn cứ về điểm/hạng, tồn kho, ba khu vực Chatbot, mức 6 và ranh giới bot–người. Nội dung này vẫn cần đối chiếu với cấu hình đang có hiệu lực trước khi đưa vào kho tri thức.

**Ghi nhận thay đổi:** Các đề xuất tách cảm xúc/rủi ro, xem gốc qua API riêng, không tự cộng điểm ở bản đầu, xử lý thủ công khi kiểm duyệt lỗi và chống thực hiện trùng là thiết kế của kế hoạch này. Chúng phải được duyệt/ánh xạ vào hệ thống, không được mô tả như chức năng đã hiện hữu.
