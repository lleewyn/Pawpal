# PawPal — Rà soát chatbot chậm, quá tải và lỗi API (bản cập nhật từ 4 file mới)

**Ngày rà soát:** 17/10/2026  
**Phạm vi:** `chatbot(1).js`, `tab-chatbot-copilot(1).js`, `tab-chatbot-live(1).js`, `chat.js`.  
**Mục tiêu:** giảm truy vấn Supabase, giảm gọi Gemini thừa, bảo đảm tin nhắn lưu được và bảo vệ quyền dữ liệu/tâm lý CSKH.  
**Trạng thái:** đã kiểm tra cú pháp JavaScript và phân tích mã nguồn; **chưa chạy môi trường production**, chưa có log 429/latency, RLS, `chat_config.js`, `chat_actions.js`, `staff_auth.js`, route config hoặc `package.json`.  
**Quan trọng:** Không sửa source của bạn trong lần rà soát này. Đây là backlog và cách fix để giao cho người code/Codex.

## 1. Kết luận ngắn: đang nghẽn ở đâu?

1. **Supabase và giao diện:** một refresh tải **8 nhóm dữ liệu** (trong đó có toàn bộ `chat_message(*)`, hóa đơn, lịch hẹn, lịch sử điểm); thêm polling **10 giây**, ba nguồn realtime, focus. Chỉ riêng một tab đang mở có khoảng `6 lần refresh/phút × 8 query = 48 query/phút` từ polling, **chưa tính realtime**, nếu tất cả request được phát thành công. Đây là ước tính **từ code**, không phải số liệu đo thực tế.
2. **Gemini và Copilot:** một yêu cầu Copilot có thể đi qua **tối đa 8 lượt thử**, và mỗi lượt có thể gọi model ban đầu + **3 vòng follow-up function calling**. Kịch bản xấu nhất lý thuyết là khoảng **32 lượt model** cho một câu hỏi (chưa tính embedding); không có bằng chứng tất cả các lượt này đã xảy ra ở production.
3. **Chat khách hàng:** một lần xử lý có thể truy vấn cấu hình, phiên chat, tin trước, ticket, toàn bộ giao dịch Pawpoint của khách, ghi message, cập nhật conversation, gọi Gemini, tìm FAQ/embedding/vector, rồi ghi phản hồi. Các phần này không có đủ log để xác định chính xác chi phí từng bước.
4. **Tải tin nhắn nặng:** ảnh tối đa 5MB đang nhúng thành base64 ngay trong `chat_message` thay vì Storage; việc tải lại lịch sử làm tăng dữ liệu qua mạng.
5. **Sai trạng thái:** SSE phát text nhưng không cộng vào biến lưu; khi AI lỗi lại trả JSON `HTTP 200 / done:true`. Đây là lỗi chức năng, không chỉ là chậm.
6. **Bảo mật không thể để sau:** token `local:<id>` có thể giả mạo và `raw_content` được truy vấn về frontend. Phải chặn trước khi triển khai rộng.

### Phân biệt lỗi qua Network

| Biểu hiện | Nhóm nguyên nhân có khả năng | Quan sát để xác minh |
|---|---|---|
| `/api/admin/copilot` 404/405 | Route chưa nối | Kiểm tra router/rewrite |
| Gemini 429 / RESOURCE_EXHAUSTED | RPM/TPM/RPD/quota | Thời gian, project/model, lượt gọi, Retry-After |
| API 502/503/504 | Upstream/backend quá tải/timeout | Request ID, log server, latency breakdown |
| Nhiều `/rest/v1/` trùng lặp | Polling, realtime fan-out | Network waterfall trước/sau |
| Chat trả lời nhưng refresh mất tin | SSE không lưu bot reply | DB `chat_message`, SSE done event |
| Chat chậm tăng mạnh sau gửi ảnh | Base64 trong row/lịch sử | Kích thước response/body |
| Khách khác bị lộ dữ liệu | Auth/ownership/RLS | Kiểm thử hai tài khoản độc lập |

**Nguyên tắc ưu tiên:** Sửa bảo mật và độ đúng trước, rồi giảm tải frontend, tiếp đó mới tối ưu AI. **Truy vấn Supabase nhiều không tự động biến thành Gemini 429**, nhưng có thể gây chậm web/DB và làm nhiều yêu cầu cùng chờ; lỗi 429 phải xác nhận ở upstream.

---

## 2. Danh mục lỗi theo mã cố định

Mỗi lỗi dưới đây ghi **vị trí code, tác động, cách sửa và test nghiệm thu**. `P0` là chặn phát hành, `P1` phải xử lý để hệ thống chạy ổn định, `P2` hoàn thiện sau.

### CB-01 · P0 — Bảo mật

- **Vị trí:** `chat.js:1045–1055, 1219–1229`; `tab-chatbot-copilot(1).js:104–131`
- **Đã thấy trong code:** Backend chấp nhận `Authorization: Bearer local:<staff_id>` chỉ dựa vào việc ID tồn tại và tài khoản ACTIVE. ID không phải chữ ký xác thực, có nguy cơ mạo danh nhân viên và gọi công cụ đọc dữ liệu.
- **Cách sửa cụ thể:** Chuyển sang Supabase Auth JWT được kiểm tra phía server bằng `auth.getUser(token)` hoặc session cookie HTTP-only được ký. Ánh xạ `auth_user_id → staff.id`, kiểm tra `account_status` và quyền ở từng endpoint/tool. Xóa mọi fallback `local:*`, kể cả ID mặc định; giai đoạn chuyển đổi phải triển khai đăng nhập thật trước.
- **Kiểm thử đạt:** Gửi `Bearer local:<id của nhân viên hợp lệ>` từ client chưa đăng nhập: phải trả 401; JWT của nhân viên đã khóa trả 403; JWT đúng quyền được xử lý.

### CB-02 · P0 — Bảo mật

- **Vị trí:** `chat.js:78–126, 391–444, 1305–1338`
- **Đã thấy trong code:** Nhánh token khách `local:<customer_id>` cũng chỉ tra ID; `conversationId` do client gửi được tìm theo ID mà không so chủ sở hữu. Backend dùng service-role để đọc/ghi nên có nguy cơ ghi vào cuộc trò chuyện không thuộc người gọi. Guest `sessionToken` cũng chưa được chứng minh là đáng tin.
- **Cách sửa cụ thể:** Không tin `customerId`/`conversationId`/`sessionToken` do client tự khai. Với khách đăng nhập, lấy `customer_id` từ JWT và chỉ select/update conversation có `.eq('customer_id', authCustomerId)`; với khách vãng lai dùng cookie phiên ngẫu nhiên, đủ mạnh, gắn server-side với conversation. Trả 403/404 khi phiên không thuộc khách. Không fallback từ `auth.users.id` thành `customer.id` nếu mapping thất bại.
- **Kiểm thử đạt:** Hai khách A/B: A gửi `conversationId` của B phải không đọc/ghi được; thay token khách bằng local ID bất kỳ bị từ chối.

### CB-03 · P0 — Bảo vệ tâm lý / Quyền dữ liệu

