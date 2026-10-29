# G4.1 — Một khách, lịch gần nhất và khiếu nại mở

**Luồng cùng giai đoạn:** Đã thêm [khách/thú cưng/đơn mới nhất](../stage4-customer-commerce-2026-10-29/README.md),154/rollback đạt8 nhóm SQL/Auth/API thật và tổng242 kiểm tra offline đạt. Các mốc223/8 nhóm dưới đây là hồ sơ riêng của153.

**Tiếp theo:** Đã có [bảng hai nhóm việc cần kiểm tra](../stage4-pending-2026-10-29/README.md),7 nhóm SQL/Auth/API thật và tổng233 kiểm tra offline đạt. Các số223/8 nhóm dưới đây là mốc riêng của luồng ca khách.

Ngày29/10/2026. **Đã triển khai và kiểm chứng local**, chưa push hoặc áp Cloud. Migration mới: [153](../../../scripts/database/v1/153_admin_chat_customer_case.sql), có [rollback](../../../scripts/database/v1/153_admin_chat_customer_case.rollback.sql).

## Cách hỏi

- “Khách này có lịch sắp tới và khiếu nại nào còn mở?”
- “Khách này có lịch vừa qua và khiếu nại nào còn mở?”
- “Lịch sắp tới gần nhất và khiếu nại còn mở của khách: CUS-001”
- Hỗ trợ các mẫu trên không dấu. Khi ghi riêng “lịch gần nhất”, chatbot hỏi sắp tới hay vừa qua trước khi đọc dữ liệu. Điều kiện khác ngoài luồng này được yêu cầu làm rõ, không âm thầm bỏ bộ lọc.

Mã/họ tên/số điện thoại ghi rõ sau dấu hai chấm được ưu tiên. Nếu không ghi, dùng ngữ cảnh hội thoại đang chọn: ưu tiên UUID khách hợp lệ, sau đó mới đến gợi ý tên/điện thoại. Ngữ cảnh chỉ là gợi ý; server kiểm tra UUID, quyền và tra lại khách. Không dùng ngữ cảnh để bỏ xác thực hoặc RLS.

## Giới hạn dữ liệu và tránh trộn khách

1. Công cụ nội bộ xác định khách theo UUID/mã chính xác, họ tên đầy đủ đã chuẩn hóa dấu hoặc số điện thoại chính xác. Cho phép bỏ dấu cách/chấm/gạch trong số điện thoại, không tự quy đổi đầu số quốc gia. Tối đa2 ứng viên; kết quả này là dấu hiệu có nhiều khách, không phải tổng tất cả khách trùng tên. Không có hoặc có nhiều khách thì dừng sau1 nguồn, không đọc lịch/phiếu.
2. Khi đã có đúng một UUID, hai nguồn còn lại chỉ nhận UUID đó, không tìm lại bằng tên hoặc số điện thoại. Client kiểm tra UUID trong phạm vi phản hồi trước khi ghép kết quả.
3. Lịch sắp tới: lịch bắt đầu từ thời điểm đọc, loại cancelled/no_show/completed, lấy thời gian sớm nhất. Lịch vừa qua: lịch bắt đầu trước thời điểm đọc, loại cancelled/no_show, lấy thời gian muộn nhất. Chỉ1 lịch; các hạng mục chưa hủy được gom để hiển thị, không biến nhiều hạng mục thành nhiều lịch.
4. Khiếu nại: chỉ phiếu có `customer_id` trực tiếp trùng khách; loại completed/resolved/closed/rejected/cancelled và các mã kết thúc tiếng Việt cũ đã liệt kê trong SQL. Trả tổng chính xác trong phạm vi này và tối đa10 phiếu mới nhất. Không tải trang sau tự động hoặc suy tổng từ mẫu10 dòng. Chưa suy liên kết khách từ order_id/appointment_id nếu phiếu không có customer_id.
5. Có liên kết mở phân hệ Khách hàng theo danh sách đích được giao diện chấp nhận; chưa tự mở sẵn hồ sơ đúng UUID hoặc cung cấp trang2 trong chat cho luồng kết hợp này.

## Quyền và kết quả từng phần

