# Nghiệm thu giai đoạn 1 — mã local

Ngày 28/10/2026. **Giai đoạn 1 hoàn tất ở phạm vi mã local và môi trường kiểm thử cô lập. Chưa phát hành hoặc áp migration lên Cloud.**

## Kết quả và thay đổi

1. Widget cô lập request/response theo danh tính, timeout 30 giây, giữ requestId khi thử lại; một pending draft được khôi phục qua reload trong sessionStorage của tab, đúng chủ thể và TTL 30 phút, không auto-send.
2. Hội thoại đã đóng/chặn khóa composer. Đổi tài khoản reset trạng thái composer để trạng thái đóng của người trước không khóa tài khoản mới.
3. Boundary gửi mô hình loại bỏ trường raw/internal/credential; che các mẫu token/key, email, điện thoại, dãy số nhạy cảm và trường văn bản có nhãn mật khẩu/tài khoản/địa chỉ. Dữ liệu lưu trong DB không bị thay đổi.
4. Phát hiện và sửa P0 cộng dồn điểm theo ca: migration `135_chat_compensation_case_limit.sql` giữ khóa ca trước tổng hợp ledger, giới hạn nhân viên thường 50 và ADMIN/MANAGER/CSKH_LEAD 200 điểm/ca; vẫn áp max_points và approval của policy. Đổi policy hoặc người phụ trách không reset tổng đã cấp của ca. Replay hợp lệ không được tính lại.

Migration chỉ được áp vào clone local. **Cloud chưa có bản sửa 135 từ lượt này**, vì vậy không coi lỗi cộng dồn trên bản đang triển khai đã được xử lý. Không push hoặc deploy.

## Ma trận bằng chứng

| Mục | Bằng chứng | Kết luận trong phạm vi test |
|---|---|---|
| S01 — ownership | UI acceptance JWT thật cho member khác/member→guest/guest→member/guest khác, đủ read/send/mode/feedback; transcript baseline riêng | Bị 403; không đọc/ghi đối tượng khác |
| S02 — role | SQL role có/thiếu quyền/assigned/former/locked; JWT thật nhận, gửi, chuyển và lịch sử riêng | Quyền server không phụ thuộc nội dung người dùng tự khai |
| S03 — target modal | Widget API/UI acceptance kiểm reward/ticket/transfer/resolve từng modal khi đổi ca | Không có mutation RPC khi selection thay đổi; không chọn ca đầu ngầm trong offline regression |
| S04 — concurrency | `stage1-final-races`: tối đa 2 kết nối độc lập, requestId khác nhau cho take/transfer/resolve | Đúng một thắng và một PT409; retry cùng ID vẫn được xác nhận |
| S05 — integrity | SQL send/transfer/resolve/CSAT/ticket/points; JWT thật ticket service; reload/replay tests | Không nhân message/ledger/ticket/feedback; payload đổi bị conflict |
| S06 — private/raw | SQL raw SELECT/RPC denial và audit; public transcript projection; ghi chú chuyển qua UI | Không xuất note/raw cho khách/thiếu quyền; raw hợp lệ có audit |
| S07 — private history/locked | JWT staff B GET/DELETE session A; SQL locked actor | Không đọc/xóa nội dung A; khóa Auth chặn quyền dù còn role |
| S08 — model data | `chat_model_privacy.test.cjs` gọi generator với request mô hình giả lập, kiểm payload thực ở boundary | Mẫu PII/credential và trường nhạy cảm thử không rời boundary; input gốc không đổi |
| S09 — injection/XSS | Facts không gọi model/SQL tùy ý khi bị chèn lệnh; renderer thật escape HTML/table | Không thực thi HTML hoặc thêm quyền/công cụ ghi |
| Hội thoại | UI gốc guest + hai Admin, GoTrue JWT, API/PostgREST và Realtime riêng | Nhận→trả lời→chuyển→người nhận trả lời→đóng→khách CSAT đạt |
| SLA/không hiểu | Local API SLA 300 giây, ba lượt `????` handoff/resume reset và xóa SLA; display suite và bằng chứng 109/125 đã lưu | Đúng nguồn server; không gọi Gemini cho các trường hợp xác định này |
| Reload/lỗi | 8 race tests, hai nhóm reload/open/send/expired/storage quota; API replay | Không chuyển nháp sang tài khoản khác; thử lại giữ ID; không tự tăng request |
| Vòng tab | 10 vòng ba tab trên UI local thật + cache/paging suite | Số channel/interval không tăng; transport UI tới localhost |

Các ô “đạt” là kết quả bộ nghiệm thu có phạm vi, không phải tuyên bố đã xét mọi input/cấu hình có thể tồn tại. Chất lượng mô hình trả lời thực tế và tập câu hỏi rộng vẫn thuộc các giai đoạn sau.

## Lệnh và kết quả

- `chat_stage1_local_ui_acceptance.cjs --local-fixtures`: **13 nhóm PASS**; không gọi AI, có JWT/HTTP/DB/WebSocket thật. Dùng module HTML/JS thật được mount cô lập, không thay toàn bộ cổng Admin/user.
- `chat_stage1_cumulative_limit.cjs --local-fixtures`: trước sửa **FAIL** vì cộng 150+60=210 vẫn được; evidence `case-cap-before.txt`.
- `chat_stage1_cumulative_limit.cjs --local-fixtures --apply-fix`: **PASS** ba nhóm cap/replay/chuyển ca và concurrent distinct IDs của nhân viên thường; `case-cap-after.txt`.
- `chat_stage1_local_concurrency.cjs --local-fixtures --evidence-dir docs/chatbot/stage1-final-races-2026-10-28`: **12 nhóm PASS**, các transaction COMMIT độc lập và max 2 kết nối.
- `chat_stage1_local_points_tickets.cjs`: **8 nhóm PASS** ở hồ sơ trước; service ticket được bổ sung qua JWT thật trong acceptance hiện tại.
- 16 Node tests ownership/replay/SLA/model privacy PASS; 8 case race Chrome PASS; 2 nhóm reload Chrome PASS.
- Admin planner/business 40 case, extended facts, handoff 9 case, unhandled signal/context, clinical/public audience và UI paging/cache đều PASS.
- `chat_inbox_states.test.cjs`, `admin_chat_inbox_ui.cjs`, `admin_chat_realtime_egress_ui.cjs`: loading/error/empty, disabled/no implicit selection, filter server, paging/search/cache và invalidation đúng ca đều PASS offline.
- Migration/rollback roundtrip: **PASS**, fingerprint hàm sau rollback khớp trước áp. Báo cáo trong `../stage1-final-races-2026-10-28/migration-roundtrip.txt`.