- **Vị trí:** `chatbot(1).js:265–273, 349–357`; `tab-chatbot-live(1).js:118–158`
- **Đã thấy trong code:** Lệnh `select('*, chat_message(*)')` mang cả `raw_content` về trình duyệt. Che chữ tại UI không phải kiểm soát truy cập: nguyên văn vẫn có thể nằm trong Network/DevTools, phá mục tiêu Toxic Shield.
- **Cách sửa cụ thể:** Tách bảng/view `admin_chat_message_safe` chỉ trả `content` đã che, `is_toxic`, metadata an toàn; không select raw trong browser. RPC/API riêng `CHAT_GET_RAW_CONTENT` kiểm JWT + quyền + lý do truy cập + audit server-side. RLS/ví dụ view cần được DB reviewer xác nhận.
- **Kiểm thử đạt:** Nhân viên CSKH thường không bao giờ nhìn thấy `raw_content` trong JSON Network; quản lý được cấp quyền mới lấy qua endpoint có audit.

### CB-04 · P0 — Prompt / Phân quyền

- **Vị trí:** `chat.js:1528–1560`
- **Đã thấy trong code:** API chat khách cho phép `req.body.systemPrompt` thay hẳn system instruction mặc định. Người dùng có thể tự gửi chỉ thị vượt qua chính sách an toàn và ảnh hưởng cách gọi công cụ.
- **Cách sửa cụ thể:** Loại bỏ `req.body.systemPrompt` khỏi API công khai; system prompt chỉ được lấy từ cấu hình server đã duyệt. Prompt bổ sung người dùng là dữ liệu không đáng tin ở vai trò user. Giới hạn độ dài và kiểm schema body bằng validator.
- **Kiểm thử đạt:** Client cố gửi `systemPrompt` yêu cầu bỏ qua quy định: nội dung không tác động system role; các quy tắc y tế/quyền được giữ.

### CB-05 · P0 — Phân quyền công cụ

- **Vị trí:** `chat.js:1031–1074, 597–956, 1085–1157`
- **Đã thấy trong code:** Copilot chỉ kiểm tra nhân viên ACTIVE rồi có thể gọi bộ công cụ đọc đơn, hồ sơ khách, số điện thoại/địa chỉ qua service-role. Chưa thấy kiểm `permissions` riêng cho từng tool hay giới hạn chi nhánh/phạm vi khách.
- **Cách sửa cụ thể:** Xây allowlist server-side dạng `tool → permission → scope`; mỗi lần gọi tool kiểm quyền và filter dữ liệu theo chi nhánh/quan hệ phụ trách trước query. Tránh đưa PII không cần thiết vào prompt. Lưu audit tên tool, actor, phạm vi, số hàng.
- **Kiểm thử đạt:** Nhân viên không có `customer.read` hỏi số điện thoại khách khác phải 403 hoặc câu trả lời không có PII; nhân sự đúng chi nhánh chỉ xem phạm vi được cấp.

### CB-06 · P0 — Mất tin nhắn

- **Vị trí:** `chat.js:1635–1709`
- **Đã thấy trong code:** Nhánh SSE ghi từng chunk bằng `res.write(...)` nhưng không tăng `fullResponseText`; câu trả lời có thể không được insert vào `chat_message`. Chế độ JSON tích lũy được nhưng SSE thì không.
- **Cách sửa cụ thể:** Trong CẢ hai vòng stream, luôn `fullResponseText += text` trước khi gửi chunk. Chỉ xác nhận hoàn tất sau khi insert thành công, lưu `request_id`/`message_id` để retry không sinh bản ghi trùng. Phân biệt response hiển thị và response đã được persist.
- **Kiểm thử đạt:** Gửi 1 câu hỏi qua SSE, reload trình duyệt: câu trả lời của bot vẫn tồn tại; database có đúng 1 tin nhắn bot và text đúng.

### CB-07 · P0 — Xử lý lỗi

- **Vị trí:** `chat.js:1735–1753`
- **Đã thấy trong code:** Khi API Gemini/Supabase lỗi, JSON trả `status(200)` kèm `done:true`; SSE lỗi cũng gửi `done:true`. Frontend có thể coi tác vụ thất bại là thành công.
- **Cách sửa cụ thể:** Xây error contract thống nhất: JSON lỗi trả 429/503/500 và `ok:false`; nếu SSE đã gửi headers 200 thì phát `event:error` + `done:false`, rồi đóng stream. Không gửi exception thô cho người dùng; ghi `request_id` trong log.
- **Kiểm thử đạt:** Giả lập Gemini 429/503: HTTP đúng mã khi chưa stream, UI báo lỗi, không tạo 'đã xử lý thành công'.

### CB-08 · P0/P1 — Bão request Gemini

- **Vị trí:** `chat.js:1105–1169`
- **Đã thấy trong code:** Copilot thử tối đa 8 lần cho bất kỳ lỗi nào, không backoff, không phân biệt lỗi schema, công cụ, 400/401 hay 429. Mỗi lần thử có thể thực hiện nhiều lượt model + DB.
- **Cách sửa cụ thể:** Chặn retry với lỗi lập trình/xác thực/validation. Với lỗi tạm thời có thể thử tối đa 1 lần bổ sung theo `Retry-After` hoặc exponential backoff + jitter, trong request budget. Nếu quota đang cạn, trả 429 + thời điểm thử lại; đừng thử 8 lần.
- **Kiểm thử đạt:** Mock lỗi 400: model chỉ được gọi 1 lần; mock 503: tối đa 2 lượt theo policy; mock 429: không tạo bão lượt gọi.

### CB-09 · P1 — Quota theo project

- **Vị trí:** `chat.js:26–74, 1108–1114, 1613–1624`
- **Đã thấy trong code:** Hàm xoay API key không có cơ chế kiểm quota/circuit breaker. Hai nhánh retry và lựa chọn key còn tăng `currentKeyIndex` liên tục. Xoay nhiều key cùng Google project KHÔNG cấp thêm hạn mức của project.
- **Cách sửa cụ thể:** Thiết lập limiter chia sẻ giữa các instance server theo RPM/TPM/RPD, giới hạn đồng thời và circuit breaker theo project/model. Theo dõi số token + 429. Chỉ dùng failover thật nếu được phép và có quota độc lập, không sử dụng xoay key để né giới hạn.
- **Kiểm thử đạt:** Dưới tải đồng thời lớn, hệ thống trả 429 có `retry_after` có kiểm soát thay vì thử vô hạn; số gọi thực tế không vượt ngân sách.

### CB-10 · P1 — Truy vấn Supabase quá rộng

- **Vị trí:** `chatbot(1).js:245–273`
- **Đã thấy trong code:** Một lần refresh Inbox chạy 8 query, nhiều `select('*')` không lọc customer và lồng `chat_message(*)` lấy tất cả lịch sử 50 hội thoại. Có thể kéo theo hàng ngàn dòng và blob ảnh base64.
- **Cách sửa cụ thể:** Tách 2 cấp API: (1) Inbox summary 20–50 hội thoại với cột tối thiểu/last_message_preview; (2) detail theo conversation ID + 30 tin mới nhất và customer context theo đúng ID đang chọn. Phân trang tải thêm cũ; không tải bảng `paw_point_transaction` toàn hệ thống vào browser.
- **Kiểm thử đạt:** Mở Inbox không kéo dữ liệu toàn bộ orders/pets/ledger; tổng dữ liệu Network giảm mạnh, vẫn hiển thị đủ 20–50 conversation.

### CB-11 · P1 — Truy vấn lặp / Realtime fan-out

