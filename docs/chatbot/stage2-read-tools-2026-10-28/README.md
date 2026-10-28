# Giai đoạn 2 — Nền tảng công cụ đọc có kiểm soát

Ngày 28/10/2026. **Đã triển khai và kiểm thử lõi local; chưa đóng toàn bộ Gate 2.** Cập nhật mới: [admission dùng chung, timeout và byte cap tại SQL đã kiểm chứng](../stage2-admission-2026-10-28/README.md). Những giới hạn chỉ có ở backend trong lượt đầu dưới đây đã được bổ sung bằng migration136; phạm vi tổng Auth/DB và đường direct DB vẫn mở.

Trước khi bắt đầu đợt này, đã commit/push kết quả giai đoạn 0–1 lên `origin/feat/guest-admin-identity`: `af2deee1ef3b21eb8545b092a9c4de371d7d2270`. Ba tài liệu bị xóa từ trước không nằm trong commit. Migration135 chưa được áp Cloud. Thay đổi giai đoạn 2 hiện còn local, chưa push thêm.

## Những phần đã làm

- `scripts/api/chat_read_tools.js`: danh mục đóng cho 10 intent facts/tri thức hiện có và 2 công cụ context hội thoại/lịch sử. Chỉ RPC/arguments cố định; không nhận tên bảng/cột/SQL từ câu hỏi.
- Chuẩn bị công cụ kiểm tra permission nguồn theo staff đã xác thực, loại tham số, whitelist key, UUID, category/status, query tối đa 120 ký tự và khoảng ngày tối đa 31 ngày khi có kỳ. Vẫn giữ kiểm quyền/RLS trong RPC, không thay bằng kiểm JS đơn thuần.
- Descriptor đã chuẩn bị được đóng băng; executor từ chối object giả hoặc bản copy đổi RPC. Registry staff không cấp năng lực này cho guest/member; nhánh public hiện tại giữ ownership và nguồn riêng, mở rộng công cụ public ở giai đoạn 5–6.
- Một budget chung cho facts, history, conversation context và tìm FAQ của mỗi câu trả lời: tối đa 3 lượt gọi, 2 fetch nguồn đang chạy, 32 KiB mỗi nguồn và 64 KiB nội dung nguồn được chấp nhận; hạn chờ 8 giây. Không tự retry hoặc xếp hàng không giới hạn.
- Supabase builder nhận AbortSignal. Transport không hỗ trợ hủy được chờ rồi kiểm deadline; không dùng Promise.race để giả định query DB đã dừng.
- API trả 403 khi thiếu quyền, 422 khi vượt ngân sách, 504 khi source hết hạn; không lưu trao đổi giả/không gọi AI khi các kiểm này thất bại.
- Hợp đồng phản hồi version1 gồm plan/readOnly/đối tượng/filter/kỳ/nguồn/thời điểm/hạn chế/continuation. Replay lịch sử trả nhãn `saved.reply` và nêu rõ chưa truy vấn lại; không tái dựng nguồn/thời điểm giả.
- Một số biến thể không dấu/lỗi gõ được chuẩn hóa có kiểm soát; tên khách có thể nhập tự nhiên “Khách hàng tên …”. Filter buổi hoặc chưa phân KTV chưa hỗ trợ được hỏi rõ, không bị bỏ qua rồi trả số tổng cả ngày.
- “Khách này” dùng hint của ca khách được chọn, vẫn truy vấn trong quyền caller; “đơn này” thiếu mã không tự lấy đơn gần nhất. Hint chỉ là dữ kiện query, không phải quyền sở hữu.
- UI chụp ca/hint cùng request; đổi context tạo requestId khác. Link tiếp tục text-only chỉ được render nếu hash nằm trong whitelist subtab thật. Hiện chỉ mở phân hệ, chưa truyền bộ lọc chi tiết hoặc lưu continuation trong lịch sử DB.
- Sửa thêm race khi response tải history ban đầu đến sau câu trả lời mới: phiên bản đọc cũ không ghi đè kết quả vừa được server xác nhận.

## Kiểm chứng