- Bước xác định khách cần customer.read, customer_profile.read và customer_phone.read.
- Lịch cần customer.read, appointment.read và appointment_item.read. Phiếu cần customer.read và support_ticket.read. Kiểm tra riêng ở JavaScript và SQL; nguồn thiếu quyền không được gọi. Nếu cả hai nguồn quan hệ đều thiếu quyền thì dừng trước khi tra khách.
- Nguồn lỗi/khác UUID/nhân đôi mã phiếu hoặc sai hình dạng bị loại khỏi kết quả. Vẫn giữ phần đã đọc hợp lệ, ghi nhãn thiếu quyền/không đọc được; không giả0 và không suy nguyên nhân nghiệp vụ. Bước xác định khách lỗi hoặc hỏng dữ liệu thì không ghép quan hệ.
- Các nguồn được đọc riêng, không bảo đảm ảnh chụp dữ liệu đồng thời. Mỗi phần có thời điểm đọc.
- Giao diện gắn requestId với phiên/câu hỏi/hội thoại/ngữ cảnh; đổi khách rồi gửi lại cùng câu tạo requestId mới. API replay giữ hành vi cũ: trả nội dung đã lưu đúng staff/phiên/câu hỏi, không tra lại khách hay quan hệ. Không coi replay là dữ liệu mới.

## Ngân sách

Tối đa3 RPC nguồn: xác định khách1 lượt, rồi tối đa2 nguồn quan hệ đồng thời. Nếu thiếu quyền xem phiếu thì chỉ2 nguồn. Không thêm lịch sử hoặc transcript khi chỉ hỏi ca khách này; không gọi model. Giữ lease/2 lượt Admin, pool4, thời hạn đọc8 giây, SQL5 giây/khóa1 giây và32 KiB/nguồn,64 KiB/câu.3 nguồn không phải tổng toàn bộ statement SQL/Auth/lưu của request.

SQL153 thêm4 chỉ mục cho tên chuẩn hóa, điện thoại, lịch theo khách/thời gian và phiếu theo khách/thời gian. Trả ít dữ liệu không có nghĩa truy vấn đếm không tốn tài nguyên: tổng phiếu vẫn đọc các phiếu trong phạm vi khách. Chưa benchmark tải/chi phí xây chỉ mục trên Production; migration có timeout và chưa áp Cloud. Không thêm polling, listener, cache hoặc dịch vụ.

## Bằng chứng

- [Kết quả SQL/Auth/JWT/REST/API thật](local-results.txt):8 nhóm đạt. Dữ liệu gồm hai khách trùng tên/điện thoại, lịch khách khác sớm hơn, lịch đã hủy, nhiều hạng mục có mục hủy và12 phiếu mở. Oracle chọn đúng lịch, đếm12/trả10, không lẫn khách hoặc nhân đôi lịch. Kiểm tra thiếu quyền, mượn lease, bộ lọc lạ, byte, lưu/replay/nguồn từng phần, rollback và áp lại.
- [Script tái lập local](../../../scripts/test/chat_stage4_customer_case_local.cjs), chỉ chạy với `--local-fixtures`, kiểm tra loopback và dấu sở hữu trước mọi thao tác dữ liệu. Lỗi fixture ban đầu về điện thoại chính và phản hồi RPC204 đã sửa trước lần nghiệm thu đạt.
- [9 nhóm offline cho ca khách](../../../scripts/test/chat_stage4_customer_case.test.cjs) đạt; hồi quy đầy đủ **223 kiểm tra offline và40 ca nghiệp vụ đạt**. [Kết quả offline](offline-results.txt), [tóm tắt/fingerprint](verification.txt).
- Chrome với API giả lập kiểm tra gửi UUID đúng, đổi khách tạo requestId mới, hiển thị liên kết Khách hàng và chặn URL ngoài danh sách. Không phải E2E giao diện với API Cloud.
- [Biên nhận dọn môi trường](local-environment.txt): database clone/hai container/tệp kết nối riêng đã dọn, database nguồn giữ nguyên. Không gửi model hoặc truy vấn Cloud.

## Phần còn lại

G4.1 mới có một luồng khách/lịch/khiếu nại; thú cưng/đơn và quan hệ khác chưa được phối hợp. G4.4 có kết quả từng phần cho luồng này và so sánh thực thu, chưa áp dụng chung cho mọi câu hỏi. G4.3 chưa triển khai. Gate2 và phần nghiệm thu G3.4 còn mở; migrations135–153 chưa áp Cloud.