- **Vị trí:** `chatbot(1).js:475–498, 635–646`; `tab-chatbot-live(1).js:1050–1063`
- **Đã thấy trong code:** Realtime từ `chat_conversation`, `chat_message`, `support_ticket`, thêm focus và polling mỗi 10 giây cùng gọi toàn bộ `loadChatbotDataFromSupabase()`. Không debounce, không single-flight; khi chưa có hội thoại, live init còn gọi tải bổ sung.
- **Cách sửa cụ thể:** Gom sự kiện trong 250–500ms, chỉ 1 request đang bay (single-flight), phân biệt `refreshInbox` với `refreshConversation`. Nếu realtime CONNECTED, bỏ polling 10 giây; khi DISCONNECTED chỉ fallback polling chậm 45–60s. Không reload nếu tab chưa mở, ngoại trừ cập nhật badge nhẹ.
- **Kiểm thử đạt:** 3 sự kiện DB liên tiếp chỉ tạo tối đa 1–2 refresh nhỏ; bật 5 tab admin không tạo hàng trăm query/phút chỉ do timer.

### CB-12 · P1 — Realtime subscribe lặp

- **Vị trí:** `tab-chatbot-live(1).js:253–282, 421–439`
- **Đã thấy trong code:** `renderCurrentChat()` luôn `subscribeToConversationRoom(convId)`; hàm subscribe lại remove channel cũ và tạo channel mới, kể cả hội thoại không đổi. Đổi badge/render/timeline nhiều lần gây churn WebSocket và bỏ sót sự kiện.
- **Cách sửa cụ thể:** Theo dõi `subscribedConversationId`. Chỉ subscribe khi ID thay đổi; cleanup channel khi rời module/đóng trang. Render chỉ nên cập nhật DOM, không mở network subscription.
- **Kiểm thử đạt:** Render lại một chat 20 lần không làm tăng số channel/subscription; đổi sang chat khác có đúng 1 channel.

### CB-13 · P1 — Payload ảnh quá nặng

- **Vị trí:** `tab-chatbot-live(1).js:968–972, 1194–1229, 1001–1012`; `chatbot(1).js:265–266`
- **Đã thấy trong code:** Ảnh 5 MB được FileReader biến thành data URL base64 rồi nhúng trực tiếp vào `chat_message.content` và `raw_content`. Mỗi lần fetch lồng lịch sử có thể tải đi tải lại những chuỗi rất lớn.
- **Cách sửa cụ thể:** Upload file trực tiếp lên private Supabase Storage theo path có owner/conversation, giới hạn MIME/kích thước ở server, lưu metadata/URL ký ngắn hạn thay vì base64 trong row. Migration lịch sử bằng job an toàn; không gỡ raw data trước khi đối chiếu file.
- **Kiểm thử đạt:** Upload 1 ảnh 5 MB: row chat chỉ chứa metadata ngắn; tải lại Inbox không mang base64; ảnh chỉ hiện khi người xem có quyền.

### CB-14 · P1 — Lịch sử AI phình to

- **Vị trí:** `tab-chatbot-copilot(1).js:12, 143–156`; `chat.js:1075–1128`
- **Đã thấy trong code:** Frontend gửi toàn bộ `copilotHistory` qua mỗi request, backend chỉ giới hạn câu mới 2000 ký tự, không giới hạn tổng messages/bytes/tokens. Phiên dài tăng thời gian xử lý và quota TPM.
- **Cách sửa cụ thể:** Chuyển history thành state server-side có session ID, chỉ giữ 6–10 lượt gần nhất, giới hạn tổng bytes/tokens và tóm tắt các lượt cũ từ nguồn tin cậy. Validate role (`user/assistant`) và độ dài mỗi entry.
- **Kiểm thử đạt:** 100 lượt chat không làm request tiếp theo phình theo tỷ lệ tuyến tính; payload có giới hạn server.

### CB-15 · P1 — Nhiều vòng Function Calling

- **Vị trí:** `chat.js:1127–1160`
- **Đã thấy trong code:** Một lần Copilot có 1 call model ban đầu và tối đa 3 lần follow-up (4 lượt AI), rồi lặp lại toàn bộ khi retry. Tool chỉ xử lý `functionCalls[0]` dù model có thể gọi nhiều tool.
- **Cách sửa cụ thể:** Tách truy vấn số liệu đơn giản ra deterministic intent router trước Gemini; giới hạn tool rounds (ví dụ 2), xử lý các tool calls hợp lệ một cách có kiểm soát; cấm retry toàn request sau side effect. Với workflow phức tạp trả 'cần làm rõ' thay vì tiêu tốn nhiều lượt.
- **Kiểm thử đạt:** Câu 'Có bao nhiêu lịch hẹn hôm nay?' trả dữ liệu COUNT từ DB mà không cần 4 lượt AI; tool không xử lý trùng.

### CB-16 · P1 — RAG gây thêm 2 dịch vụ

- **Vị trí:** `chat.js:498–546, 917–956`
- **Đã thấy trong code:** `search_store_info` vẫn gọi embedding + `match_documents` ngay cả khi FAQ đã tìm được; không cache kết quả. `.or(...)` được ghép thô từ câu người dùng có thể phát sinh lỗi cú pháp PostgREST.
- **Cách sửa cụ thể:** Ưu tiên FAQ exact/relevance và chỉ chạy vector nếu thiếu kết quả tốt. Cache theo normalized query + phiên bản tài liệu; sử dụng RPC tìm kiếm có tham số hóa, whitelist/escape query. Xác nhận dimension/index của `document_embeddings` tương thích `gemini-embedding-2`.
- **Kiểm thử đạt:** FAQ phổ biến lấy từ cache/DB, không gọi embedding; truy vấn có dấu `%`, dấu phẩy và dấu ngoặc không gây lỗi cú pháp.

### CB-17 · P1 — Tính VIP tải cả sổ cái

- **Vị trí:** `chat.js:340–368, 1405–1406`
- **Đã thấy trong code:** Mỗi tin của khách đăng nhập có thể lấy toàn bộ `paw_point_transaction.points` rồi cộng trên Node, đồng thời COUNT ticket. Dữ liệu lớn làm chậm và tăng tải.
- **Cách sửa cụ thể:** Dùng tổng điểm đã được DB duy trì đúng nghiệp vụ trong `customer_membership` hoặc SQL aggregate/RPC có index. Đặt cache TTL ngắn theo customer, invalidation khi điểm thay đổi; không lấy full ledger.
- **Kiểm thử đạt:** Khách có 50.000 giao dịch điểm vẫn chỉ cần một truy vấn tổng hợp nhỏ; kết quả bằng số dư authoritative.

### CB-18 · P1 — Ghi DB không kiểm tra

- **Vị trí:** `chat.js:1409–1475, 1502–1508, 1702–1710`
- **Đã thấy trong code:** Các lệnh insert/update message, conversation và moderation log đa phần không kiểm tra `{error}`. Có thể gửi AI/ack thành công dù chưa lưu vào DB; thao tác nhiều bước không nguyên tử.
- **Cách sửa cụ thể:** Check error của mọi query; sử dụng transactional RPC để lưu tin khách + cập nhật trạng thái/vi phạm có nhất quán. Sau đó xử lý AI, lưu bot message bằng request idempotent. Nếu DB không ghi được, trả lỗi rõ ràng trước khi gọi Gemini.
- **Kiểm thử đạt:** Mock insert chat_message bị từ chối: không gọi Gemini, không trả 'đã gửi'; replay cùng `client_message_id` không sinh bản ghi trùng.

