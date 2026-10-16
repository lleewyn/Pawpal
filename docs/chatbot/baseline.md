# Hồ sơ hiện trạng chatbot Pawpal — G0-01

Ngày rà soát: 16/10/2026. Người thực hiện: Codex theo yêu cầu chủ dự án.

## Phạm vi và mốc mã nguồn

Ban đầu rà soát tĩnh repository; sau đó đã đối chiếu metadata Supabase và SELECT `limit=0` theo yêu cầu ngày 16/10/2026. Chưa gọi AI, đọc dòng dữ liệu khách, chạy migration, chạy seed hoặc kiểm thử thao tác nghiệp vụ. Phạm vi triển khai chỉ là chatbot Admin; widget khách chỉ là nguồn phụ thuộc được đối chiếu. Đây là hồ sơ đầu vào cho G0-02/G1, chưa phải xác nhận an toàn hay nghiệm thu toàn G0.

- Commit trước thay đổi: `3b04037017b7239bea377361f727df635a15fa56`.
- Nhánh ban đầu: `main`; nhánh làm việc: `codex/chatbot-g0-baseline`.
- Tag cục bộ trước thay đổi: `chatbot-before-g0-20261016`, trỏ về commit trên.
- Trạng thái ban đầu: chỉ file kế hoạch `pages/admin/modules/chatbot/PAWPAL_ADMIN_CHATBOT_KE_HOACH_TRIEN_KHAI.md` chưa được Git theo dõi. Tag không bao gồm file chưa theo dõi này. Ghi nhận SHA-256 bản kế hoạch trước cập nhật trong bảng phiên bản bên dưới.
- Quy tắc đã đọc: `AGENTS.md` tại gốc; không tìm thấy `AGENTS.md` lồng trong danh sách file của repository.

## Mã nguồn và đường đi yêu cầu

| Thành phần | File và bằng chứng | Vai trò hiện thấy |
|---|---|---|
| Backend Vercel | `api/chat.js:1` | Chuyển tiếp sang `scripts/api/chat.js` |
| Backend cục bộ | `server.js:164` | Express nhận `POST /api/chat`; `npm run dev` chạy `node server.js`; cổng được gán trực tiếp là 3000 |
| Xử lý chat/AI | `scripts/api/chat.js` | Một file chứa xác thực, lấy/tạo hội thoại, bộ lọc, prompt, gọi Gemini, công cụ dữ liệu, ghi tin và streaming |
| Cấu hình AI | `getGenAI()`, `getActiveSystemPrompts()`, `toolsDeclaration`, đoạn `systemInstruction` trong file trên | Lấy khóa từ bảng `api_keys` hoặc `GEMINI_API_KEY*`; prompt từ code, bảng `chatbot_system_prompt` hoặc body; model chat ghi trong code là `gemini-2.5-flash`, embedding là `gemini-embedding-2`. Đây chỉ là tên trong mã, chưa xác minh khả dụng |
| Copilot admin | `pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js:99` | Gọi cùng `/api/chat`, gửi lịch sử và `systemPrompt`; tại vị trí này chỉ thấy header Content-Type, chưa gửi Authorization |
| Core/Live/Quy định | `pages/admin/modules/chatbot/chatbot.js`, `subtabs/tab-chatbot-live.js`, `subtabs/tab-chatbot-rules.js` | Đọc/ghi Supabase và đăng ký realtime phía trình duyệt; chi tiết quyền từng thao tác thuộc G0-02/G1 |
| Widget chính phía khách | `components/fab/fab.html`, `fab.js`, `fab.css` | `fab.js:1124` gửi lịch sử, conversationId, sessionToken và stream tới `/api/chat`; lấy Supabase access token hoặc tạo `local:` từ dữ liệu trình duyệt; có subscription postgres_changes |
| Luồng hỗ trợ bổ sung | `scripts/shared/support-handler.js:87` | Có đường gọi `/api/chat` với access token nếu có; được nạp tại `pages/user/index.html:57`. Cần đối chiếu luồng kích hoạt với widget để tránh bỏ sót cổng nhận tin |
| Tài liệu nghiệp vụ | `CHATBOT_MASTER_PLAN.md`, `ADMIN_BUSINESS_WORKFLOWS_FOR_CHATBOT.md` trong thư mục chatbot | Tài liệu tham chiếu; chưa tự coi các chính sách trong đó là đã duyệt hoặc đang có hiệu lực |

