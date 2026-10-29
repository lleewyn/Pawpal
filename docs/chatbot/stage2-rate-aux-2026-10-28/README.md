# Rate dùng chung và các nguồn đọc còn lại

Ngày 28/10/2026. Đã triển khai và kiểm chứng local migrations141–143. Chưa push, chưa áp lên Cloud. Người dùng xác nhận hiện **không có Redis/Upstash hay dịch vụ bổ sung**; đợt này không thêm dịch vụ.

## Hạn mức câu hỏi Admin

- Migration141 kiểm tối đa10 lần cấp lượt cho một nhân viên trong cửa sổ60 giây, dùng thời gian database và chia sẻ giữa process/instance. Kiểm tra nằm trong RPC `acquire_admin_chat_read` đang có, cùng transaction với cấp slot; không có RPC kiểm rate riêng, không quét lịch sử tin nhắn.
- Chỉ lưu một dòng/staff với tối đa10 timestamp, có FK xóa theo staff; không tạo log từng request hoặc cron dọn cửa sổ. Timestamp hết60 giây được loại ở lượt kiểm tra tiếp.
- API đưa **mọi câu hỏi mới hợp lệ** qua admission, kể cả câu chỉ giới thiệu chức năng/làm rõ. Replay phản hồi đã lưu được xử lý trước, không lấy slot hoặc tốn quota mới. Hạn mức2 câu hỏi đồng thời/1 mỗi staff vẫn giữ.
- Câu có nguồn dữ liệu đã có acquire/release từ136 nên kiểm rate không tăng số RPC. Câu nhẹ trước đây bỏ qua admission nay thêm hai RPC control nhỏ; đổi lại có rate chung giữa instance. Không tuyên bố mọi nhánh giữ nguyên số request.
- Hết quota trả429 và `Retry-After: 60`, thông báo đúng giới hạn một phút; đầy slot trả429 với `Retry-After: 1`. Không tự retry. Kiểm local theo process vẫn giữ làm lớp chặn sớm; database mới là rate dùng chung cho câu hỏi được cấp lượt.
- Auth getUser/login-context và kiểm request đã lưu vẫn diễn ra **trước admission**, chưa được limiter này bao phủ.

## Đọc nguyên văn, nhân viên và chính sách

Migration142 bổ sung ba RPC có quyền riêng, dùng chung pool4 transaction nguồn, timeout SQL5 giây/lock1 giây và nội dung tối đa32 KiB:

- `read_admin_chat_raw_bounded`: gọi nguyên RPC kiểm quyền ADMIN/MANAGER và audit cũ. Đọc thành công vẫn ghi kiểm toán; thiếu quyền hoặc vượt trần thì không trả dữ liệu. Lỗi vượt trần rollback cả audit của lượt chưa xem được, không ghi giả rằng đã xem. Nguyên văn quá32 KiB hiện bị từ chối rõ; không dùng cơ chế phần của sanitized content để lách quyền raw.
- `get_admin_chat_handlers_bounded`: giữ tiêu chí nhân viên hoạt động, không bị khóa, có quyền nhận ca và loại chính caller; giới hạn100 người. Vượt100/32 KiB bị từ chối, không âm thầm bỏ người nhận hợp lệ.
- `get_admin_chat_point_policies`: giữ projection chính sách đang hoạt động; tối đa50. Khác với limit50 cũ, phát hiện mẫu thứ51 và báo vượt hạn mức thay vì coi50 mẫu là danh sách đầy đủ.

Frontend đổi nguồn đọc, giữ các form/thao tác ghi hiện có. Thông báo lỗi đọc nguyên văn dùng tiếng Việt, không đưa mã lỗi kỹ thuật vào giao diện. Không thêm channel hoặc polling.

## Kiểm tra quy tắc và chat khách hàng

Migration143 gom các nguồn nội bộ:

| Luồng | Trước | Sau |
|---|---:|---:|
|Đọc nguồn cho kiểm tra quy tắc |3 request bảng |1 RPC snapshot |
|Câu khách hàng cần FAQ/lịch sử |4 request nguồn |2 RPC |
|Câu chưa rõ hoặc đã ở chế độ nhân viên |2 request kiểm duyệt |1 RPC quy tắc; không tải FAQ/lịch sử |

- Snapshot kiểm tra quy tắc giữ đầy đủ row scenario cho kiểm tra phiên bản lúc lưu; không bỏ optimistic check hoặc quyền audit/write. Bổ sung kiểm sentiment.read rõ ràng thay vì để RLS trả tập rỗng rồi chấm trên nguồn thiếu.
- Quy tắc kiểm duyệt chỉ lấy `keyword/action/replacement_text` và `tier_level/trigger_pattern`, đúng các trường evaluator sử dụng. Thứ tựID được giữ. Benchmark giữ thêm is_active để lọc như trước. Không nâng trần để chứa các cột không dùng.
- Trong fixture hiện tại, body quy tắc giảm **31.980 → 12.542 byte** ở dạng JSON compact, kết quả kiểm duyệt giữ nguyên trên bộ câu bình thường/từ khóa/cảm xúc đã so sánh. Guard SQL đo JSON nguồn theo cách serialize của PostgreSQL, có thể lớn hơn body compact.
- RPC quy tắc public có cap32 KiB; FAQ và8 tin gần nhất có cap64 KiB; snapshot benchmark có cap64 KiB. Mỗi nhóm quy tắc/FAQ/scenario tối đa500 row, phát hiện row501 thay vì âm thầm bỏ cấu hình. Cả ba dùng pool4/timeout5 giây/lock1 giây.
- Hai RPC nguồn public **chỉ service role được gọi**. API vẫn xác minh Auth/guest và quyền sở hữu hội thoại trước khi gọi, không công khai RPC cho guest/member. Nguồn trả về không có raw_content/internal_note; FAQ chỉ question/answer, context chỉ sender_type/content.
- Câu chưa rõ hoặc chuyển nhân viên vẫn tránh FAQ/model. Luồng trả lời rõ giữ contract cũ; model được stub trong test, không gọi AI ngoài. Source quá lớn/timeout/đủ tải trả422/504/429, không lưu câu trả lời giả.