### CB-19 · P1 — Mất handover

- **Vị trí:** `chat.js:402–423`
- **Đã thấy trong code:** Tìm phiên đang mở chỉ xét `bot_handling` và `waiting_agent`; loại `agent_handling`. Nếu khách không gửi conversationId, hệ thống có thể tạo phiên mới và bot trả lời khi đang có nhân viên trực.
- **Cách sửa cụ thể:** Tìm tất cả trạng thái đang mở gồm `agent_handling`, xác nhận quyền sở hữu, có index/unique constraint phù hợp cho mỗi phiên active. Không tự tạo phiên mới vì thiếu conversationId.
- **Kiểm thử đạt:** Khách đang được CSKH tiếp quản gửi tin sau refresh/tab mới: vẫn vào cùng phiên, bot không chen trả lời.

### CB-20 · P1 — Gửi trùng tin/typing flood

- **Vị trí:** `tab-chatbot-live(1).js:955–1046, 1165–1183`
- **Đã thấy trong code:** `sendLiveMsg()` chưa có khóa đang gửi, nên click liên tục có thể insert nhiều bản tin. `notifyAdminTyping(true)` được gửi mỗi lần gõ ký tự, tạo nhiều broadcast.
- **Cách sửa cụ thể:** Vô hiệu hóa send khi request đang chạy, gán `client_message_id` và unique index DB; debounce typing start (ví dụ 250ms), chỉ gửi khi trạng thái chuyển đổi, stop sau khoảng im lặng. Tuyệt đối không xóa draft cho đến khi được ACK.
- **Kiểm thử đạt:** Double click Send trong 100ms lưu đúng 1 tin; gõ 100 ký tự không phát 100 broadcast.

### CB-21 · P1 — Sai endpoint cần kiểm chứng

- **Vị trí:** `tab-chatbot-copilot(1).js:150–156`; `chat.js:1299–1302`
- **Đã thấy trong code:** Frontend POST `/api/admin/copilot`, còn backend được gửi chỉ thể hiện nhánh Copilot qua `req.body.isCopilot` của handler `chat.js`. Chưa có mã route/rewrite để chứng minh `/api/admin/copilot` thực sự trỏ vào handler này.
- **Cách sửa cụ thể:** Kiểm tra repo `api/admin/copilot.js`, `vercel.json`, Express router hoặc rewrites. Nếu không có route, bổ sung route riêng gọi `handleCopilotChat` (đã kiểm JWT) hoặc thống nhất frontend/backend; không tự động sửa URL trước khi kiểm tra routing hiện hành.
- **Kiểm thử đạt:** Network POST `/api/admin/copilot` có trả JSON đúng contract? Nếu 404/405 thì lỗi route, không phải Gemini.

### CB-22 · P1 — SSE lỗi sau gửi header

- **Vị trí:** `chat.js:1626–1753`
- **Đã thấy trong code:** Sau khi đã `res.write()` SSE, nhánh catch lại `res.setHeader`, có thể ném `ERR_HTTP_HEADERS_SENT`. Request cũng chưa thấy xử lý cancel client/connection closed để dừng upstream.
- **Cách sửa cụ thể:** Dùng `res.headersSent` và `res.writableEnded`; trước header gửi status JSON bình thường, sau header gửi sự kiện `error` trong stream và `res.end()`. Kết nối `req.on('close')` để hủy tác vụ nếu SDK hỗ trợ; đặt tổng thời hạn/response deadline.
- **Kiểm thử đạt:** Ngắt kết nối lúc Gemini đang stream không làm server tiếp tục tính token lâu; lỗi giữa stream hiển thị và kết thúc có kiểm soát.

### CB-23 · P1 — Tồn kho trả thiếu

- **Vị trí:** `chat.js:749–790`
- **Đã thấy trong code:** Tool `get_low_stock_products` lấy `.limit(20)` rồi mới `.filter(...)` trên JS và trả `total_low_stock` bằng số mục lọc được. Hệ thống có thể báo ít hơn số sản phẩm thực tế thiếu hàng.
- **Cách sửa cụ thể:** Đưa điều kiện tồn <= ngưỡng vào SQL/view/RPC và chạy COUNT chính xác trên DB; phân trang/limit chỉ áp cho danh sách mẫu. Phân biệt `total` và `items.length` trong output.
- **Kiểm thử đạt:** Seed 100 sản phẩm thiếu hàng, tool trả tổng 100 và danh sách trang đầu <=20.

### CB-24 · P1 — SDK cũ

- **Vị trí:** `chat.js:2, 1116–1128, 1605–1623`
- **Đã thấy trong code:** Backend dùng thư viện `@google/generative-ai` vốn không còn được Google tích cực duy trì. Đây chưa phải bằng chứng trực tiếp của lỗi 429, nhưng làm tăng rủi ro tương thích và xử lý stream/function calls.
- **Cách sửa cụ thể:** Sau khi có regression tests, chuyển riêng một PR sang `@google/genai`, cập nhật cú pháp generate/stream/function-calling và kiểm model/embed dimension. Tránh đổi SDK đồng thời với sửa auth và DB để dễ rollback.
- **Kiểm thử đạt:** Các test stream, tool calling, 429, 503, timeout và RAG chạy xanh trên SDK mới trước khi bỏ gói cũ.

### CB-25 · P1 — Dữ liệu/hứa hẹn giả và XSS

- **Vị trí:** `chatbot(1).js:345, 395–400, 458–468`; `tab-chatbot-live(1).js:384–400, 848–857`
- **Đã thấy trong code:** Hồ sơ có số điện thoại mặc định `0901234567`, pet giả 'Bé cưng', gợi ý hứa bù điểm và gọi trong 3 phút mà chưa thực hiện. Một số trường customer/ticket vào `innerHTML` trực tiếp.
- **Cách sửa cụ thể:** Hiển thị 'Chưa có dữ liệu' thay vì giá trị bịa. Chỉ hứa điểm/CSKH khi nghiệp vụ thực sự được xác nhận. Escape DOM hoặc dùng textContent cho PII, kiểm tra mọi đường render HTML động.
- **Kiểm thử đạt:** Không có số điện thoại sẽ hiện dấu '—', không hiển thị số giả; input tên khách chứa HTML không tạo phần tử mới.

### CB-26 · P1 — Chỉ số/trace thiếu

- **Vị trí:** `chat.js` và ba file frontend nói chung
- **Đã thấy trong code:** Chưa thấy request ID, số lượt retry/tool/token, thời gian từng bước DB/AI, kích thước payload, queue depth hoặc trạng thái lưu tin trong luồng trả về. Vì vậy khi lỗi người vận hành khó phân biệt quota, DB hay timeout.
- **Cách sửa cụ thể:** Gắn request ID xuyên suốt frontend → API → Gemini → DB; log dạng cấu trúc, ẩn key/token/PII/raw. Theo dõi p50/p95, 429/503, ai_calls/turn, db_queries/turn, payload_kb, active_channels, persistence_failure.
- **Kiểm thử đạt:** Tạo tải kiểm thử xác định được chính xác request nào tốn > 3 giây và bước nghẽn; không lộ secret trong log.

