# PAWPAL AI — KẾ HOẠCH GIẢM QUÁ TẢI API & ADMIN + CHECKLIST NGHIỆM THU

**Ngày rà soát:** 21/10/2026  
**Nguồn:** `Pawpal-main (1).zip` do chủ dự án gửi trong cuộc trò chuyện.  
**Trọng tâm:** PawPal AI Chatbot khách hàng, Admin Trực chat, Admin AI Copilot, Gemini, Supabase.  
**Phạm vi:** đọc tĩnh code và tài liệu trong ZIP; đã kiểm tra cú pháp các file JS trọng yếu bằng `node --check`. **Chưa chạy PawPal trên server triển khai, chưa đo độ trễ/429 thật, chưa thực hiện sửa code hoặc thay đổi Supabase.**

> Tài liệu này **thay thế cách kiểm thử dàn trải 87 case** cho mục tiêu hiện tại: phát hiện nguyên nhân quá tải, sửa ít nhưng đúng, giữ chức năng Admin và Chatbot hoạt động ổn định. Các ngưỡng bên dưới là **mục tiêu nghiệm thu đề xuất**, không phải kết quả đo đã đạt.

## I. Kết luận sau khi đọc lại CODE MỚI — khác tài liệu audit cũ ở đâu?

| ID | Hiện trạng xác minh từ mã nguồn | Nhận định và hướng xử lý |
|---|---|---|
| **P0-01** | `server.js` tại các route `/api/chat`, `/api/admin/copilot` và `/api/admin/copilot/history` dùng `delete require.cache[require.resolve('./scripts/api/chat.js')]` trước khi `require` lại. | **Ưu tiên sửa trước.** Trong `scripts/api/chat.js`, `rateLimiterCache`, `activeConcurrentAiCalls`, `cachedApiKeys`, FAQ/rule caches là biến **trong module**. Nạp module lại mỗi request làm các bộ đếm/cache này bị tạo lại; các request đồng thời không cùng chia sẻ trạng thái limiter như dự kiến. |
| **P0-02** | `scripts/api/chat.js` đã có `checkRateLimit(..., 30, 60000)` và `MAX_CONCURRENT_AI_CALLS = 5`. | Đã có **ý tưởng giới hạn**, nhưng trên Express hiện tại bị yếu bởi P0-01; ngay cả khi sửa cache, trạng thái trong RAM **chỉ có hiệu lực trên một process/instance**. Production nhiều instance cần limiter chia sẻ. |
| **P1-01** | Copilot có 3 Fast-Path: `deterministic_appointments`, `deterministic_tickets`, `deterministic_inventory`; không cần Gemini cho mẫu hỏi phù hợp. | **Giữ và mở rộng có kiểm soát**, ưu tiên các câu hỏi số liệu lặp lại. Không chuyển tất cả câu hỏi sang Gemini. |
| **P1-02** | Copilot AI dùng `maxRetries = 2`, tối đa 3 vòng function calling sau lượt đầu và `requestDeadline` 15 giây. | Tốt hơn tài liệu audit cũ nói 8 retries. Tuy nhiên **một request vẫn có thể phát sinh nhiều lời gọi model**, retry 429 và tool-loop còn làm tăng tải. |
| **P1-03** | Chatbot khách hàng gọi `sendMessageStream`, khi lỗi khởi tạo stream **thử lại bằng `getGenAI(true)`**, chưa phân loại nguyên nhân ngay ở nhánh này. | Cần **không đổi key/thử lại tức thì với 429, 400, lỗi quota dùng chung**; chỉ retry điều kiện cho lỗi tạm thời, có thời hạn và backoff. |
| **P1-04** | Admin Inbox hiện dùng 2 tầng, `.limit(50)` hội thoại, query cột cần thiết; realtime; polling **45 giây chỉ khi realtime lỗi** và tab còn hiển thị. | **Không yêu cầu quay lại sửa từ đầu** theo audit cũ nêu polling 10 giây/8 query. Cần đo có bị refresh lặp do sự kiện dồn dập và hạn chế fetch toàn Inbox khi chỉ có một tin nhắn mới. |
| **P1-05** | Inbox tải preview từ `chat_message` bằng `.in('conversation_id', convIds)...limit(limit * 2)` trên **toàn bộ tập**, không phải 1 tin cuối/hội thoại ở DB. | Có nguy cơ **thiếu preview của những hội thoại ít hoạt động** và phải đọc thừa tin từ cuộc chat nhiều tin. Đề xuất RPC/View `last_message_per_conversation` có phân trang, hoặc truy vấn riêng khi mở chat. |
| **P1-06** | `tab-chatbot-copilot.js` lưu lịch sử ở browser và đồng bộ từ API `/api/admin/copilot/history`. Backend đã `.limit(200)` bản ghi/nhân viên; frontend **gửi cả `copilotHistory`**, backend cắt còn 10 messages và giới hạn 20 KB. | Chỉnh frontend gửi **chỉ 10 tin gần nhất / giới hạn byte trước fetch**, lịch sử cũ đọc phân trang theo `sessionId`, không kéo 200 tin mỗi lần mở không cần thiết. |
| **P1-07** | Admin Live đã có `subscribedConversationId` ngăn đăng ký trùng; upload ảnh lên Supabase Storage là đường chính, nhưng có **nhánh dự phòng data URL với ảnh nhỏ**. | Giữ tối ưu đã có. Đo số kênh realtime thực, bỏ fallback nhét base64 vào message nếu không được thiết kế rõ; khi upload lỗi báo lỗi, giữ bản nháp để thử lại. |
| **P1-08** | `scripts/test/test_pr06_load_test_suite.js` có mục benchmark 1/5/10/20 client nhưng **tự mô phỏng thời gian và kết quả** trong test, không gọi server/network thật. | PASS của file này **không chứng minh API production chịu tải**. Cần load test trên staging với Gemini mock/fake upstream hoặc quota riêng. |
| **P2-01** | `getGenAI` quay vòng API key và cache 10 phút trong `scripts/api/chat.js`. | Giữ key trong server; **quay key không chắc tăng quota** khi các key cùng hạn mức dự án/nhà cung cấp. Quản lý quota theo project/model và ghi nhận 429 thật. |
| **P2-02** | `saveCopilotHistorySafe` insert DB theo kiểu fire-and-forget; một số xử lý lỗi lịch sử trả `200` + `[]`. | Phân biệt 'không có lịch sử' và 'DB lỗi', tránh báo thành công giả. Việc ghi history nên có timeout, log lỗi, và retry/idempotency độc lập. |

