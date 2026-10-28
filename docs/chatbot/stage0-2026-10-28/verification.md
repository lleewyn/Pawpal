# Kiểm chứng và khôi phục giai đoạn 0

## Kiểm tra đã chạy

Ngày 28/10/2026 trên local HEAD ghi trong inventory:

| Lệnh | Kết quả |
|---|---|
| `node --test scripts/test/chat_public_owner.test.cjs scripts/test/chat_sla_display.test.cjs` | 9/9 đạt, không Cloud |
| `node scripts/test/admin_copilot_business.cjs` | 40 case intent/date/scope cùng hợp đồng API/nguồn/quyền đạt, không Gemini |
| `node scripts/test/admin_copilot_extended.cjs` | Multi-turn, giá, tri thức/thực thu, formatter/quyền đạt; không truyền --cloud |
| `node scripts/test/chat_public_automatic_handoff.cjs` | 9 case gateway đạt; không Cloud |
| `node scripts/test/chat_unhandled_handoff.cjs` | Tín hiệu hiểu/context/RPC flag đạt; không Cloud |
| `node scripts/test/chat_clinical_terms_public_reply.cjs` | Triệu chứng/kiểm duyệt/prompt audience đạt; AI giả lập |
| `node scripts/test/admin_chat_realtime_egress_ui.cjs` | Cache trang, tìm kiếm server, invalidation ca liên quan đạt; Chrome + transport giả lập |
| `node scripts/test/admin_chatbot_paging_cache_ui.cjs` | Phân trang phiên/tin, lazy rules, cache/coalescing đạt; Chrome + transport giả lập |
| `node scripts/test/chatbot_stage0_inventory.cjs --cloud --production` | Kiểm kê Cloud/deployment/asset đạt, 13 statement trong lần kiểm kê DB gồm transaction/settings/rollback |
| `node scripts/test/chatbot_stage0_read_samples.cjs --cloud` | 3/3 mẫu facts khớp oracle, transaction chỉ đọc rồi rollback |
| `node scripts/test/chatbot_stage0_authenticated_reads.cjs --read-cloud` | 11 bước UI, 23 request dữ liệu đều 200; REVIEW chỉ vì guard chặn một ảnh tĩnh, không có dữ liệu/ghi nghiệp vụ bị chặn |
| `node scripts/test/chatbot_stage0_api_baseline.cjs --read-cloud` | 5 GET handler local + 5 GET Production có JWT đều 200, payload chuẩn hóa giống nhau; đo 3 fetch nội bộ mỗi GET local |
| `node scripts/test/chatbot_stage0_api_baseline.cjs --finalize-evidence` | Hoàn tất so sánh Git offline; module understanding không tồn tại ở commit deploy là phát hiện hợp lệ, không phải lỗi GET |
| `node scripts/test/chatbot_stage0_archive.cjs --archive` | Lưu bền vững hai snapshot sẵn có và kiểm tra hash; không gọi Cloud |
| `node scripts/test/chatbot_stage0_local_setup.cjs --create-local --resume-local` | Tạo bản local riêng và 2 container localhost; áp 9 migration chỉ vào bản sao |
| `node scripts/test/chatbot_stage0_local_transcripts.cjs --local-fixtures` | Guest/member 30+5 tin, revision, chặn đọc chéo, projection và hai widget đạt; 20 lượt đọc/2 tác vụ đều 200 |
| `node scripts/test/chatbot_stage0_pool_snapshot.cjs --cloud-metadata` | Một snapshot aggregate kết nối, không Logs/query text hoặc load test |
| `node scripts/test/chatbot_stage0_local_cleanup.cjs --cleanup-local` | Kiểm marker/label trước dọn; DB test vắng mặt, 2 container dọn, DB nguồn giữ nguyên và credential tạm xóa |

Không cộng số test khác đơn vị thành một tỷ lệ chất lượng chatbot. Hai bài Chrome không chứng minh egress Production hoặc quyền JWT thật. Không chạy các script acceptance có ghi Production trong lượt này.

## Giới hạn và lỗi harness đã xử lý