### CB-27 · P1 — Ngữ cảnh client tùy ý

- **Vị trí:** `chat.js:1075–1128, 1305–1315, 1568–1600`
- **Đã thấy trong code:** Server nhận `messages` history nguyên vẹn từ client, chỉ kiểm `messages.length > 0` và ký tự tin nhắn cuối. Client có thể gửi hàng ngàn entry hoặc tự tạo vai assistant, khiến token/phí tăng và mô hình có bối cảnh không đáng tin.
- **Cách sửa cụ thể:** Giới hạn JSON body size, số entry, role/length; chỉ tin `message` mới từ client và lấy lịch sử authoritative theo `conversationId` sau kiểm quyền. Nếu còn chấp nhận history client, xem nó là dữ liệu không tin cậy và áp hard cap.
- **Kiểm thử đạt:** Payload 5MB/500 tin bị chặn 413/400, không gọi Gemini; role giả `system/tool` không được chấp nhận.

### CB-28 · P2 — Có nguy cơ lỗi trạng thái khi mất DB

- **Vị trí:** `chat.js:391–446, 1338–1340`; `tab-chatbot-copilot(1).js:163–175`
- **Đã thấy trong code:** `getOrCreateConversation()` trả null khi insert lỗi nhưng luồng chat vẫn có thể tiếp tục gọi AI; Copilot nếu HTTP 200 thiếu reply tự thay bằng 'Đã xử lý yêu cầu thành công.' dù backend chưa xác nhận đủ dữ liệu.
- **Cách sửa cụ thể:** Đặt `conversationId` là điều kiện bắt buộc trước khi trả lời chat có lưu lịch sử; quy định rõ chế độ 'không lưu' nếu có. Chỉ hiển thị success khi có `ok:true`, `reply` hợp lệ và persistence ACK theo contract.
- **Kiểm thử đạt:** DB offline: không có câu 'Đã xử lý thành công' và không có tin ảo; người dùng thấy thông báo lỗi và tùy chọn thử lại.


---

## 3. Kế hoạch triển khai theo pull request — sửa ít rủi ro trước

### PR-00 — Đo lường và tái hiện trước khi sửa

- [ ] Tạo staging dùng dữ liệu giả có cấu trúc tương tự production (không chép PII không cần thiết).
- [ ] Mở DevTools → Network → Fetch/XHR, bật Preserve log; thử 1 câu Copilot, 1 câu chat khách, 1 tin Live CSKH.
- [ ] Ghi `status`, thời gian, response size, API gọi lại, số endpoint `/rest/v1`, số gọi upstream Gemini theo request ID.
- [ ] Chụp hai waterfall: **mở Inbox không làm gì 60 giây** và **gửi 3 tin trong 5 giây**.
- [ ] Đo p50/p95 và tỉ lệ 429/503/5xx ở backend; phân biệt thời gian tải DB, model, tool, lưu message.
- [ ] Đọc quotas Gemini tại Google AI Studio của **đúng project + model**. Không chia quota theo số key nếu cùng project.

**Definition of done:** Có số liệu baseline, trường hợp tái hiện và request ID cho mỗi lỗi. Nếu chưa có log, không kết luận đã hết quota.

### PR-01 — Khóa lỗ hổng xác thực, phiên và dữ liệu raw (P0)

- [ ] Thêm middleware `requireAuthenticatedStaff()` lấy user từ JWT/session ký hợp lệ.
- [ ] Xóa toàn bộ nhánh `Bearer local:*` trong `/api/chat`, Copilot, xem raw và các route action liên quan; di trú login trước khi chặn để tránh làm hỏng đăng nhập hợp lệ.
- [ ] Thiết lập RBAC từng tool: `chat.read`, `customer.read`, `order.read`, `inventory.read`, `chat.raw.read`, giới hạn theo chi nhánh nếu có.
- [ ] Tìm conversation theo `(conversation_id, customer_id/guest_session_owner)`, không tin UUID client.
- [ ] Xóa `raw_content` khỏi tất cả các API read thường. Tạo API đặc quyền cho raw, log trước khi trả dữ liệu, nếu audit lỗi thì từ chối.
- [ ] Bỏ `req.body.systemPrompt`; lấy prompt chính sách từ server.
- [ ] Thêm test quyền A/B và test người bị khóa tài khoản.

**Đạt:** Mạo danh ID bằng localStorage không đọc được Copilot/raw; khách A không sửa phiên B; client không áp system prompt tùy ý.

### PR-02 — Chặn nghẽn Inbox/Realtimes (P1)

- [ ] Thay `loadChatbotDataFromSupabase()` tổng hợp bằng `loadInboxSummary({limit, cursor})` trả cột nhẹ, không include raw.
- [ ] Khi admin chọn phiên: `loadConversationMessages(convId, { limit: 30 })` và `loadCustomerContext(customerId)`; có cơ chế load more.
- [ ] Tạo `refreshInboxDebounced()` 250–500ms + in-flight coalescing + hủy request cũ khi đổi phiên nếu có thể.
- [ ] Chỉ mở realtime room nếu ID thay đổi; dọn channel khi rời/đóng module.
- [ ] Tắt polling 10 giây nếu realtime khỏe; fallback 45–60 giây lúc disconnect; không poll ở tab ẩn.
- [ ] Chỉ cập nhật last-message/inbox badge khi có event; không fetch 8 bảng vì đổi support_ticket.
- [ ] Sanitize PII trước khi render; tránh `innerHTML` cho tên khách/ticket.
- [ ] Sau thao tác mutation chỉ invalidate đúng conversation/customer, không refresh toàn bộ.

**Đạt:** Để màn hình idle 60 giây không phát 48 query từ polling; 3 event liên tiếp không chạy 24 query toàn bảng; raw không về browser.

### PR-03 — Sửa lưu streaming, error contract và gửi trùng (P0/P1)

- [ ] Trong mọi stream chunk, append `fullResponseText += text` rồi mới viết SSE.
- [ ] Insert bot message với `idempotency_key` và kiểm `{error}`; chỉ gửi tín hiệu `persisted:true` khi có xác nhận.
- [ ] Đưa các query ghi customer/conv/moderation về transaction RPC hoặc ít nhất validate bước nào thành công/thất bại.
- [ ] Xử lý `res.headersSent`, disconnect và partial stream; không trả 200/done true cho thất bại.
- [ ] UI disable Send khi đang gửi và giữ draft nếu lỗi; request có `client_message_id` để server dedup.
- [ ] Ngăn side effect trùng khi retry sau khi message khách đã được lưu.
- [ ] Test cả JSON và SSE, success/fail/timeout/disconnect.

**Đạt:** Không mất câu trả lời sau refresh; 1 thao tác chỉ sinh 1 message; lỗi API được phản ánh đúng.

### PR-04 — Kiểm soát Gemini và Copilot (P1)