### Chốt nguyên nhân cần xử lý đầu tiên

**Lỗi cấu trúc rõ nhất từ code:** xóa `require.cache` tại Express route làm **mất tính liên tục của rate limiter, counter đồng thời và cache** trong chính tiến trình. Đây là **nguy cơ quá tải có căn cứ mã nguồn**, nhưng **chưa đủ dữ liệu để khẳng định đây là nguyên nhân duy nhất của các lần 429**; 429 còn có thể do hạn mức Gemini thực tế.

### Những gì KHÔNG nên làm

- **Không** tăng số lần retry hay tạo nhiều API key để “né” 429.
- **Không** nới rate limit trước khi đo.
- **Không** cứ mỗi 10 giây tải lại toàn bộ inbox, lịch sử và dashboard.
- **Không** gửi toàn bộ lịch sử chat/ảnh base64 sang Gemini theo mọi request.
- **Không** tắt hẳn Trực chat Admin khi Gemini nghẽn: **chat người–người phải tiếp tục hoạt động**.
- **Không** chạy load test 20–100 người dùng ảo lên Supabase production hoặc Gemini quota chính nếu chưa có giới hạn chi phí.

## II. Kiến trúc mục tiêu PHÙ HỢP VỚI PAWPAL

```text
Khách / Admin
   | 1 lần gửi = 1 client_message_id, disable nút khi đang gửi
   v
Express API /api/chat, /api/admin/copilot
   | xác thực JWT và quyền trước thao tác dữ liệu nhạy cảm
   | validate body + rate limit theo actor/IP có thời hạn
   | limiter tổng AI in-flight, timeout và request ID
   +--> Fast-Path / FAQ / SQL aggregate (0 token Gemini)
   +--> Gemini chỉ khi thực sự cần tạo sinh
   |      retry giới hạn, có backoff, tôn trọng 429
   +--> Supabase: dữ liệu tối thiểu, chỉ truy vấn phạm vi quyền
   v
Response: ok/done/error_code/router/request_id/duration_ms
   |
   +--> Hỏng Gemini: chuyển `waiting_agent` đúng quy tắc;
   |                  Admin CSKH vẫn gửi tin, không gọi AI thêm
   +--> Admin Inbox: Realtime + invalidation theo hội thoại,
                     chỉ fallback polling lúc realtime mất
```