Không tìm thấy module middleware admin riêng được import vào handler chat trong phần mã đã rà. `scripts/api/chat.js:502–510` điều phối ba action quản lý tài khoản nhân sự sang `staff_auth.js`; `server.js:187–189` cũng có route riêng cho chúng. Cần kiểm tra quyền toàn bộ các đường này ở G1-02.

## Đăng nhập, khôi phục phiên và Supabase

- `pages/admin/login/login.js`: đăng nhập bằng Supabase Auth; tra `staff.auth_user_id = authUser.id`, kiểm tra `account_status`, xử lý `must_change_password`, rồi lưu hồ sơ admin có `staff.id`, `auth_user_id`, `system_role`, `permissions`.
- `pages/admin/admin.js:67`: đọc hồ sơ `pawpal_admin_user` từ sessionStorage/localStorage. Đây là trạng thái frontend, không đủ chứng minh quyền backend.
- `scripts/api/supabase-client.js`: ưu tiên cấu hình window, sau đó localStorage, sau đó giá trị fallback trong source; tạo client với persistSession/autoRefreshToken; admin dùng storageKey `pawpal_admin_supabase_auth`. Chưa xác minh loại/quyền thực tế của khóa fallback.
- `scripts/vendor/supabase.js`: SDK trình duyệt được nạp ở trang admin/login. Trang user còn nạp SDK từ CDN `@supabase/supabase-js@2`; chưa đối chiếu phiên bản vendor với lockfile.
- `scripts/shared/auth.js`, `scripts/shared/customer-auth.js`, `scripts/api/customer_auth.js`, `scripts/api/customer_auth_store.js`, `api/customer-auth.js`: luồng phiên khách hàng và API đăng nhập/OTP; server tạo client anon và service role, store gọi RPC lưu thử thách/giới hạn. Cần G0-02 xác minh ánh xạ ID thực tế.
- `scripts/api/chat.js:71`: token Supabase được kiểm tra qua `auth.getUser()`, nhưng có nhánh `local:` chỉ kiểm tra tồn tại `customer.id` và cache. Chưa thấy ánh xạ `auth user id` sang `customer.id` tại nhánh trả `user.id`; cần đối chiếu với schema thật.
- `scripts/api/staff_auth.js`: dùng service role để cấp/đổi/khóa tài khoản; cần G1 kiểm tra guard quyền của người gọi.

## Cấu hình chạy và phụ thuộc

- Có `package.json`, `package-lock.json`, `server.js`, `vercel.json`, `README.md`, `jsconfig.json`, `.gitignore`, `.env`, `.env.example`, `.env.preview.example`.
- Package chỉ khai báo script `dev`; chưa có script test/build chung trong package. Dependencies gồm `@google/generative-ai`, `@supabase/supabase-js`, `express`, `dotenv`, `jsonwebtoken`, `bootstrap`, `glob`, `qs`; phiên bản chính xác được ghi riêng từ lockfile.
- Vercel cấu hình `outputDirectory: .`, buildCommand dạng lệnh rỗng chức năng, rewrite trang admin và API customer auth. Chưa xác minh bản deploy hiện hành, biến môi trường từ dashboard hay các lớp bảo vệ bên ngoài repository.
- `.gitignore` bỏ qua `.env` và `.env.*`; ba file môi trường cục bộ không có trong danh sách Git tracked tại lúc rà soát. Điều này chưa chứng minh lịch sử Git không từng chứa bí mật.

### Danh mục cấu hình đã che giá trị

Chỉ ghi tên, nơi dùng và loại; không sao chép giá trị, tiền tố khóa hay token.