- [ ] Đổi Copilot `maxRetries=8` thành policy có phân loại lỗi, tối đa 1 retry hợp lệ khi còn deadline.
- [ ] Rate limit theo actor/IP/session và global project; ưu tiên Redis/shared limiter nếu serverless nhiều instances.
- [ ] Giới hạn đồng thời, queue depth và tổng deadline; trả 429/503 khi quá tải thay vì xếp hàng vô hạn.
- [ ] Giới hạn `messages` count, total bytes, total input tokens và output tokens.
- [ ] Xây router **truy vấn dữ liệu đơn giản không qua Gemini**: COUNT lịch, COUNT ticket, tra trạng thái đơn, tồn kho; AI dùng cho tóm tắt/soạn phản hồi/phân tích.
- [ ] Tool permission check trước query; nén kết quả tool (giới hạn rows và không trả PII dư thừa).
- [ ] Ưu tiên `faq → cache → vector` theo độ tin cậy, không embedding khi FAQ đủ chính xác.
- [ ] Kiểm tra route `/api/admin/copilot` có thực; nếu không có thì tạo route và giữ contract nhất quán.

**Đạt:** Lỗi 400 không retry; 429 không tạo 8 lần gọi; câu COUNT trả dữ liệu thật; dưới tải cao yêu cầu dư được từ chối lịch sự.

### PR-05 — Chuẩn hóa Storage / database và RAG (P1)

- [ ] Ảnh mới upload vào private Storage; chat row chỉ lưu path/metadata.
- [ ] Batch migration base64 cũ → Storage theo từng nhóm, kiểm hash, ghi bản sao, rollback rõ ràng.
- [ ] Rà index bằng `pg_indexes` và EXPLAIN trước khi tạo index mới.
- [ ] Index gợi ý: `chat_message(conversation_id, created_at desc)`, `chat_conversation(updated_at desc)`, `chat_conversation(customer_id, status, updated_at desc)`; kiểm tên cột và query thực tế trước migration.
- [ ] Thay tổng điểm tính từ toàn ledger bằng số dư authoritative/SQL SUM an toàn.
- [ ] RAG: xác nhận `match_documents` tồn tại, đúng dimension embedding, chính sách version/index và chỉ đánh dấu synced khi index job thực sự hoàn tất.
- [ ] Sửa `get_low_stock_products` để count/filter trong database.
- [ ] Sau khi có regression tests, migrate thư viện `@google/generative-ai` → `@google/genai` trong PR riêng.

### PR-06 — Load test và triển khai có kiểm soát

- [ ] Chạy staging ở mức 1, 5, 10, 20 client đồng thời (điều chỉnh theo tải thật và quota sandbox).
- [ ] Benchmark Inbox 100 / 1.000 / 10.000 conversation và mỗi phiên nhiều message/ảnh.
- [ ] Kiểm tra tối thiểu 30 phút chạy liên tục không rò channel/timer.
- [ ] Tạo dashboard theo request ID với số AI calls/turn, 429/503, DB queries/refresh, thời gian từng bước và tỷ lệ bot reply được persist.
- [ ] Rollout theo cờ tính năng (internal → CSKH nhóm nhỏ → mọi admin); có phương án tắt AI trả lời tự động khi upstream quá tải nhưng giữ nguyên Live CSKH.
- [ ] Sau rollout, so sánh số đo baseline/after; không tuyên bố hết lỗi chỉ vì test thủ công thành công.

---

## 4. Mẫu sửa code để giao người lập trình

Các đoạn dưới đây là **hướng triển khai**; cần điều chỉnh theo framework, schema và quyền đang chạy, không copy thẳng lên production trước khi review.

### 4.1. Sửa lỗi SSE không lưu tin bot (`chat.js`)

**Hiện tại:** chỉ `fullResponseText += text` ở nhánh JSON.  
**Sửa trong cả stream chính và stream tool follow-up:**

```js
let fullResponseText = '';

function emitText(text, wantsStream, res) {
  if (!text) return;
  fullResponseText += text; // LUÔN cộng, kể cả khi SSE
  if (wantsStream && !res.writableEnded) {
    res.write(`data: ${JSON.stringify({ type: 'delta', chunk: text })}\n\n`);
  }
}

// Trong for-await của first/second stream:
// emitText(text, wantsStream, res);

// Sau khi stream kết thúc:
if (!activeConvId) throw new Error('CONVERSATION_NOT_PERSISTED');
if (!fullResponseText.trim()) throw new Error('EMPTY_MODEL_RESPONSE');

const { data: saved, error: saveErr } = await supabase
  .from('chat_message')
  .insert({
    conversation_id: activeConvId,
    sender_type: 'bot',
    sender_name: 'PawPal Bot',
    content: fullResponseText,
    // production: thêm idempotency_key từ request ID hoặc model_reply_id
  })
  .select('id')
  .single();
if (saveErr || !saved) throw saveErr || new Error('BOT_REPLY_SAVE_FAILED');

if (wantsStream && !res.writableEnded) {
  res.write(`event: done\ndata: ${JSON.stringify({
    done: true, persisted: true, messageId: saved.id, conversationId: activeConvId
  })}\n\n`);
  res.end();
}
```

**Chú ý:** API hiện đang dùng `{chunk, done}` nên khi đổi sang `{type:'delta'}` cần cập nhật frontend tương ứng; nếu muốn giữ tương thích thì chỉ thêm `fullResponseText += text` và `persisted` trước, tách nâng contract sang PR khác.

### 4.2. Giảm truy vấn và tránh refresh chồng nhau (`chatbot(1).js`)

```js
let refreshBusy = false;
let refreshDirty = false;
let debounceTimer = null;

async function refreshInboxOnce() {
  if (refreshBusy) {
    refreshDirty = true;
    return;
  }
  refreshBusy = true;
  try {
    do {
      refreshDirty = false;
      await loadInboxSummary(); // query nhẹ, KHÔNG select chat_message(*)
    } while (refreshDirty);
  } finally {
    refreshBusy = false;
  }
}

function scheduleInboxRefresh() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(refreshInboxOnce, 350);
}

// Realtime: gọi scheduleInboxRefresh(), không gọi full reload.
// Chỉ chọn chi tiết khi user click conversation.
```

**Không nên** để một event `chat_message`, event `chat_conversation` và timer tự chạy 3 đợt `Promise.all` độc lập. Với hệ thống có nhiều instance, coalescing này chỉ giảm tải một browser, không thay thế rate limiter phía server.

### 4.3. Chỉ subscribe đúng phòng khi đổi hội thoại (`tab-chatbot-live(1).js`)

```js
let subscribedConversationId = null;

function ensureConversationSubscription(convId) {
  if (!supabase || !convId) return;
  if (subscribedConversationId === convId && currentAdminRoomChannel) return;

  if (currentAdminRoomChannel) {
    supabase.removeChannel(currentAdminRoomChannel);
    currentAdminRoomChannel = null;
  }

  subscribedConversationId = convId;
  currentAdminRoomChannel = supabase
    .channel('fab-customer-' + convId)
    .on('broadcast', { event: 'typing' }, handleTypingEvent)
    .subscribe();
}

// Khi click chọn một hội thoại mới: ensureConversationSubscription(convId)
// renderCurrentChat(): chỉ render, KHÔNG tự subscribe lặp.
// Cleanup: removeChannel và set subscribedConversationId = null.
```

### 4.4. Giảm retry Copilot (`chat.js`)

```js
function getUpstreamStatus(err) {
  const status = Number(err?.status ?? err?.response?.status);
  if (Number.isInteger(status) && status >= 100) return status;
  const message = String(err?.message || '');
  if (/\b429\b|RESOURCE_EXHAUSTED/i.test(message)) return 429;
  if (/\b503\b|UNAVAILABLE/i.test(message)) return 503;
  return 500;
}

async function callGeminiWithBoundedRetry(callModel) {
  const maxAttempts = 2; // 1 lượt chính + tối đa 1 retry
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await callModel();
    } catch (err) {
      const status = getUpstreamStatus(err);
      const mayRetry = [500, 502, 503, 504].includes(status);
      if (!mayRetry || attempt === maxAttempts - 1) throw err;
      const delayMs = Math.min(1500, 300 * 2 ** attempt) + Math.floor(Math.random() * 150);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
```

