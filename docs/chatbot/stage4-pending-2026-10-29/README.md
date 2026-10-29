# G4.3 — Hai nhóm việc cần kiểm tra

Ngày29/10/2026. **Đã triển khai và kiểm chứng local**, chưa push hoặc áp Cloud. Không thêm migration, bảng, RPC hoặc dịch vụ mới.

## Cách hỏi và phạm vi

- “Việc cần kiểm tra hôm nay”
- “Tổng hợp việc cần xử lý ngày mai”
- “Đơn hủy chưa hoàn đủ và lịch chờ phục vụ chưa có KTV hôm nay”

Có hỗ trợ không dấu, ngày cụ thể, tuần/tháng và khoảng tối đa31 ngày. Câu thiếu ngày, thêm chi nhánh, SLA/quá hạn hoặc nhóm việc khác sẽ hỏi làm rõ, không âm thầm bỏ điều kiện.

Bảng chỉ gồm **hai nhóm**, không phải toàn bộ công việc Admin và không phải thứ tự ưu tiên tự động:

| Nhóm | Điều kiện được xác nhận từ nguồn |
|---|---|
| Đơn cần đối soát | Đơn cancelled có tổng thu succeeded lớn hơn tổng hoàn succeeded. Lấy toàn bộ tồn đọng, kể cả đơn tạo trước kỳ hỏi. |
| Lịch cần kiểm tra phân công | Lịch confirmed bắt đầu trong kỳ hỏi; cả nhân viên phụ trách ca và mọi hạng mục chưa hủy đều chưa được phân công. |

Khoảng ngày chỉ lọc lịch. Không lọc đơn theo ngày tạo vì như vậy có thể bỏ sót tồn đọng cũ. Chênh lệch tiền không phải số hoàn đã được phê duyệt; chưa phân công không chứng minh quá hạn hoặc không còn KTV trống. Không tự tạo hoàn tiền, phân ca hoặc sửa dữ liệu.

Không cộng số đơn và số lịch thành một tổng chung. Mỗi nhóm trả tổng của nguồn và tối đa10 dòng trang đầu. Không tự đọc trang sau; để xem tiếp hỏi riêng từng nhóm với cùng điều kiện. Đã ẩn lời mời “trang2” chung của formatter để tránh tạo kỳ vọng có phân trang kết hợp. Có liên kết mở phân hệ tương ứng với nguồn đầu tiên đọc thành công, chưa tự áp bộ lọc ngày khi mở màn hình.

## Quyền, lỗi và ngân sách

Dùng lại hai công cụ `order.refund_pending` và `appointment.search`, kiểm tra quyền từng công cụ trước khi đọc. Thiếu quyền một nhóm thì bỏ RPC đó và giữ kết quả nhóm được phép xem; cả hai thiếu quyền thì báo lỗi trước nguồn. Nguồn lỗi/sai phạm vi/sai trạng thái/dữ liệu hỏng không được coi là0. Nếu không còn nhóm nào có dữ liệu xác nhận thì báo lỗi; không lưu một bảng hoàn tất giả.

Kiểm tra phạm vi xác nhận đúng status/unassigned/khoảng thời gian; chấp nhận đúng metadata múi giờ mà gateway149 trả về, không cho metadata này che bộ lọc khác. Kiểm tra mã trùng, thời điểm và số tiền trước khi hiển thị.

Tối đa2 nguồn đồng thời; có1 nguồn lịch sử trước đó thì tổng vẫn3. Giữ lease, pool4,32 KiB/nguồn,64 KiB/câu, thời hạn đọc8 giây và các timeout SQL đang có. Auth/lưu lịch sử nằm ngoài số RPC nguồn như trước, không coi2 nguồn là tổng mọi statement của request. Không dùng model, polling, listener hoặc tự làm mới bảng khi mở panel.

Truy vấn đếm toàn bộ tồn đọng có thể đọc nhiều bản ghi; giới hạn dữ liệu truyền không bảo đảm chi phí quét thấp ở mọi tải. Đợt này tái sử dụng SQL đã có, chưa benchmark tải Production hoặc thay đổi Gate2.

## Bằng chứng

- [10 nhóm offline mới](../../../scripts/test/chat_stage4_pending.test.cjs) đạt: định tuyến/phạm vi, quyền, lỗi từng phần, hai nguồn cùng lỗi, đầu vào sai, phạm vi ẩn/múi giờ sai, số0 hợp lệ, trang đầu và ngân sách có lịch sử.
- [Kết quả SQL/Auth/JWT/REST/API](local-results.txt): **7 nhóm đạt**, chạy bằng [script opt-in trên clone sở hữu](../../../scripts/test/chat_stage4_pending_local.cjs).
- Oracle tài chính: một khoản thu100, hai hoàn succeeded20 và30, một hoàn pending10 cho kết quả thu100/hoàn50/chênh50, không nhân đôi tiền thu. Loại đơn hoàn đủ, đơn completed và đơn chưa thu. Tổng tồn đọng toàn phạm vi khớp truy vấn tổng hợp độc lập; đơn tạo năm2020 vẫn được kiểm tra khi kỳ lịch là2031.
- Oracle lịch: trong5 lịch fixture, chỉ lịch confirmed chưa phân công cả ca/hạng mục được đưa vào; lịch có người ở ca/hạng mục, pending/cancelled bị loại. Nhiều hạng mục không tăng số lịch, hạng mục hủy không làm sai điều kiện chưa phân công. Tổng toàn phạm vi cũng đối chiếu oracle độc lập.
- API xác thực/lưu thật dùng2 nguồn; nhân viên chỉ có quyền lịch dùng1 nguồn và nhận nhãn thiếu tài chính. Replay đọc0 nguồn nghiệp vụ. Câu yêu cầu chính sách quá hạn chưa có dữ liệu sẽ làm rõ trước nguồn.
- Kiểm thử tích hợp ban đầu phát hiện validator chưa cho phép metadata `time_zone` do SQL149 trả về; đã sửa validator và fixture trước lần nghiệm thu đạt. Oracle tổng lịch được tính trên toàn phạm vi clone, không giả định chỉ tồn tại một lượt fixture.
- [Hồi quy đầy đủ](offline-results.txt), [tóm tắt/fingerprints](verification.txt): **233 kiểm tra offline,40 ca nghiệp vụ và kiểm tra Chrome đạt**. Chrome dùng API giả lập để kiểm tra ngữ cảnh/liên kết, không thay thế bằng chứng API/SQL thật ở trên.
- [Biên nhận dọn](local-environment.txt): clone database/hai container/tệp kết nối riêng đã dọn, database nguồn giữ nguyên. Không gọi Gemini hoặc truy vấn Cloud.

G4.3 mới có hai nhóm theo trạng thái, số tiền và phân công; SLA/quá hạn, ngoại lệ/chính sách khác chưa triển khai. G4.4 áp dụng cho luồng này bên cạnh so sánh thực thu và ca khách, chưa bao phủ mọi câu hỏi liên phân hệ. Gate2/G3.4 còn mở; migrations135–153 và mã giai đoạn4 vẫn chưa áp Cloud.