| Tên | Nơi thấy/nơi dùng | Loại và điều cần xác minh |
|---|---|---|
| `SUPABASE_URL` | Ba file môi trường; backend chat/staff/customer auth/RAG | Địa chỉ dịch vụ; chưa đối chiếu project/môi trường |
| `SUPABASE_SERVICE_ROLE_KEY` | Ba file môi trường; backend chat/staff/customer auth, RAG và script test | Khóa đặc quyền theo cách sử dụng; cần kiểm tra loại thật/quyền và phạm vi triển khai ở G1 |
| `SUPABASE_ANON_KEY` | Ba file môi trường; customer auth, test; cấu hình trình duyệt dùng thuộc tính cùng tên | Khóa client theo thiết kế; chưa xác minh claim/quyền thực tế |
| `GEMINI_API_KEY`, họ tên `GEMINI_API_KEY*` | `.env`; chat lấy động theo tiền tố; `scripts/rag/embed_data.js` | Bí mật nhà cung cấp AI; chat còn lấy từ `api_keys.key_value` |
| `__PAWPAL_SUPABASE_CONFIG__`, `__SUPABASE_CONFIG__` | `scripts/api/supabase-client.js` | Đối tượng cấu hình window; có `url`/`anonKey` hoặc `SUPABASE_URL`/`SUPABASE_ANON_KEY` |
| `pawpal_supabase_url`, `pawpal_supabase_anon_key` | localStorage trong client initializer | Ghi đè cấu hình trình duyệt; cần xác minh cách cấp cấu hình thực tế |
| `PAWPAL_SMS_MODE`, `PAWPAL_AUTH_TEST_PHONES` | `.env.preview.example`; `scripts/api/customer_auth.js:220` | Cấu hình OTP/thử nghiệm; runtime có mặc định demo, cần xác minh môi trường thật |
| `PORT`, `CLIENT_ORIGIN`, `NODE_ENV` | Có tên trong `.env`/`.env.example` | Cấu hình chạy; `server.js` hiện gán cổng trực tiếp, chưa xác minh các tên còn lại được dùng đầy đủ |
| `MONGODB_URI` | `.env.example` | Cấu hình mẫu cũ; chưa thấy liên quan đường chat đã rà |
| `VNP_TMN_CODE`, `VNP_HASH_SECRET`, `VNP_URL`, `VNP_RETURN_URL` | `.env` | Cấu hình thanh toán ngoài phạm vi chatbot; không đưa giá trị vào hồ sơ |

## Database, migration và quyền có trong repository

| Nguồn | Nội dung quan sát được |
|---|---|
| `scripts/database/20261007_chatbot_full_system.sql` | DDL 3 bảng vận hành `chat_conversation`, `chat_message`, `chat_moderation_log` và 10 bảng quy tắc/tri thức; khóa ngoại, CHECK và index; thêm conversation/message vào publication `supabase_realtime`. File có cả seed, không chạy khi kiểm kê |
| `scripts/database/20261007_chatbot_security_rls.sql` | RLS/policy cho vận hành và quy tắc; bảng archive, hàm `archive_old_chat_messages` SECURITY DEFINER. Một số điều kiện cho mọi authenticated hoặc session_token khác null; phải kiểm chứng quyền ở G1, không coi tên policy là bảo đảm quyền |
| `scripts/database/20261007_chatbot_csat_close_session.sql` | Cột hoàn tất/CSAT, bảng `chat_rating`, RLS và publication |
| `scripts/database/20261010_chat_conversation_ticket_link.sql` | `ticket_id` tham chiếu `support_ticket` và index |
| `scripts/database/20261007_chatbot_seed_data_template.sql`, `20261007_chatbot_seed_data_custom.sql`; `pages/admin/modules/chatbot/seed_data/` | Nguồn seed/tài liệu dữ liệu; chưa chạy và chưa xác minh được duyệt |
| `scripts/database/20261010_staff_auth_account_provisioning.sql` | Thêm ánh xạ auth cho staff/customer, hàm `check_user_account_type` |
| `scripts/database/20261010_customer_auth_security.sql`, `20261010_customer_auth_vercel_otp.sql` | Quyền, hàm và trigger bảo vệ danh tính khách; RPC cho auth/OTP; phải đối chiếu bản áp dụng thật |
| `scripts/rag/setup_vector_db.sql`, `fix_vector_dimensions.sql`, `embed_data.js` | RPC `match_documents` truy vấn `document_embeddings`, thay đổi kích thước vector và công cụ nạp tri thức. Công cụ nạp có nội dung tĩnh; không chạy trong G0-01 |