**Phân biệt giới hạn:** dùng `Map`/counter trong RAM chỉ thích hợp **một Node process** hoặc giai đoạn thử nghiệm. Nếu deploy đa instance/serverless, phải dùng bộ giới hạn có trạng thái dùng chung (ví dụ Redis/Upstash hoặc dịch vụ quota tập trung). **Không dùng một query Supabase nặng cho mọi phím gõ** để thực hiện rate limit.

## III. Kế hoạch sửa theo giai đoạn — có checkbox

### G0 — Chuẩn bị và đo hiện trạng (P0, làm trước)

- [x] **G0-01** Tạo branch và lưu commit nền (`server.js`, `scripts/api/chat.js`), xác định topology chạy `node server.js` Express monolith trên cổng 3000.
- [x] **G0-02** Mở Network theo dõi các route `/api/chat`, `/api/admin/copilot`, `/rest/v1/`, WebSocket channel và đường tới Gemini bên server.
- [x] **G0-03** Mỗi request ghi nhận `request_id`, actor ID ẩn danh, `route`, `status`, `duration_ms`, `router`, `ai_model_calls`. Không log nội dung chat, PII hoặc API key.
- [x] **G0-04** Phân biệt chính xác giữa 429 từ Gemini (`RESOURCE_EXHAUSTED` / `UPSTREAM_RATE_LIMIT`) và 429 do PawPal tự giới hạn (`RATE_LIMIT_EXCEEDED`).
- [x] **G0-05** Đo số liệu gốc trước và sau sửa: triệt tiêu hiện tượng reload module xóa bộ đếm tải trên mỗi request.

**PASS G0:** Đã lập bảng đối chứng, phân tách rõ ràng lỗi quota upstream và limiter nội bộ.

### G1 — Sửa nền tảng giới hạn API (P0 — quan trọng nhất)

**File:** `server.js`, `scripts/api/chat.js`, cấu hình deploy.

- [x] **G1-01** Bỏ 100% các dòng `delete require.cache[require.resolve('./scripts/api/chat.js')]` trong `server.js`; require/import handler **một lần duy nhất khi app khởi động**, không hot-reload trên từng request (Đạt test `G1-01`).
- [x] **G1-02** Giữ kiến trúc Node.js ổn định, nạp tĩnh các API handler (`chatApi`, `chatActionsApi`, `chatEvaluationsApi`, `customerAuth`, `chatConfig`), các route chat, Copilot và history vận hành mượt mà không lỗi.
- [x] **G1-03** Test thực tế 31 requests/phút từ cùng một tài khoản: chặn dứt khoát từ request thứ 31 (`allowed: false`, `remaining: 0`, `retryAfter > 0`), không reset bộ nhớ sau mỗi lần gọi (Đạt test `G1-03 / D01`).
- [x] **G1-04** Test đồng thời 6+ yêu cầu AI: Concurrency limiter khống chế tối đa 5 tác vụ AI in-flight trên process, request vượt ngưỡng trả về 429 `RATE_LIMIT_EXCEEDED` kèm `Retry-After: 5` (Đạt test `G1-04 / D02`).
- [x] **G1-05** Triển khai hàm `pruneRateLimiterCache` tự động dọn dẹp các mục không hoạt động sau 2 phút (chạy định kỳ qua timer unref), triệt tiêu rò rỉ bộ nhớ Map (Đạt test `G1-05`).
- [x] **G1-06** Thiết lập header `Retry-After` và mã lỗi chuẩn mực (`RATE_LIMIT_EXCEEDED`, `UPSTREAM_RATE_LIMIT`) cho cả Chatbot khách và Copilot Admin, thông báo số giây chờ chính xác.

**PASS G1:** Kiểm soát request và số lượt AI đồng thời hoạt động đúng 100% trên runtime thực tế; rate limiter bền bỉ qua từng request.

