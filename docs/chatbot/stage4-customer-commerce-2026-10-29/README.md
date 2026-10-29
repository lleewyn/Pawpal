# G4.1 — Một khách, hồ sơ thú cưng và đơn mới nhất

Ngày29/10/2026. **Đã triển khai và kiểm chứng local**, chưa push hoặc áp Cloud. [Migration154](../../../scripts/database/v1/154_admin_chat_customer_pets_orders.sql) mở rộng gateway153 bằng hai công cụ đọc cố định, có [rollback](../../../scripts/database/v1/154_admin_chat_customer_pets_orders.rollback.sql).

## Cách hỏi và định nghĩa

- “Khách này có thú cưng và đơn hàng mới nhất?”
- “Khách này có những bé cưng nào và đơn gần nhất?”
- “Thú cưng và đơn hàng mới nhất của khách: CUS-001”

Hỗ trợ không dấu và dấu câu cuối câu. Mã/tên/điện thoại ghi rõ sau dấu hai chấm được ưu tiên hơn ngữ cảnh. Nếu không ghi, ưu tiên UUID khách hợp lệ từ hội thoại đang chọn rồi xác minh lại trên server. Khách trùng tên hoặc điện thoại thì hỏi mã chính xác, không ghép quan hệ từ nhiều khách.

**Thú cưng:** trả tổng hồ sơ gắn trực tiếp UUID khách, gồm các trạng thái, tối đa10 hồ sơ mới nhất. Không diễn đạt tổng này thành số bé đang hoạt động hoặc đang nuôi. Chỉ lấy mã, tên, trạng thái, giống/loài và thời điểm tạo; không đọc hoặc gửi tiền sử dị ứng/ghi chú sức khỏe trong luồng này.

**Đơn mới nhất:** một đơn theo created_at giảm dần, nếu trùng thời điểm thì dùng UUID giảm dần để chọn ổn định. Gồm cả bản nháp hoặc đã hủy nếu đó là bản ghi được tạo mới nhất; không dùng updated_at và không chọn đơn mới nhất toàn hệ thống. Chỉ trả mã, trạng thái và thời điểm tạo, không đọc dòng hàng, số tiền, thanh toán, hoàn tiền hoặc địa chỉ. Tổng0/1 của nguồn là số dòng được chọn, không phải tổng lịch sử đơn của khách.

Không khẳng định đơn đã thanh toán/giao/hoàn tiền từ trạng thái đơn. Các điều kiện thêm như “đã thanh toán”, khoảng ngày hoặc ghép thêm lịch vào cùng câu sẽ yêu cầu làm rõ; không bỏ điều kiện rồi trả dữ liệu khác phạm vi. Đây là hai nguồn cùng thuộc khách, không phải kết luận một đơn liên quan đến bé cụ thể nào.

## Quyền và tính đúng đối tượng

- Tái sử dụng bước xác định khách của153: customer.read, customer_profile.read, customer_phone.read.
- Thú cưng cần customer.read, pet_profile.read, pet_breed.read, pet_species.read. Đơn cần customer.read, sales_order.read; không yêu cầu quyền chi tiết đơn vì không đọc bảng đó.
- Sau khi có đúng một khách, hai nguồn chỉ nhận UUID đã xác minh. Cả scope và customer_id của từng dòng đều phải trùng UUID đó. Nguồn sai khách, mã trùng hoặc dữ liệu hỏng bị loại khỏi phần trả lời.
- Nguồn thiếu quyền không được gọi; trả phần được phép đọc với nhãn rõ. Không có hoặc có nhiều khách dừng sau1 nguồn. Nếu cả hai quan hệ đều thiếu quyền thì dừng trước khi tra khách.
- Các nguồn được đọc riêng và có thể thay đổi giữa các lần đọc, không bảo đảm một ảnh chụp dữ liệu đồng thời. Replay trả nội dung đã lưu theo cơ chế cũ, không đọc lại nguồn và không được coi là dữ liệu mới.