| Nhóm | Kết quả |
|---|---|
| `chat_read_tools.test.cjs` | 10 test PASS: intent/variant/context, quyền/audience, whitelist/descriptor, ngày, count/concurrency, bytes/rows, error và cancellation signal |
| `chat_read_api_budget.test.cjs` | 3 test PASS: 403 không source-call, 422 không save/model, 504 không false-zero/save |
| `chat_model_privacy.test.cjs` | 4 test PASS, injection không điều khiển SQL/công cụ ghi; renderer escape HTML |
| `chat_read_contract_ui.cjs` | PASS: hint đã chọn không preload, continuation hợp lệ và từ chối javascript URL |
| `chat_copilot_initial_load_race.cjs` | PASS: history cũ đến muộn không làm mất câu trả lời mới |
| Business/extended/paging-cache | 40 case planner/API và extended facts, context, cache/phân trang UI PASS |
| `chat_stage2_local_read_tools.cjs --local-fixtures` | 6 nhóm Auth JWT/API/RPC local thật PASS; không model call |

Mocks cũ dùng staff không có bất kỳ quyền nguồn nào cho các câu hỏi số liệu đã được sửa thành fixture có quyền tối thiểu phù hợp. Các bài từ chối quyền riêng vẫn giữ và kiểm không gọi RPC nghiệp vụ. Không suy rằng staff được dùng mọi công cụ chỉ vì có quyền history.

## Bằng chứng local thật

Trong clone có marker và Auth/REST localhost riêng:

1. Staff ADMIN gọi đúng một `admin_copilot_facts`, nhận contract v1 và kết quả trong byte budget.
2. Staff chỉ có history.read/write bị403 trước RPC facts.
3. Câu không dấu có typo đi vào đúng lịch hẹn và timezone Việt Nam.
4. Câu tiếp “thế ngày mai…” dùng hai lượt nguồn trong cùng budget: private history và facts.
5. Hint khách hiện tại qua API thành lookup theo quyền caller.
6. Key context không có trong whitelist bị400.

`local-results.txt` chỉ lưu route/method/status, không token/body/danh tính fixture. Clone phục hồi cũ thiếu `product_variant.catalog_retired`, trong khi facts101 và Cloud baseline đã có dependency này. Lượt đầu trả42703/503 đúng lỗi nguồn; đã thêm riêng cột fixture theo migration099 vào clone, không sửa logic facts hoặc schema Cloud để làm test đạt.

Đã dọn DB clone, hai container và credential tạm sau kiểm marker; nguồn vẫn còn. `local-environment.txt` lưu receipt. Công cụ setup/cleanup được mở rộng evidence path stage2, không đổi target Cloud.

## Điều kiện còn lại, không tuyên bố quá mức

- Migration136 bổ sung admission dùng chung cho **nguồn Copilot qua API**: 2 câu hỏi/1 mỗi staff, tối đa4 transaction nguồn. Auth getUser/login-context, kiểm request chống lặp và lưu history vẫn nằm ngoài số lượt nguồn; chưa bao phủ mọi fetch Auth/DB hoặc đọc trực tiếp.
- SQL wrapper kiểm nội dung nguồn tối đa32 KiB trước trả, backend đặt trước phần ngân sách để tổng nội dung nguồn tối đa64 KiB. Không coi đây là trần bytes toàn ứng dụng hoặc HTTP/Auth overhead.
- Đã kiểm chứng trên PostgREST local: timeout function được hoist, PostgreSQL hủy nguồn chậm với57014 và không còn source active sau response. Deadline fetch8 giây vẫn riêng; không đánh dấu DB07/DB16 toàn hệ thống hoặc công suất Production đạt từ kết quả một đường đọc.
- Còn ngân sách tổng Auth/DB/đường direct DB trước đóng resource gate toàn hệ thống/phát hành. Không tự ALTER ROLE trên Cloud để áp timeout cho phân hệ khác.
- Không mở SQL tự do hoặc tool lựa chọn từ model. Ngôn ngữ hiện xử lý các intent/phạm vi đã đăng ký, không hứa hiểu mọi câu hỏi hoặc tự mở nhóm nghiệp vụ mới; nhóm nguồn mới vẫn triển khai theo giai đoạn 3–6.
- Tuần/tháng/buổi/phân công và nhiều phép liên phân hệ chưa mở đồng loạt. Câu vượt khả năng phải hỏi làm rõ; không lấy hợp đồng plan v1 làm bằng chứng các công cụ tương lai đã tồn tại.
- Chưa chạy model thật, stress Production hoặc gọi Logs. Chưa áp migration/DB setting mới lên Cloud trong giai đoạn 2.

## Khôi phục

Đảo riêng diff giai đoạn2 của API, Copilot/source registry, frontend context/continuation và các test đã sửa; giữ commit giai đoạn1. Migration136 mới chưa áp Cloud; có rollback riêng và yêu cầu drain traffic trong báo cáo admission. Không reset workspace hoặc đưa ba tài liệu đang xóa vào commit khác.