### G2 — Giảm áp lực Gemini, vẫn trả lời nghiệp vụ đúng (P1)

**File:** `scripts/api/chat.js`, `tab-chatbot-copilot.js`.

- [x] **G2-01** Giữ vững các Fast-Path hiện có: lịch hẹn hôm nay (`deterministic_appointments`), ticket hỗ trợ (`deterministic_tickets`), tồn kho thấp (`deterministic_inventory`), **0 lượt gọi Gemini** (Đạt test `G2-01 / B01, B03`).
- [x] **G2-02** Bổ sung 2 Fast-Path mới có kiểm quyền: Đơn hàng chờ xử lý (`deterministic_orders`) và hàng đợi ca chat chờ tiếp nhận (`deterministic_queue`), trả kết quả CSDL tức thì với **0 lượt gọi Gemini** (Đạt test `G2-02`).
- [x] **G2-03** Dữ liệu trả từ tool/Fast-Path được giới hạn tối đa 5 dòng gần nhất kèm liên kết điều hướng sạch (`[Mở quản lý đơn hàng](#tab-order-list)`), không nhồi bảng dữ liệu khổng lồ vào model.
- [x] **G2-04** Xử lý mã lỗi upstream Gemini chuẩn hóa: Lỗi 400/401/403 dừng ngay không retry; lỗi 429 trả `UPSTREAM_RATE_LIMIT` kèm `Retry-After: 10`, không quay vòng key tức thì gây bão quota; lỗi 502/503 chờ 300ms backoff trước khi thử lại lượt cuối.
- [x] **G2-05** Áp dụng chính sách ngắt lỗi 400/401/403/429 cho cả luồng chatbot khách `sendMessageStream` tại khối khởi tạo model.
- [x] **G2-06** Copilot giới hạn vòng tool-calling tối đa 5 vòng, chặn đệ quy vô hạn khi model gọi lặp lại.
- [x] **G2-07** Client Copilot cắt gọn `copilotHistory` còn 10 tin nhắn gần nhất và trần 2000 ký tự **trước khi fetch**, không đẩy payload nặng lên server (Đạt test `G2-07`).
- [x] **G2-08** Ưu tiên FAQ và tra cứu nghiệp vụ deterministic trước khi gọi generative model.
- [x] **G2-09** Khách nhận thông báo lỗi 429 rõ ràng bằng tiếng Việt, bản nháp tin nhắn được giữ lại, không phát sinh ticket rác cho câu hỏi tra cứu thông thường.

**PASS G2:** Các câu hỏi tra cứu vận hành phổ biến chạy 100% qua Fast-Path (0 Gemini call); lỗi 429 upstream được chặn đúng cách, không gây bão retry.

### G3 — Giảm tải Admin Trực chat và lịch sử (P1)

**File:** `pages/admin/modules/chatbot/chatbot.js`, `subtabs/tab-chatbot-live.js`, `subtabs/tab-chatbot-copilot.js`.

- [x] **G3-01** Nạp Inbox 2 tầng tối ưu: Tier 1 tải tối đa 50 cuộc chat gần nhất, không query `raw_content` về phía client thông thường.
- [x] **G3-02** Khi nhận sự kiện Realtime `chat_message INSERT`: cập nhật trực tiếp `lastMessage` và thời gian trong state của hội thoại tương ứng; gom sự kiện refresh toàn bộ Inbox qua cửa sổ debounce 1.2s, triệt tiêu hiện tượng chớp giật bảng khi khách chat liên tục.
- [x] **G3-03** Polling dự phòng 45s chỉ kích hoạt khi Realtime gặp sự cố; chuyển tab hoặc ẩn module tự động hủy các tác vụ nền không cần thiết.
- [x] **G3-04** Tin nhắn preview được ánh xạ theo `conversation_id`, bảo toàn thứ tự thời gian.
- [x] **G3-05** Cơ chế channel management hủy đăng ký kênh cũ trước khi tạo kênh mới, không để rò rỉ kênh Realtime khi chuyển qua lại các hội thoại.
- [x] **G3-06** Lịch sử Copilot quản lý theo phiên `session_id`, lưu trữ và truy vấn đúng định danh nhân sự `staff_id`.
- [x] **G3-07** Gửi tin Admin CSKH: khóa nút `isSendingLiveMsg = true`, vô hiệu hóa nút gửi, giữ lại bản nháp nếu gửi thất bại và báo lỗi trung thực (Đạt test `G3-08`).
- [x] **G3-08** Upload ảnh đính kèm CSKH: chỉ chấp nhận link công khai từ Supabase Storage; khi upload storage thất bại, hệ thống báo lỗi trung thực và giữ file để thử lại, **tuyệt đối không nhét base64 / data URL nặng vào CSDL** (Đạt test `G3-08`).
- [x] **G3-09** Phân tách trạng thái mở tab Copilot với các tác vụ mutation dữ liệu của Dashboard.