## Ngân sách

Giữ tối đa3 RPC nguồn: xác định khách1, rồi tối đa2 nguồn quan hệ đồng thời. Thiếu quyền thú cưng thì chỉ2 nguồn. Không tải thêm trang, transcript hoặc lịch sử cho câu hỏi trực tiếp này; không gọi model. Vẫn dùng lease/pool hiện có,32 KiB/nguồn,64 KiB/câu, ngân sách đọc8 giây và SQL5 giây/khóa1 giây.

154 thêm hai chỉ mục theo customer_id/thời điểm tạo cho pet_profile và sales_order; không có bảng hoặc job mới. Không nối thú cưng với đơn/dòng hàng để tránh nhân số bản ghi. Trả tổng hồ sơ vẫn có chi phí đếm trong phạm vi khách; chỉ mục và giới hạn dữ liệu truyền không phải chứng nhận chịu tải Production. Chưa đo chi phí xây chỉ mục trên Cloud.

Có liên kết mở phân hệ Khách hàng, chưa tự mở sẵn hồ sơ theo UUID hoặc phân trang kết hợp. Muốn xem thêm hồ sơ thú cưng thì mở phân hệ để tra tiếp.

## Bằng chứng

[8 nhóm SQL/Auth/JWT/REST/API thật](local-results.txt), chạy qua [script opt-in trên clone sở hữu](../../../scripts/test/chat_stage4_customer_commerce_local.cjs):

1. Có12 hồ sơ của kháchA, trả10 mã phân biệt và có trạng thái inactive; không lẫn kháchB cùng tên bé, không có trường sức khỏe.
2. Đơn mới nhất đúng khách/theo ngày tạo/UUID khi trùng ngày. Đơn kháchB mới hơn và đơn cũ được cập nhật lại không làm sai lựa chọn; nhiều dòng hàng không nhân đôi kết quả.
3. Quyền thú cưng/đơn độc lập; không mượn lease, thêm bộ lọc tùy ý hoặc vượt byte.
4. API xác thực thật, nhận ngữ cảnh UUID khi hai khách trùng tên, đọc đúng3 nguồn và lưu phản hồi đúng khách.
5. Tên trùng được ghi rõ trong câu ưu tiên hơn ngữ cảnh, dừng trước hai quan hệ.
6. Nhân viên thiếu quyền thú cưng nhận đơn mới nhất và nhãn thiếu quyền, chỉ2 nguồn.
7. Replay không đọc lại khách hoặc quan hệ.
8. Rollback154 khôi phục gateway153, giữ chỉ mục của153; áp lại154 phục hồi hai công cụ mới.

[9 nhóm offline mới](../../../scripts/test/chat_stage4_customer_commerce.test.cjs) đạt. Hồi quy đầy đủ **242 kiểm tra offline,40 ca nghiệp vụ và Chrome đạt**: [kết quả](offline-results.txt), [tóm tắt/fingerprint](verification.txt). Chrome dùng API giả lập; không thay bằng chứng SQL/API thật ở trên.

[Biên nhận dọn](local-environment.txt): clone database, hai container và tệp kết nối riêng đã dọn; database nguồn giữ nguyên. Không truy vấn Cloud, không gọi Gemini.

## Tình trạng triển khai

154 cần gateway153 trước đó; khi hoàn nguyên thực hiện154 trước153. Rollback không xóa hồ sơ khách, thú cưng hoặc đơn, chỉ phục hồi hàm trước và bỏ hai chỉ mục mới. Chưa áp migrations135–154 lên Cloud hoặc push.

G4.1 hiện có hai luồng cố định: khách/lịch/khiếu nại và khách/thú cưng/đơn mới nhất. Chưa ghép toàn bộ nhóm trong một câu hoặc suy quan hệ qua hạng mục/chi tiết đơn. G4.2/G4.3/G4.4 giữ phạm vi đã ghi, Gate2/G3.4 và nghiệm thu triển khai còn mở.