Đã có đối chiếu metadata đang được API công bố: xem [báo cáo Supabase](supabase-admin-comparison.md). Có 13 bảng chính; thiếu 6 cột bổ sung, 2 bảng bổ sung không được công bố; danh sách Storage có 0 bucket.
Đã chạy trích xuất catalog qua SQL Editor ngày 16/10/2026 xác nhận:
- **RLS:** `rls_enabled: false` và `rls_forced: false` trên toàn bộ 13 bảng chatbot. File migration bảo mật `20261007_chatbot_security_rls.sql` chưa từng được áp dụng trên môi trường này.
- **Realtime publication:** `supabase_realtime` đã đăng ký chính xác 2 bảng `chat_conversation` và `chat_message`.
- **Migration ledger:** `supabase_migrations.schema_migrations` không tồn tại (`migration_ledger_exists: false`); database được khởi tạo thủ công không qua runner Supabase CLI.

## Phát hiện cần chuyển gói tiếp theo

1. G1-01: `scripts/shared/support-handler.js` có một chuỗi khóa AI gắn trực tiếp trong source frontend. Không sao chép giá trị. Chưa thử khóa, chưa xác định còn hoạt động hoặc đã được công khai qua deploy; cần kiểm tra lịch sử/phân phối và xử lý thay khóa nếu xác nhận phơi lộ. Backend còn trả tiền tố khóa qua `X-API-Key-Used`; cần rà cùng gói.
2. G1-02: **Rủi ro P0 khẩn cấp do RLS đang tắt hoàn toàn trên 13 bảng chatbot**; bất kỳ client nào mang `anon_key` đều có thể đọc/ghi trực tiếp vào `chat_conversation`, `chat_message` (kể cả `raw_content`), `chatbot_system_prompt`. Cần bật RLS và phân quyền nghiêm ngặt phía server. Kiểm tra nhánh xác thực `local:`, ánh xạ ID, dùng service role, guard cho action nhân sự và tách quyền Copilot/khách.
3. G1/G2: Triển khai policy SQL và kiểm chứng quyền đọc `raw_content`, archive, CSAT và các đường realtime.
4. G1-03/G1-04 có thể bắt đầu độc lập trên frontend: render an toàn, bỏ phản hồi cố định khi Copilot lỗi, bỏ demo; chưa sửa trong G0-01.

## Đầu vào còn thiếu và ảnh hưởng

| Mã | Đầu vào | Gói phụ thuộc | Người/nguồn cần cung cấp |
|---|---|---|---|
| IN01 | Đã đối chiếu metadata cột/kiểu/quan hệ/RPC; đã xác nhận RLS = false trên 13 bảng và không có migration ledger | G0-02, G1-02/05, G2, G4 | Đã hoàn tất xác minh hiện trạng cho G0-01 |
| IN02 | Đã xác nhận Storage có 0 bucket; Realtime đã bật cho 2 bảng `chat_conversation`/`chat_message` | G0-02, G1-02/05, G2-06/08 | Đã hoàn tất xác minh hiện trạng cho G0-01 |
| IN03 | Bản deploy/commit đang chạy, tên biến môi trường và loại khóa phía hosting, các lớp guard bên ngoài code | G1-01/02, G5-05 | Chủ dự án/Backend; không gửi giá trị khóa |
| IN04 | Môi trường test tách biệt, tài khoản theo vai trò và quyền truy cập được xác nhận | G0-04, kiểm thử G1–G5 | Chủ dự án/QA |
| IN05 | Đã xác định nguồn chat web và luồng đọc/ghi Admin; cổng ngoài web không thuộc triển khai Admin hiện tại | Không chặn G0-01 | Widget/kênh ngoài web chỉ là phụ thuộc cần phối hợp khi phát sinh |
| IN06 | Quyết định D01–D09 và chính sách tri thức/khóa/lưu nguyên văn | G0-03, G2–G4 | Chủ dự án/CSKH |