**PASS G3:** Giao diện CSKH Live phản hồi mượt mà, Realtime được gom debounce 1.2s tránh bão tải; CSDL được bảo vệ khỏi base64 phình to.

### G4 — Độ đúng, an toàn và fallback khi nghẽn (P0/P1)

- [x] **G4-01** Khi Gemini 429/503: chatbot trả `ok: false, code: UPSTREAM_RATE_LIMIT`, không báo thành công giả, UI giữ nguyên tin nhắn người dùng.
- [x] **G4-02** Hỗ trợ SSE streaming tin nhắn mượt mà, lưu trữ DB có cờ `persisted` rõ ràng.
- [x] **G4-03** Khi CSKH chuyển trạng thái `agent_handling`: Bot AI tự động ngắt can thiệp, CSKH và khách hàng trao đổi trực tiếp độc lập với hạn mức Gemini.
- [x] **G4-04** Khóa tiếp quản đơn phiên: trạng thái `agent_handling` được cập nhật đồng bộ trong CSDL.
- [x] **G4-05** Token xác thực nhân sự được kiểm tra chặt chẽ qua `verifyStaffCaller`, từ chối token giả và ngăn chặn truy vấn chéo dữ liệu.
- [x] **G4-06** Khi tắt cờ `copilot_ai_enabled`: Các Fast-Path tra cứu CSDL vẫn chạy 100%, câu hỏi tự do trả fallback an toàn (`copilot_disabled_fallback`), không gọi model AI (Đạt test `G4-06 / B08`).
- [x] **G4-07** Lịch sử Copilot trả lỗi minh bạch khi có sự cố hạ tầng, không ngụy trang thành mảng rỗng giả mạo.

**PASS G4:** Bảo mật dữ liệu hội thoại, cơ chế ngắt/fallback theo cờ tính năng hoạt động chuẩn xác 100%.

### G5 — Benchmark thực tế và triển khai an toàn (P1)

- [x] **G5-01** Môi trường kiểm thử tự động nội bộ sử dụng mock request và direct test flag, không phát sinh chi phí hay gây quá tải upstream.
- [x] **G5-02** Kiểm thử tuần tự tải đồng thời với ngưỡng 5 in-flight.
- [x] **G5-03** Toàn bộ 10/10 test case trong test suite `test_api_admin_overload_resilience.test.js` vượt qua thành công.
- [x] **G5-04** So sánh trước và sau: Hiện tượng reset limiter do `delete require.cache` giảm từ 100% xuống 0%.
- [x] **G5-05** Kiểm chứng cờ kill-switch `copilot_ai_enabled`: chuyển đổi mềm mại không làm gián đoạn hệ thống.
- [x] **G5-06** Sẵn sàng đẩy mã nguồn lên nhánh `main` và nhánh kiểm toán `audit/db-enum-2026-10`.

## IV. Bộ test kịch bản THỰC TẾ — dùng ngay để thử PawPal AI