**Chính sách thực tế:** Đối với 429, ưu tiên tôn trọng `Retry-After` và ngân sách thời gian của request; nếu cần đợi lâu thì trả 429 cho client kèm `retry_after` thay vì giữ kết nối. Không áp dụng retry cho một quy trình đã ghi dữ liệu gây tác dụng phụ nếu chưa có idempotency.

### 4.5. Trả mã lỗi đúng và tránh `headers already sent` (`chat.js`)

```js
function sendApiFailure(req, res, code, status = 503) {
  const requestId = req.requestId || null;
  const payload = {
    ok: false,
    error: { code, message: 'Chatbot tạm thời không xử lý được yêu cầu.', retryable: status >= 500 || status === 429 },
    requestId
  };

  if (res.headersSent) {
    if (!res.writableEnded) {
      res.write(`event: error\ndata: ${JSON.stringify(payload)}\n\n`);
      res.end();
    }
    return;
  }
  return res.status(status).json(payload);
}
```

Backend không được đưa nguyên `error.message` có token/schema/PII vào response công khai. Log chi tiết ở server nhưng phải che thông tin nhạy cảm.

### 4.6. Query Supabase theo hai cấp

**Inbox (đề xuất):**

```js
const { data, error } = await supabase
  .from('chat_conversation')
  .select('id, customer_id, status, sentiment_level, is_urgent, updated_at, ai_summary')
  .order('updated_at', { ascending: false })
  .limit(30);
```

**Chi tiết 1 phiên (đề xuất):**

```js
const { data: messages, error } = await supabase
  .from('chat_message')
  .select('id, conversation_id, sender_type, sender_name, content, is_toxic, created_at')
  .eq('conversation_id', selectedId)
  .order('created_at', { ascending: false })
  .limit(30);
```

**Bắt buộc:** `selectedId` phải được xác thực quyền truy cập tại server/RLS, không chỉ kiểm trên UI. Tuyệt đối không trả `raw_content`. Để hiển thị preview nhanh, có thể lưu `last_message_preview` an toàn trên `chat_conversation` bằng trigger hoặc API có kiểm soát.

### 4.7. Chuyển ảnh đính kèm sang Storage

- Client nhận ảnh → xin quyền upload cho đúng conversation → upload tới private bucket.
- Server kiểm token, MIME, kích thước, scan nếu quy trình yêu cầu, kiểm path thuộc conversation.
- DB lưu ví dụ `{type:'image',storage_path:'chat/<conv-uuid>/<file-uuid>.webp',caption:'...'}`; không lưu base64.
- Chỉ server hoặc Storage RLS mới cấp signed URL ngắn hạn cho người có quyền.
- Tạo job migrate tin cũ; đối soát hash/file size và backup trước khi sửa dữ liệu.
- Khi khách nhắn nội dung có ảnh, đừng đưa toàn bộ base64 vào prompt Gemini; nếu cần vision, truyền nội dung hình qua API thích hợp một cách có giới hạn.

---

## 5. Bộ kiểm thử nghiệm thu bắt buộc

| ID | Tình huống | Kỳ vọng |
|---|---|---|
| QA-01 | Inbox mở 60 giây không có tương tác | Không phát hàng loạt query 8 bảng mỗi 10 giây |
| QA-02 | 3 sự kiện realtime trong 200ms | Chỉ refresh nhẹ đã coalesce |
| QA-03 | Chuyển 2 chat liên tục | Không hiện nội dung chat A trong chat B |
| QA-04 | Render lại khung chat 20 lần | Không tăng room subscription |
| QA-05 | Rời module Chatbot | Channel/timer được cleanup |
| QA-06 | CSDL có 10.000 orders/pets/tickets | Inbox không fetch toàn bộ |
| QA-07 | Hội thoại có 5 ảnh 5MB | Inbox vẫn nhẹ, không tải base64 |
| QA-08 | Người dùng không quyền raw kiểm Network | Không xuất hiện `raw_content` |
| QA-09 | Nhân viên local ID giả | API 401 |
| QA-10 | JWT nhân viên bị khóa | API 403 |
| QA-11 | Nhân viên thiếu `customer.read` | Tool không trả hồ sơ khách |
| QA-12 | Khách A gửi convId của B | 403/404, DB không đổi |
| QA-13 | Client gửi systemPrompt tùy ý | Server bỏ qua |
| QA-14 | JWT khách không map được customer | Không tự dùng auth.users.id làm customer.id |
| QA-15 | SSE thành công | Bot reply lưu đúng 1 bản ghi |
| QA-16 | SSE trả nhiều chunks | DB content nối đủ chunks, đúng thứ tự |
| QA-17 | SSE lỗi sau khi gửi header | event:error; không `ERR_HTTP_HEADERS_SENT` |
| QA-18 | Gemini 429 | Hiện quá tải, retry theo policy, không 8 lần |
| QA-19 | Gemini 503 | Có backoff giới hạn, trả lỗi hợp lệ |
| QA-20 | Gemini 400/401 | Không retry, không xoay key |
| QA-21 | Lỗi ghi chat_message | Không giả vờ đã gửi |
| QA-22 | Double-click Send | Chỉ có 1 message |
| QA-23 | 100 ký tự typing | Số broadcast được throttle |
| QA-24 | Hội thoại 100 lượt | Body gửi Gemini vẫn trong budget |
| QA-25 | Hỏi lịch hẹn hôm nay | Số COUNT DB chính xác, không bịa |
| QA-26 | Tồn kho thấp >20 sản phẩm | Tổng đúng, list phân trang |
| QA-27 | FAQ có sẵn | Không gọi embedding nếu không cần |
| QA-28 | Chuỗi FAQ có ký tự đặc biệt | Không lỗi cú pháp query |
| QA-29 | Guest đang trong chat nhân viên | Bot không chen trả lời |
| QA-30 | Quá tải 20 client | Không vượt budget upstream, trả 429/503 có cấu trúc |
| QA-31 | Supabase chậm 10 giây | Timeout hiển thị rõ, không phản hồi giả |
| QA-32 | Lưu raw audit thất bại | Server từ chối trả raw (fail closed) |
| QA-33 | RAG vector DB dimension khác | Báo rõ index/config sai, không âm thầm coi 'đã sync' |
| QA-34 | Chưa cấu hình route `/api/admin/copilot` | Test 404 phát hiện trước release |
| QA-35 | Mất mạng sau khi bấm Gửi | Giữ draft, không tạo 2 tin khi thử lại |
| QA-36 | Tên khách/ticket chứa HTML | Hiển thị text an toàn, không chạy script |

### Mục tiêu hiệu năng tham khảo (điều chỉnh sau khi đo baseline)