## Kiểm chứng và trạng thái bàn giao

Đã kiểm kê đường dẫn, đọc luồng backend/auth/widget và SQL liên quan, ghi Git HEAD/trạng thái ban đầu, tạo nhánh/tag, ghi SHA-256 tám nguồn cùng bản kế hoạch trước sửa. Đã chạy công cụ metadata chỉ đọc, tạo báo cáo và trích xuất catalog SQL thực tế xác nhận trạng thái RLS/Realtime/ledger; không sửa mã ứng dụng. Không chạy test lifecycle vì script dùng thông tin môi trường hiện hành và có thao tác ghi vào database; không coi việc tồn tại script là bằng chứng kiểm thử đạt.

**G0-01: 8/8 mục hoàn thành; đã nghiệm thu toàn bộ G0-01.** IN01–IN02 đã được đáp ứng đầy đủ hiện trạng thực tế. G0-02/G0-03/G0-04 thuộc các bước tiếp theo của Giai đoạn 0.

## Phiên bản nguồn

Các SHA-256 được lấy từ nội dung file trên đĩa trước khi cập nhật kế hoạch. Commit cuối của từng file được ghi để truy nguyên lịch sử; hash nội dung là mốc chính xác để đối chiếu.

| File (tương đối với thư mục chatbot) | Commit cuối | SHA-256 trước cập nhật |
|---|---|---|
| chatbot.js | b1265fa | 27de50d49c03f8dbf50ba13fb1b3988ed31a67627b500c7c84915d8cb3de79af |
| chatbot.html | b1265fa | 9f120e4e25ba2079cd88e491df8d51c402d119380b72aeeb1ce456f6c094951c |
| chatbot.css | f707430 | 304891521a4f98d5bb1ec3cfb406d472bdb11418331dfaf24078ac9d64752bce |
| subtabs/tab-chatbot-live.js | a0387d8 | 522019faeff18cea09a6777796ac89e5f0bb0efe3c7e172493526df675aab6ea |
| subtabs/tab-chatbot-copilot.js | 71ed190 | 8fd3c2bd57d6323a5015bcdb0a53428cf1fdc951a40551d46e16e45f3d242131 |
| subtabs/tab-chatbot-rules.js | 71ed190 | 3e44e9d69079a177339865b85d797446177393bde2c61d9de457d05c2287f6fa |
| CHATBOT_MASTER_PLAN.md | 3efeb84 | d2b875e34ff4069ff607117599e1a9f17f79f0109f398179e51231b88a7868ab |
| ADMIN_BUSINESS_WORKFLOWS_FOR_CHATBOT.md | 3b04037 | 0773e4064b6acd10bc879c31c62ae082dfbe8f6b688bf7a9497b1d33e41967c3 |
| PAWPAL_ADMIN_CHATBOT_KE_HOACH_TRIEN_KHAI.md | Chưa tracked | 39b6dba2c2fc351e19d74328f84e03ce49cab3f00010f61412896d48ad630c1a |

### Phiên bản trong package-lock.json

| Gói | Phiên bản khóa |
|---|---|
| @google/generative-ai | 0.24.1 |
| @supabase/supabase-js | 2.110.1 |
| express | 5.2.1 |
| dotenv | 17.4.2 |
| jsonwebtoken | 9.0.3 |
| bootstrap | 5.3.8 |
| glob | 13.0.6 |
| qs | 6.16.0 |
