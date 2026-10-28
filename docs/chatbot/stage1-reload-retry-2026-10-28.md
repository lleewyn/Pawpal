# Giai đoạn 1 — Thử lại an toàn sau reload

Ngày 28/10/2026. Trạng thái: **Đã sửa local và kiểm chứng offline; giai đoạn 1 chưa hoàn tất.**

## Lỗi và bản sửa

Test trước sửa thất bại: mất acknowledgement rồi reload làm mất câu hỏi và requestId. Ngoài ra, mất phản hồi `public_open` khiến lần thử lại tạo ID hội thoại khác dù server có thể đã mở ca trước đó.

`components/fab/fab.js` hiện lưu đúng **một yêu cầu chưa xác nhận** vào sessionStorage của tab, không lưu lịch sử hội thoại hoặc đưa bản nháp vào localStorage. Bản ghi gồm danh tính, ID hội thoại, ID gửi, nội dung đang chờ, thời điểm và trạng thái mở ca. Thông tin nội dung chỉ tồn tại để khôi phục bản nháp đang gửi; không phải cache kho hội thoại.

- Ghi/kiểm tra bản ghi trước khi phát request. Không giữ được dữ liệu thì dừng trước network và giữ ô nhập, thông báo tiếng Việt.
- ID mở ca được giữ trước `public_open`; mất acknowledgement và reload vẫn thử lại cùng ID khi người dùng bấm gửi.
- ID gửi được giữ trước `public_send`; retry cùng nội dung/đối tượng dùng lại ID cũ. Không tự thử lại hoặc tự gửi khi reload.
- Khôi phục chỉ khi cùng danh tính, đúng guest issuance nếu là guest, dữ liệu hợp lệ, phù hợp ca đang làm và chưa quá 30 phút. Bản ghi hỏng/hết hạn/khác tài khoản bị xóa khi khởi tạo.
- Server xác nhận gửi thành công thì xóa bản nháp pending trước đọc lại timeline. Lỗi đọc timeline sau acknowledgement không làm gửi lại tin đã được xác nhận.
- Đổi tài khoản hoặc bấm tạo chat mới loại bỏ nháp pending cũ. Đóng tab kết thúc sessionStorage theo hành vi trình duyệt; không tuyên bố có khôi phục đa thiết bị.

Không thay endpoint, RPC, bảng, polling hoặc subscription; không thêm query đối soát khi reload. Việc bấm gửi lại là request nghiệp vụ đã có và dùng kiểm tra idempotency phía server. Không coi abort hoặc timeout trình duyệt là hủy SQL server.

## Kiểm chứng

`node scripts/test/chat_widget_reload_retry.cjs`: hai nhóm test dùng reload thật trong Chrome và HTML/JS widget thật, transport giả lập offline:

1. Mất acknowledgement mở ca: reload khôi phục nháp, không tự phát request, retry giữ conversationId, thành công xóa pending.
2. Mất acknowledgement gửi tin: giữ conversationId/requestId qua reload; không tự phát request; thành công xóa pending.

Cả hai nhóm còn kiểm tra khác tài khoản không thấy nháp cũ, bản ghi quá 30 phút bị bỏ và storage quota lỗi không phát network. Test trước sửa fail ở bước khôi phục bản nháp; sau sửa PASS.

`node --test scripts/test/chat_public_send_replay.test.cjs`: 3 test API handler thật với service client giả lập đạt:

- Request đã lưu được trả `replayed=true` kể cả ca đã kết thúc, không gọi AI hoặc lặp transaction ghi.
- ID trùng nhưng khác nội dung/ca/actor trả 409, không ghi.
- Chủ thể khác bị chặn 403 trước truy vấn request history.

Hồi quy: 8 case race/session/timeout Chrome; 9 Node ownership/SLA; 9 gateway handoff đều đạt. Không coi mock API là bằng chứng transaction đồng thời hoặc full Auth/DB hai UI đã nghiệm thu.

## Giới hạn và phần tiếp theo

- TTL được kiểm khi khởi tạo/khôi phục; đây là lưu trữ tạm cùng origin, không mã hóa ứng dụng hoặc TTL tự xóa nền đúng từng mili giây. Không chứa token Auth; không ghi PII vào bằng chứng test.
- Một ID gửi chỉ bảo đảm không ghi trùng khi backend thực thi đúng giao dịch idempotency. Kiểm tra transaction, request cạnh tranh, chuyển/đóng ca, điểm/ticket và ma trận quyền đầy đủ vẫn cần fixture server riêng.
- Bản nháp sửa thành nội dung khác là yêu cầu mới; ID cũ chỉ tái sử dụng cho cùng nội dung/đối tượng. Chưa phải cơ chế hủy request đã chạy ở server.
- Chưa push/deploy hoặc thay Cloud. Rollback bằng diff widget của đợt này, không reset toàn workspace. Không đánh dấu toàn L07/G1.4 đạt trước kiểm chứng tích hợp.