- Lượt kiểm kê đầu trong sandbox không kết nối được mạng (EACCES); chạy lại có quyền mạng theo cơ chế phê duyệt công cụ rồi thành công.
- Hai lượt mẫu đọc đầu dừng vì alias SQL `day` trong harness gây lỗi cú pháp 42601. Đã đổi sang `sample_date`, rollback cả hai lượt và chạy lại đạt. Chưa thực thi truy vấn facts trong hai lượt lỗi; không phải lỗi dữ liệu ứng dụng.
- Không nhập API key, không gọi Gemini, không tạo khách/staff/đơn/ca thử, không thay schema/rule/Auth hoặc đọc Logs.
- Dòng trên là lượt kiểm kê/mẫu SQL ban đầu. Lượt bổ sung dùng đăng nhập QA thông thường nên Auth có tạo phiên; không cấp/reset/khóa/sửa tài khoản hoặc tạo dữ liệu nghiệp vụ. Không lưu token, body hoặc PII vào bằng chứng.
- Harness API ban đầu đã đo xong 10 GET thành công nhưng dừng khi cố đọc module không có trong commit deployment. Đã sửa phần so sánh nguồn để ghi trạng thái absent; hoàn tất evidence offline, không chạy lại mạng hoặc thay số đo.
- Kiểm kê roles EXECUTE và policy không thay ma trận tài khoản thật; các test quyền sâu giữ ở giai đoạn 1.
- Lượt local tiếp theo có tạo/seed dữ liệu thử, áp migration và dọn chỉ trong DB bản sao có marker; không dùng tuyên bố “chỉ đọc” của lượt Cloud để mô tả setup fixture. Giai đoạn measurement trong harness local chỉ cho phép đọc và không gọi AI. Docker tự phục hồi các container theo restart policy sau khi Desktop khởi động; tác vụ chỉ dọn hai container do chính nó tạo.
- Setup local gặp owner DB không phải postgres, RPC hoàn tất khách chưa có trong bản cũ và trường bắt buộc của fixture tin nhắn. Đã xử lý trong harness/bản test riêng; không sửa schema nguồn hoặc code nghiệp vụ để che lỗi. Lượt chạy cuối PASS và đã cleanup toàn bộ DB test, gồm fixture của lượt chưa hoàn tất.

## Snapshot và phương án khôi phục

- Fingerprint nguồn 13 tệp được lưu trong `inventory.txt`; HEAD và initial git status giữ nguyên ba tệp người dùng đã xóa cùng checklist mới chưa commit.
- Định nghĩa 34 hàm Cloud được lưu **ngoài webroot** tại thư mục tạm riêng, đường dẫn chính xác nằm trong `inventory.txt` trường `privateDefinitionSnapshot`. Không đưa body hàm vào nội dung chat hoặc mã frontend.
- Snapshot này chưa phải bản sao lưu toàn database, Auth, dữ liệu, trigger/grants/policy có thể phục hồi tự động. Metadata inventory giúp đối chiếu, không phải migration rollback hoàn chỉnh.
- Đã sao chép và kiểm chứng hash snapshot `functions.sql` + `inventory.txt` vào `D:/Aboutme/Pawpal-infra/supabase-local/backups/chatbot-stage0-20261028`. Bản này tồn tại ngoài temp và webroot; xem `archive-receipt.txt`. Trước thay đổi DB vẫn phải chụp lại phạm vi cụ thể và chuẩn bị reverse SQL, không coi bản kiểm kê là full rollback.
- Trước thay DB ở giai đoạn tiếp theo: chụp lại đúng dependency/định nghĩa/grants/policy/trigger/index sắp đổi, lưu vào vị trí bền vững được phép, chuẩn bị reverse SQL và thử trên test. Không dựa duy nhất vào thư mục tạm có thể bị hệ điều hành dọn.
- Giai đoạn 0 không thay nghiệp vụ hoặc DB nên không có SQL rollback cần chạy. Muốn bỏ công cụ/tài liệu audit thì chỉ bỏ diff/tệp của đợt này sau review; không `git reset`, không khôi phục ba tệp đang xóa, không chạy migration V1 cũ.
- Chưa commit, push hoặc deploy. Việc sửa tiếp không được coi là cho phép push theo AGENTS.md.

## Tái hiện có giới hạn

Các script mới mặc định không kết nối Cloud/Production hoặc ghi backup ngoài workspace. Chỉ truyền cờ khi cần kiểm chứng thay đổi; không chạy định kỳ, không chạy lại chỉ để làm mới thời gian trong báo cáo. `--cloud`/`--read-cloud` cần cấu hình private hiện có; không in giá trị khóa/mật khẩu. `--finalize-evidence` chỉ hoàn tất so sánh Git cục bộ của mẫu API đã có.

Mỗi lần kiểm kê chỉ đọc danh sách schema/hàm/bảng đã định; GET Production gồm metadata deployment/status, ba JS asset và GET API không đăng nhập. Mẫu facts chỉ có ba query nghiệp vụ và ba oracle. Không dùng các script này như load test.