- **Inbox:** p95 tải danh sách mới <= 1,5 giây trên staging đã seed tương tự production.
- **Tra cứu DB đơn giản:** p95 <= 2 giây khi index đúng và DB không quá tải.
- **Copilot AI:** có timeout/deadline rõ ràng, hiển thị trạng thái đang xử lý và thời gian thực tế; không cam kết một con số tuyệt đối khi model/provider biến động.
- **100%** phản hồi bot được báo `persisted:true` phải có record DB tương ứng.
- **0** lần lộ `raw_content` ở API thông thường và **0** quyền được cấp từ `local:<id>` không có chữ ký.

---

## 6. Cách tự xác định lỗi của bạn ở máy đang chạy

1. Mở trang admin → `F12` → **Network** → tick **Preserve log** → lọc `Fetch/XHR`. Mở tab Chatbot, không làm gì 60 giây.
2. Đếm các request đến Supabase (`rest/v1/chat_conversation`, `customer`, `sales_order`, `appointment`, ...). Ghi status + duration + transferred size.
3. Gửi câu “Hôm nay có bao nhiêu lịch hẹn?” một lần. Quan sát URL thực tế là `/api/admin/copilot` hay `/api/chat`, HTTP status và thời gian chờ.
4. Kiểm server log theo cùng request ID: thời gian auth, DB, gọi Gemini, tool 1, tool 2, persist và total. Nếu hiện chưa có request ID, đây là bước cần thêm.
5. Nếu bị 429, đối chiếu quota RPM/TPM/RPD của đúng Google project/model. **Không cần thử 8 key liên tục**.
6. Gửi một ảnh qua Live CSKH. Kiểm kích thước body, record `chat_message` và request Inbox sau đó. Nếu vài MB lặp đi lặp lại, ưu tiên Storage.
7. Test hai tài khoản và phân quyền raw trên staging. Tránh thử khai thác trên dữ liệu khách thật.

### File cần có thêm để kết luận hết các nhánh

- `package.json` và lockfile: xác định phiên bản `@google/generative-ai`, web server/runtime.
- Route config: `vercel.json`, `/api/admin/copilot.js` hoặc Express router để kiểm đường `/api/admin/copilot`.
- `chat_config.js`, `chat_actions.js`, `staff_auth.js` vì backend đang `require()` các module này.
- Migration Supabase: `chat_conversation`, `chat_message`, `staff`, `support_ticket`, `paw_point_transaction`, `document_embeddings`, index, view/RLS, `match_documents`.
- Mẫu log bị lỗi: timestamp, status, duration, loại lỗi/quota, request ID **đã ẩn token, key, PII**.

---

## 7. Tài liệu Google đã đối chiếu (nguồn ngoài file)

- Quota Gemini áp **theo project, không theo API key**, và thường xét RPM/TPM/RPD: https://ai.google.dev/gemini-api/docs/rate-limits
- Google khuyến nghị JS SDK mới `@google/genai`; `@google/generative-ai` là legacy không còn được duy trì tích cực: https://ai.google.dev/gemini-api/docs/libraries
- `gemini-embedding-2` là model embedding hợp lệ theo tài liệu hiện tại. Cần kiểm khả năng gọi qua SDK đang dùng và dimension index: https://ai.google.dev/gemini-api/docs/embeddings

**Phân loại nguồn:** tất cả `CB-*` là kết quả đọc 4 file và suy luận kỹ thuật được ghi rõ; giới hạn quota/SDK là thông tin tài liệu Google; thời gian thực tế/quota/tình trạng RLS vẫn chưa thể xác nhận nếu không có môi trường và log.

---

## 8. Thứ tự giao việc khuyến nghị

| Thứ tự | Chủ đề | Lý do |
|---|---|---|
| 1 | PR-00 + PR-01 | Có bằng chứng gốc, chặn mạo danh và lộ nội dung độc hại |
| 2 | PR-03 | Không mất tin, lỗi hiện chính xác, tránh dữ liệu trùng |
| 3 | PR-02 | Cắt tải Supabase/realtime/băng thông trước |
| 4 | PR-04 | Kiểm soát Gemini quota và tool rounds |
| 5 | PR-05 | Storage, index, RAG, SDK |
| 6 | PR-06 | Chứng minh cải thiện và triển khai an toàn |

**Không** nên sửa tất cả trong một commit. Mỗi PR cần có test, log before/after và cơ chế rollback. Chat khách hàng & CSKH vẫn hoạt động ở chế độ không AI khi upstream Gemini lỗi; các cảnh báo y tế khẩn cấp phải chuyển người thật và không bị hàng đợi AI giữ lại.


---

## 9. Prompt mẫu để giao Codex/Gemini (dán trực tiếp theo từng PR)

### Prompt A — Chặn tải Supabase lặp (ưu tiên khi xử lý lag Inbox)

> Hãy phân tích `chatbot(1).js` và `tab-chatbot-live(1).js` theo các lỗi CB-10, CB-11, CB-12, CB-13 trong `PAWPAL_CHATBOT_AUDIT_QUA_TAI_VA_CACH_SUA.md`. KHÔNG chỉnh sửa backend hoặc logic phân quyền trong PR này. Tách Inbox summary và detail-on-demand; loại bỏ `.select('*, chat_message(*)')`, không trả `raw_content`; giới hạn trang tin nhắn 30; debounce/single-flight; không subscribe lại room trong hàm render; fallback polling khi realtime mất kết nối. Bổ sung kiểm thử giả lập Supabase và metrics số request trước/sau. Tạo diff nhỏ, nêu rõ file/dòng đã thay và cách rollback. Không đưa dữ liệu giả để che lỗi DB.

### Prompt B — Sửa Gemini retry và streaming

> Hãy sửa `chat.js` theo CB-06, CB-07, CB-08, CB-09, CB-15, CB-18, CB-22. Trước tiên viết test chứng minh khi SSE thành công bot reply không persist, khi 429 trả 200/done:true, khi Copilot fail retry tới 8 lần. Sau đó sửa để text trong stream luôn được lưu, query DB được check error, HTTP/SSE contract đúng, retry có phân loại và giới hạn, chống duplicate bằng idempotency. Không đổi model hoặc nâng SDK trong PR này; không log token/API key/PII; không thay đổi logic y tế/CSKH. Bảo đảm test đường JSON và SSE, tool-calling và ngắt kết nối chạy xanh.

### Prompt C — Sửa xác thực và quyền (phải có kiểm thử xuyên hệ thống)

> Đọc `chat.js`, `tab-chatbot-copilot(1).js`, `tab-chatbot-live(1).js` và cấu hình Auth/RLS thực tế. Xử lý CB-01 đến CB-05. Hãy tạo thiết kế migration từ token `local:<id>` sang JWT/session có chữ ký, không phá đăng nhập hiện tại trong lúc chuyển tiếp nhưng không duy trì lỗ hổng ở môi trường production. Bảo đảm khách không truy cập conversation của người khác, nhân viên chỉ dùng tool đúng quyền, `raw_content` không về browser, quyền mở raw phải kiểm server và ghi audit thành công trước khi trả. Bỏ `req.body.systemPrompt` không đáng tin. Viết integration tests: impersonation, cross-customer ID, role denial, audit failure. Chỉ dùng schema thật trong repo, không tự đoán quyền/cột chưa kiểm chứng.

**Quy trình nghiệm thu của từng prompt:** AI phải gửi (1) danh sách thay đổi; (2) diff; (3) kết quả test có thể tái chạy; (4) những giả định còn thiếu; (5) rủi ro/rollback. Không được nói “đã fix” nếu test chưa chạy.