## Bằng chứng

`chat_shared_rate_aux_local.cjs --local-fixtures`: **8 nhóm PASS**, hai process Node riêng với JWT/REST thật. Đã thử10 lần nhận lượt từ hai process và lần11 bị chặn ở cả hai, tách quota actor, timestamp cũ được loại, audit raw thành công/không thành công, quyền nguồn phụ, pool chung, chính sách vượt50 và rollback141/142. Hash migration/kết quả: `rate-aux-results.txt`.

`chat_server_bundles_local.cjs --local-fixtures`: **10 nhóm PASS**, Auth GoTrue thật, handler hiện tại, SDK/PostgREST thật. Bao gồm so sánh evaluator full/projection, ownership thành viên/guest, rõ/chưa rõ, snapshot benchmark và lưu kết quả, quyền service-only, pool chung, SQL timeout khi khóa bảng, cap cấu hình/FAQ và không lưu khi nguồn lỗi, rollback143. Hash migration/số đo: `server-bundle-results.txt`. Một lần gọi model stub để kiểm luồng rõ; **0 lần gọi model ngoài**.

Trong lượt kiểm chứng, Auth/REST task-owned đã dừng sau Docker restart trước lúc tiếp tục. Chỉ hai container có ID/label đúng được khởi động lại, không thay container nguồn. Projection full ban đầu vượt guard SQL32 KiB; đã sửa lấy đúng trường dùng và kiểm lại, không tăng ngân sách. Worker test đã được sửa để chấp nhận HTTP204 không có JSON; các assertion fixture được giới hạn theo actor của lần chạy, không nới kiểm tra ứng dụng.

**26 test offline PASS** cho registry/budget/admission/API/privacy/message parts; thêm kiểm Retry-After và admission của câu nhẹ. UI business, panel, thư viện, paging/cache, message parts và40 case planner/extended đều PASS. Ảnh hồi quy cũ được khôi phục sau test.

Đã thử rollback từng migration trong clone và giữ RPC nghiệp vụ gốc. Cuối đợt dọn đúng database, hai container và credential tạm sau xác minh marker/label; nguồn giữ nguyên (`local-environment.txt`). Không truy vấn Cloud hoặc Logs, không deploy hoặc push.

## Điều kiện còn chặn Gate2

|Phần còn lại |Trạng thái cụ thể |
|---|---|
|Tổng request trước Auth |Chưa có guard chia sẻ tại lớp hosting; rate SQL sau Auth không thay thế được. Chưa thêm dịch vụ theo lựa chọn người dùng. Cần xác minh/cấu hình giới hạn ingress tại hosting hiện có trước cam kết hard cap toàn hệ thống. |
|Public open/list/read/mode/feedback |Đợt144 đã đưa [body lịch sử/feedback và đọc phần](../stage2-public-history-2026-10-28/README.md) vào source pool/cap. Auth/ownership và open/list/mode/ghi feedback còn đường hiện có ngoài pool. |
|Lưu exchange/audit/benchmark và runtime model config |Không thuộc trần số lượt nguồn; phải tính vào tổng tải, không bỏ kiểm quyền/audit để giảm request. |
|Đường RPC/table cũ |Vẫn còn để tương thích; không được gọi pool mới là sandbox cưỡng chế mọi đường DB. Không revoke mù trước kiểm tra nơi đang dùng. |
|Dữ liệu rule/raw/handlers quá lớn |Hiện từ chối rõ theo trần, chưa có tất cả luồng tìm/đọc chi tiết riêng. Không cắt dữ liệu để sửa hoặc đưa ra quyết định. |
|Phát hành |Checkpoint đến143 đã push ở472da7ed; phần144 tiếp theo còn local. Migrations135–144 chưa áp Cloud, chưa đo headroom/SLO Production. |

Không dùng một RPC kiểm quota mới cho mỗi lượt Auth để giả rằng đã giảm tải: bản thân RPC control đó vẫn tạo thêm transaction. Không đánh dấu DB16/G2.2 toàn hệ thống đạt khi chưa bao phủ các dòng trên. Đây là điều kiện phát hành còn mở, không phải lỗi được che bằng fallback.

## Triển khai/khôi phục

Áp dependency136 trước141;142 cần các RPC049/050 và bảng chính sách;143 cần các bảng/quy tắc/ownership hiện tại. Áp SQL trước API/browser mới; thiếu RPC thì fail closed, không fallback về truy vấn không giới hạn. Thứ tự migration đầy đủ và điều kiện giai đoạn1 phải được kiểm trước deploy.

Khi rollback, khôi phục API/browser trước, drain lưu lượng rồi bỏ143,142,141 theo script riêng.141 khôi phục acquire136 rồi bỏ bảng rate;142/143 chỉ bỏ wrapper/helper mới, giữ RPC gốc và dữ liệu nghiệp vụ. Không chạy rollback khi API mới vẫn đang sử dụng các function đó.