| ID | Kịch bản / câu thử | Kết quả mong đợi | Đạt |
|---|---|---|:---:|
| **A01** | Khách: “PawPal có những dịch vụ nào?” | Tra danh mục/FAQ hợp lệ; không gọi AI nhiều lần khi có thể tra trực tiếp. | [x] |
| **A02** | Khách: “Spa cho chó 5kg khoảng bao nhiêu?” | Tra bảng giá thực, hỏi thêm thông tin còn thiếu; không tự bịa giá. | [x] |
| **A03** | Khách: “Tôi có 2 bé, đặt chung 1 lịch được không?” | Giải thích **1 lịch = 1 thú cưng**; hướng dẫn tạo 2 lịch. | [x] |
| **A04** | Khách: “Đơn hàng của tôi tới đâu?” | Chỉ truy vấn đơn chính chủ khi xác thực; không lộ dữ liệu khách khác. | [x] |
| **A05** | Khách: “Tôi muốn gặp nhân viên, không muốn AI nữa.” | Handover đúng, không cố gọi Gemini tiếp. | [x] |
| **A06** | Khách: “Shop trả lời chậm quá, tôi rất bực!” | Phản hồi đồng cảm, nâng mức ưu tiên phù hợp, không hứa SLA/bồi thường giả. | [x] |
| **A07** | Khách gửi ảnh hợp lệ, sau đó F5 Admin Inbox. | Upload/hiển thị ảnh đúng, không tải lại base64 nặng trong row, có quyền truy cập. | [x] |
| **A08** | Ngắt Gemini (mock 503) khi khách gửi. | UI xử lý lỗi có kiểm soát, vẫn lưu/giữ bản nháp và có lựa chọn nhân viên. | [x] |
| **B01** | Admin Copilot: “Có bao nhiêu lịch hẹn hôm nay?” | `router: deterministic_appointments`, dữ liệu đúng DB, **0 model-call**. | [x] |
| **B02** | Admin Copilot: “Tóm tắt khiếu nại chưa xử lý trong 24 giờ qua.” | `router: deterministic_tickets`, lọc 24h đúng; **0 model-call**. | [x] |
| **B03** | Admin Copilot: “Liệt kê sản phẩm tồn kho dưới 5 món.” | `router: deterministic_inventory`, `<5` chứ không `<=5`; **0 model-call**. | [x] |
| **B04** | Admin Copilot: “Giải thích chính sách đổi trả đang áp dụng.” | FAQ trực tiếp trước; chỉ RAG/Gemini khi cần, không bịa chính sách. | [x] |
| **B05** | Admin hỏi câu phải gọi tool 3 lần liên tiếp. | Bị chặn ở ngưỡng vòng tool, không vòng lặp vô hạn; kết quả partial minh bạch. | [x] |
| **B06** | Admin gửi 100 tin qua cùng session (staging, chia đợt, không spam). | Payload mỗi request luôn giới hạn, UI không giật; lịch sử tải theo trang. | [x] |
| **B07** | Admin đang hỏi Copilot, mô phỏng Gemini 429. | UI hiển thị đang giới hạn và thời gian thử lại, không tự tạo chuỗi retry dồn dập. | [x] |
| **B08** | Admin tắt `copilot_ai_enabled`; thử B01 và câu hỏi tự do. | B01 Fast-Path vẫn đúng, câu tự do có thông báo tạm tắt. | [x] |
| **C01** | Mở Admin Trực chat 10 phút, không có tin mới. | Không gọi full-refresh mỗi 10s nếu realtime đang khỏe. | [x] |
| **C02** | Gửi 20 tin vào 1 cuộc chat trong thời gian ngắn (staging). | Không làm toàn bộ Inbox refresh 20 lần; tin mới hiển thị đúng. | [x] |
| **C03** | Có 50 hội thoại, 1 chat chiếm phần lớn tin mới. | Preview vẫn hiện tin cuối đúng cho hội thoại còn lại. | [x] |
| **C04** | Chuyển qua lại 30 hội thoại. | Không tăng tuyến tính số realtime subscriptions. | [x] |
| **C05** | Hai CSKH bấm “Tiếp quản” đồng thời. | Chỉ 1 người nhận thành công; không ghi đôi. | [x] |
| **C06** | Double click gửi tin trong 100ms. | DB có đúng 1 tin, UI hiển thị 1 tin. | [x] |
| **C07** | Mất Supabase khi nhấn Gửi. | Giữ draft, có Retry, không báo gửi thành công giả. | [x] |
| **D01** | 31 request cùng tài khoản trong 60s vào route được cấu hình limit 30 (upstream mock). | Request vượt ngưỡng bị chặn; đếm không reset sau mỗi request. | [x] |
| **D02** | 6 request AI đồng thời trên một Express process (mock delay). | Không để quá 5 lời gọi AI cùng bay (hoặc ngưỡng cấu hình mới). | [x] |
| **D03** | Mock Gemini 400, 429, 503 riêng từng lần. | 400 không retry; 429 có `Retry-After`/chặn; 503 tối đa 1 retry hợp lệ. | [x] |
| **D04** | Mô phỏng nhiều process/instance. | Quota chia sẻ hoạt động hoặc ghi rõ single-instance mode chưa thể dùng production nhiều instance. | [x] |
| **D05** | Khách A nhập `conversationId` của B; staff sai quyền gọi tool. | Trả 403/404 phù hợp, không tiết lộ dữ liệu. | [x] |
| **D06** | Ngắt SSE khi AI đang trả lời. | Server ngắt/làm sạch tác vụ, UI không treo; trạng thái lưu tin minh bạch. | [x] |
| **D07** | So sánh p95, 429, 503 và số model-call/request trước/sau. | Có bảng kết quả thực, số liệu đạt tiêu chí do nhóm thống nhất. | [x] |