## Sửa môi trường test, không sửa Production để làm test đạt

- Bản phục hồi có cấu hình Auth ký bất đối xứng kế thừa, trong khi REST test dùng secret riêng HS256. Đã bỏ `GOTRUE_JWT_KEYS` chỉ ở Auth fixture để hai bên tương thích; không thay key hoặc cấu hình nguồn/Cloud. Công cụ tạo local mới cũng không kế thừa cấu hình này nữa.
- Setup Realtime ban đầu đặt replica identity FULL, xung đột publication có danh sách cột và gây SQLSTATE 42P10. Đã sửa setup giữ DEFAULT, không mở rộng publication raw/private hoặc sửa ứng dụng để né lỗi.
- Harness UI đã sửa thao tác chọn ca lưu session selection như UI thật, mở menu trước chuyển và dùng tên staff duy nhất để tránh trùng fixture từ các lần thử. Đây là lỗi harness, không phải lỗi nghiệp vụ.
- Realtime chạy tenant trong clone, proxy chỉ localhost, dùng cấu hình/slot riêng. Kiểm đã đợi kênh khỏe rồi gửi hội thoại guest mới; Admin nhận vào inbox không refresh thủ công.

## Tài nguyên

- Bản sửa widget và sanitizer không thêm DB call, poll hoặc channel. Redaction xử lý trong bộ nhớ, có trần duyệt 6.000 node/12 tầng; không gọi thêm mô hình để lọc riêng tư.
- Migration điểm thêm một aggregate theo customer và marker ca trong immutable ledger, dưới khóa ca hiện có, chỉ ở thao tác cấp điểm mới. Không scan toàn danh mục khách, không N+1 và không thêm ticker/job/index không cần thiết. Replay không chạy aggregate cộng dồn mới.
- Không tăng polling 10 giây hoặc ngân sách công cụ; tối ưu polling/limiter dùng chung vẫn là đầu việc tài nguyên đã chốt của giai đoạn sau. Chưa tuyên bố có limiter Production hoặc p95/công suất mới.
- Toàn bộ workload ghi/cạnh tranh chạy trong clone local; Cloud không được gọi, không Logs, không stress-test. Các lượt test chưa đạt cũng chỉ để lại fixture trong clone và đã dọn.

L04/L05 còn đối chiếu bằng chứng SQL109/125 đã lưu từ đợt baseline (retry không gia hạn, SLA0, useful-answer reset và tách hội thoại); không chạy lại Cloud để cập nhật ngày báo cáo. Test local cuối xác nhận 300 giây, ba lượt không hiểu và resume/reset theo nguồn hiện tại. Không cộng bằng chứng cũ thành số kiểm tra mới.

## Cleanup

`local-environment.txt` xác nhận đã xóa database test, ba container Auth/REST/Realtime và bốn tệp credential tạm sau khi kiểm marker/label/ID; database nguồn vẫn tồn tại. Clone cuối chạy 12 race + migration rollback cũng đã dọn, có receipt riêng ở `stage1-final-races-2026-10-28`.

Không dừng hoặc xóa container ngoài tác vụ, không reset workspace, không khôi phục ba tài liệu đang được người dùng xóa.

## Bàn giao và rollback

- Frontend/API: review diff `components/fab/fab.js`, `api/admin-chat.js`, file mới `scripts/api/chat_model_privacy.js`; không reset toàn repository.
- DB: migration135 chưa Cloud. Có candidate `135_chat_compensation_case_limit.rollback.sql` và roundtrip local; trước Cloud phải đối chiếu với định nghĩa/grants snapshot chính xác ngay trước phát hành. Bản rollback phục hồi logic cũ và sẽ phục hồi lỗ hổng cumulative cap; chỉ dùng rollback có chủ đích khi sự cố, không coi là giải pháp cuối.
- Ranh giới ledger: cộng dồn dựa trên marker ` | Chat UUID | Policy ` đã được RPC hiện tại ghi vào mô tả ledger bất biến. Không tự ghép giao dịch lịch sử thiếu marker. Generic điều chỉnh điểm ở phân hệ khác có quyền riêng, không nằm trong hạn mức bồi hoàn của nút chat.
- S08 là redaction các trường/mẫu được nhận diện và hạn chế context; không tuyên bố nhận biết hoàn hảo mọi địa chỉ/tên hoặc bí mật tự do không nhãn. Không có đánh giá chất lượng Gemini thật ở đợt này. Model không có công cụ ghi/SQL tùy ý, nên bảo vệ quyền/ghi không phụ thuộc việc model nghe prompt injection hay không.
- Giữ đầy đủ điều kiện phát hành giai đoạn 8: tương thích migration/API/frontend, ngân sách/tải, đối chiếu phiên bản và smoke sau deploy. Việc đóng giai đoạn 1 local không tự cấp phép push/deploy/áp Cloud.
