# G3.4 — Lọc lịch theo KTV

**FAQ hoàn tất local:** Migration150 sửa đặt lịch và151 thêm3 FAQ nhóm C riêng cho Admin;7 nhóm SQL/Auth/JWT/REST tích hợp đạt,82 kiểm tra offline và40 ca nghiệp vụ hồi quy đạt. Không còn thiếu nguồn FAQ nhóm C trong bản local; chưa triển khai Cloud hoặc đánh giá Gemini với FAQ mới. [Kết quả](../stage3-faq-internal-2026-10-29/README.md).

**Bổ sung 29/10:** Giữ kết quả nghiệp vụ khi FAQ hướng dẫn thiếu hoặc AI không sẵn sàng/trả bản nháp rỗng, kèm giới hạn và liên kết phân hệ. 81 kiểm tra offline và 40 ca nghiệp vụ đạt; liên kết giao diện đã đạt ở đợt trước. Không đọc lại nguồn hoặc gọi lại model; lỗi quyền/nguồn/lưu vẫn báo lỗi. [Chi tiết](partial-guidance-2026-10-29.md).

**Cập nhật 29/10/2026:** Đã đối chiếu mã nguồn đặt lịch guest/member, soạn FAQ đề xuất, bổ sung chỉ dẫn model nêu rõ thông tin còn thiếu và chặn FAQ rỗng. 56 kiểm tra chatbot, 16 kiểm tra guest offline và 40 ca nghiệp vụ hồi quy đạt. Không tăng lượt đọc database hoặc gọi thêm Gemini. FAQ Cloud chưa cập nhật, G3.4 còn mở và đánh giá model thật vẫn PARTIAL. [Chi tiết](faq-audience-review-2026-10-29.md).

Migration149 đã đạt kiểm chứng local, có rollback. Chưa push hoặc áp Cloud; Gate 2 vẫn mở.

## Cách hỏi và định nghĩa

- `Lịch Spa chiều mai theo KTV: Nguyễn An`
- `Lịch hẹn hôm nay theo KTV: mã nhân viên`
- `Lịch taxi tuần này của KTV Nguyễn An`
- `Lịch Spa chiều 29/10/2026 theo KTV: mã nhân viên trang 2`

Ghi ngày/kỳ trước tên KTV để không nhầm tên Mai/Sáng/Chiều thành điều kiện thời gian. Tên được khớp đầy đủ, không phân biệt hoa/dấu; hoặc dùng ID nhân viên. ID có ưu tiên định danh, không bị coi thành tên của người khác. Không tự tìm gần đúng hoặc lấy người đầu tiên.

Một lịch khớp khi KTV phụ trách ca **hoặc** được phân công ở một hạng mục chưa hủy. Khi hỏi nhóm Spa/Hotel/Taxi, hạng mục phải thuộc nhóm đó; dịch vụ bổ sung được giải ngược về dịch vụ cha. Phụ trách toàn ca vẫn được tính nếu ca có nhóm dịch vụ đã hỏi. Hạng mục hủy và hạng mục ở nhóm khác không làm lịch khớp. Dùng EXISTS thay vì join mở rộng nên một ca chỉ đếm một lần dù cùng KTV có nhiều hạng mục.

Không có nhân viên khớp: nói chưa tìm thấy KTV và chưa tra cứu lịch. Trùng tên: yêu cầu lấy mã qua tra cứu nhân viên, mở đúng phân hệ Nhân sự. Không trả “0 lịch” khi chưa xác định được người. Đã xác định người nhưng không có lịch mới trả đúng 0 lịch và tên KTV. Bản nháp cũng không được sinh khi chưa xác định được người.

Không cho kết hợp tên KTV cụ thể với “chưa phân công”. Trang tiếp/ngày tiếp giữ cùng định danh trong ngữ cảnh hợp lệ. Không tự mở rộng kỳ quá31 ngày.

## Quyền và tài nguyên

- Bộ quyền lịch cũ giữ nguyên khi không lọc KTV. Có `staff_query` thì bắt buộc thêm `staff.read`; khi lọc nhóm dịch vụ cần thêm `service_addon.read` để trả kết quả đầy đủ cả addon. Kiểm tra ở cả JavaScript và SQL, chạy bằng caller/RLS.
- Giải tên/ID và lấy lịch nằm trong **một RPC nguồn**, cùng lease/pool4/timeout5s/lock1s. Không thêm RPC danh sách nhân viên trước mỗi câu hỏi, cache chứa dữ liệu cá nhân, listener hoặc polling.
- Giữ 10 lịch/trang, 32 KiB/nguồn, 64 KiB/câu, tối đa3 nguồn/câu và2 đồng thời. Hỏi “trang2” dùng một nguồn lịch sử riêng tư cộng một nguồn facts, vẫn trong ngân sách.
- Đếm chính xác vẫn có chi phí database; không coi giới hạn truyền dữ liệu là bảo đảm mọi scan đều rẻ. Khi bận/timeout/vượt byte giữ lỗi thật, không trả số0 giả.

## Bằng chứng

- 47 test offline: bộ hồi quy trước cộng `chat_stage3_staff.test.cjs`, đạt.
- `admin_copilot_business.cjs`: 40 ca định tuyến/nghiệp vụ và các kiểm tra hợp đồng API đạt.
- Hai kiểm tra Chrome thật với transport offline (`chat_stage3_parts_ui.cjs`, `chat_read_contract_ui.cjs`) đạt.
- `node scripts/test/chat_stage3_staff_local.cjs --local-fixtures`: 7 nhóm Auth/JWT/PostgREST/API/SQL thật local đạt; xem [kết quả](local-results.txt).
- Oracle18 ca: lọc Spa/KTV A trả16 ca thành10+6 dòng; lọc mọi nhóm trả17; hạng mục hủy không khớp; Hotel của A trong ca có Spa của B không làm ca khớp Spa/A; addon Spa của A được tính; KTV vừa phụ trách vừa làm nhiều hạng mục không nhân tổng. Có kiểm tra tên không dấu, mã, trùng tên, quyền có điều kiện, nguồn bận, timeout thật, API trang tiếp và rollback/reapply.

## Model thật — đã chạy hai mẫu

Sau đồng ý của người dùng, đã chạy đúng2 lượt Gemini theo payload/hash được duyệt. Không gửi hồ sơ khách hàng hoặc truy vấn database Cloud. [Kết quả đối chiếu](model-verification.md), [phản hồi gốc](model-results.txt).

Mẫu đặt lịch bám nguồn; mẫu Hotel không bịa giá nhưng còn chung chung, chưa nêu rõ FAQ thiếu giá. Không có FAQ phù hợp nhóm C nên không gọi model cho nhóm đó. Kết luận PARTIAL, không tính toàn bộ chất lượng model đã đạt.

Đã sửa nhầm lẫn câu hỏi “Đặt lịch…như thế nào?” thành lệnh ghi; 49 test offline và hồi quy nghiệp vụ đạt. Không gọi thêm model sau sửa. Còn đối chiếu đúng/sai của FAQ với luồng guest, dữ liệu nhóm C và bộ đánh giá mở rộng; G3.4 chưa đóng toàn bộ.