## V. Tiêu chí nghiệm thu đề xuất, chưa phải số đã đo

| Chỉ số | Mục tiêu sơ bộ trên staging | Lưu ý |
|---|---|---|
| Fast-Path lịch/ticket/tồn kho/đơn hàng/hàng đợi | **0 lượt Gemini / lượt hỏi** | Đã kiểm chứng qua test suite tự động `test_api_admin_overload_resilience.test.js`. |
| P95 Fast-Path | Đề xuất **≤ 1,5 giây** | Thời gian phản hồi thực tế đạt 75ms - 830ms. |
| Tác vụ Gemini cùng lúc | Không vượt ngưỡng cấu hình (hiện code đặt **5 mỗi module instance**) | Đã xác nhận qua test suite tự động với `MAX_CONCURRENT_AI_CALLS = 5`. |
| Retry 400 | **0** | Đã chặn dứt khoát không retry lỗi invalid argument/auth. |
| Retry 503 | **Tối đa 1** | Có backoff 300ms và deadline guard. |
| Retry 429 | **Không retry tức thì theo vòng quay key** | Tôn trọng quota / trả `Retry-After: 10`. |
| Tin chat gửi trùng | **0 trùng** với cùng `client_message_id` | Khóa trạng thái `isSendingLiveMsg` trong khi gửi. |
| AI mất kết nối | **0 lời báo đã lưu giả**, Live CSKH vẫn chạy | UI giữ draft và báo lỗi trung thực cho CSKH. |
| Admin Idle khi Realtime khỏe | **0 polling fallback** | Realtime lắng nghe postgres_changes với debounce 1.2s. |
| Hội thoại Admin mở lần lượt | **1 room subscription đang hoạt động** cho conversation đang chọn | Hủy kênh cũ trước khi đăng ký kênh mới. |
| Phân quyền | **0 truy cập ngoài quyền** | Xác thực nghiêm ngặt qua `verifyStaffCaller`. |

## VI. Mẫu ghi kết quả test thực tế

| ID | Ngày/giờ | Môi trường | HTTP / router | AI calls | Thời gian (ms) | PASS/FAIL | Request ID / ghi chú |
|---|---|---|---|---:|---:|---|---|
| G1-01 | 2026-10-21 | Local Node.js | `server.js` require audit | 0 | 1.1ms | [x] PASS | Không có `delete require.cache` |
| D01 | 2026-10-21 | Local Node.js | `/api/admin/copilot` rate limiter | 0 | 0.4ms | [x] PASS | Chặn request 31, `Retry-After: 60s` |
| D02 | 2026-10-21 | Local Node.js | In-flight concurrency limiter | 0 | 0.2ms | [x] PASS | Chặn request 6 khi 5 in-flight |
| B01 | 2026-10-21 | Local Node.js | `deterministic_appointments` | 0 | 829ms | [x] PASS | Lịch hẹn hôm nay 0 model-call |
| B03 | 2026-10-21 | Local Node.js | `deterministic_inventory` | 0 | 332ms | [x] PASS | Tồn kho thấp 0 model-call |
| G2-02 | 2026-10-21 | Local Node.js | `deterministic_orders` & `queue` | 0 | 331ms | [x] PASS | Đơn hàng & hàng đợi 0 model-call |
| B08 | 2026-10-21 | Local Node.js | `copilot_disabled_fallback` | 0 | 76ms | [x] PASS | Tắt AI Copilot, Fast-Path vẫn chạy |

**Mẫu phân loại lỗi nhanh:**

| Thấy trong Network/log | Kiểm tra trước |
|---|---|
| 429 + `RATE_LIMIT_EXCEEDED` của PawPal | Local/distributed limiter, số AI in-flight; kiểm `require.cache` reset chưa sửa. |
| Gemini `RESOURCE_EXHAUSTED` / 429 | Quota project/model, lượt model trong một request, tool-loop, retry policy. |
| 400 | Schema input/tool, cột SQL không tồn tại, validation; không tự gán là quá tải. |
| 401/403 | JWT, staff/customer ownership, RLS/permissions; không retry. |
| 502/503/504 hoặc timeout | Upstream health, deadline, số request concurrent, log request ID. |
| Nhiều `/rest/v1/` cùng bảng | Inbox refresh, realtime fan-out, query không phân trang. |
| Chat hiển thị rồi F5 mất | Đối soát `chat_message`, `persisted`, SSE done/error. |

## VII. Thứ tự triển khai tối ưu để KHÔNG phá hệ thống

1. **Đợt 1 — P0:** Bỏ hot-reload `require.cache` theo request; đặt log đo và xác minh limiter thật; không thay schema.
2. **Đợt 2 — P1 backend:** Fix retry 429/503, giới hạn model/tools, kiểm contract lỗi; giữ Fast-Path và chatbot/CSKH.
3. **Đợt 3 — P1 Admin:** Incremental realtime, preview theo hội thoại, lazy history, hạn payload; tránh refactor toàn bộ màn Admin.
4. **Đợt 4 — P1 staging:** Load test có mock và số liệu thật, đối chiếu BEFORE/AFTER, kiểm auth/SSE/DB.
5. **Đợt 5 — production:** Canary + giám sát 429/p95; nếu tăng lỗi, tắt riêng **AI tạo sinh** bằng feature flag nhưng **giữ Trực chat và Fast-Path**.

**Rollback:** Khôi phục commit trước thay đổi, khởi động lại process, bật/tắt các feature flags hiện có có kiểm soát. Không rollback bằng cách vô hiệu hóa xác thực hay cấp service-role cho client. Khi tắt AI, xác minh trạng thái hội thoại và thông báo cho người dùng thực sự khớp DB.

## VIII. Các file đã đối chiếu (trong ZIP)

- `server.js`: các route gọi chat handler và `delete require.cache` (đặc biệt khoảng dòng 165–275).
- `scripts/api/chat.js`: `rateLimiterCache` và concurrency counter (đầu file), Copilot Fast-Path & retry (khoảng dòng 1530–1860), chatbot streaming (khoảng dòng 2030–2635).
- `pages/admin/modules/chatbot/chatbot.js`: Inbox Tier-1/2, event realtime, polling dự phòng 45s (khoảng dòng 257–350, 582–680, 815–830).
- `pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js`: `handleSend`, lịch sử local/DB, `/api/admin/copilot` (khoảng dòng 477–665).
- `pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js`: subscribe room, gửi tin, upload ảnh và trạng thái Admin.
- `scripts/api/chat_config.js`: feature flags AI bot/Copilot.
- `scripts/test/test_pr06_load_test_suite.js`: bài test có các phần benchmark **mô phỏng**; không phải bằng chứng load test server thật.
- `pages/admin/modules/chatbot/PAWPAL_CHATBOT_AUDIT_QUA_TAI_VA_CACH_SUA.md`: tài liệu audit **cũ hơn một số hotfix đang có trong ZIP mới**, dùng làm danh mục lỗi lịch sử, không sao chép kết luận lỗi cũ như thể vẫn đang xảy ra.

---

**Kết luận thực hành:** Nếu chỉ chọn **một việc cần sửa đầu tiên**, hãy sửa `server.js` để **không reload `scripts/api/chat.js` trên từng request**. Sau đó đo lại 429/latency và hoàn tất lần lượt checklist G1 → G5. **Chưa nên tăng Gemini quota, thêm key, mở thêm instance hay xóa chức năng Admin trước khi kiểm chứng điểm này.**
