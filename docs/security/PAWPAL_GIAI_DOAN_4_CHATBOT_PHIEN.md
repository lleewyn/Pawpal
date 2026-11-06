# Giai đoạn 4 — Chatbot, phiên và Realtime

Bắt đầu 05/11/2026; **hoàn thành ngày 06/11/2026 trên môi trường thử nghiệm**, chưa triển khai Cloud. Đã nối và kiểm thử cả API, giao diện trợ lý Nhân viên, phiên và Realtime.

Cập nhật chốt: hoàn thành tới migration 184. Lượt tích hợp **45 nhóm Realtime/Auth/UI**, **17 nhóm HTTP trả lời** và **11 nhóm phiên** đều PASS trên mã hiện tại, mã băm nguồn khớp; 357 bài Node và hai bộ Copilot offline đạt. Đã đóng các mục nhật ký/thông báo/tìm kiếm/JSON/CSV/số đếm, giữ kênh cũ sau hạ quyền, ngắt/kết nối lại và đổi phân công. Commit `db27efdb` là mốc mã đến 180; mã và bằng chứng 181–184 thuộc đợt push giai đoạn 4 theo yêu cầu ngày 06/11/2026. Push không áp dụng migration lên Cloud. Các mục rà soát ban đầu bên dưới là lịch sử từng bước, không thay cho kết quả chốt ở đầu và cuối tài liệu.

## Kết quả rà soát đường AI hiện tại

- `api/admin-chat.js` xác minh `admin_copilot_history.read`, sau đó kiểm tra quyền ghi lịch sử. STAFF hiện có `work.copilot.use`, không có các quyền quản trị cũ này; yêu cầu hiện tiếp tục bị chặn. Giao diện STAFF cũng chưa đăng ký tab AI.
- `scripts/api/chat_read_tools.js` là registry đóng nhưng còn dựa vào các mã quyền đọc bảng cũ. Công cụ thu tiền theo đơn và doanh thu tổng hợp đều liên quan `payment.read`/`refund_transaction.read`; không được mở các mã đó cho STAFF để vượt qua registry.
- Các đường gateway đọc, đọc từng phần và RPC nền phải có nhánh STAFF giới hạn dòng/cột/người phụ trách như giao diện. Danh tính phải lấy từ phiên/CSDL; không lấy `staff_query`, mã người dùng hoặc vai trò trong câu hỏi làm quyền truy cập.
- Đường replay trong API hiện tìm nội dung bằng service client sau xác minh đầu request. Trước khi mở STAFF phải xử lý lịch sử được tạo khi người đó còn là ADMIN, đồng thời kiểm tra lại quyền trước replay, lưu và trả kết quả AI. Không thể coi prompt hoặc registry là hàng rào duy nhất.
- Benchmark và các công cụ doanh thu, nhân sự toàn hệ thống, đánh giá, nội dung và cấu hình giữ cho ADMIN theo thiết kế giai đoạn 1. Người dùng đã chốt đánh giá khách do Quản lý xử lý.

Tại bước rà soát ban đầu chưa sửa gateway hoặc cấp thêm quyền để mở AI. Phần gateway đọc nền tảng đã bổ sung bên dưới, API trợ lý cho STAFF vẫn chưa được mở. Rà soát nguồn và truy vấn kiểm tra chỉ dùng mã nguồn/CSDL cục bộ; không truy vấn Logs Supabase Cloud.

## Đã sửa phần phiên và bộ nhớ giao diện

Thay đổi nằm trong `pages/admin/admin-access.js`, phần hủy bộ nhớ DOM ở `admin.js` và phiên bản tải trong `index.html`; không thêm file JS giao diện hoặc modal.

1. Sau khi đọc `get_staff_login_context`, kiểm tra lại danh tính phiên. Phản hồi từ lượt xác minh cũ không được cấp lại trạng thái sau khi phiên đã bị vô hiệu hóa.
2. So sánh cả vai trò, mã hồ sơ và Auth ID với lần xác minh gần nhất. Đổi người cùng vai trò vẫn xóa trạng thái cũ và tải lại toàn bộ trang. Giữ mốc danh tính/vai trò gần nhất qua lỗi mạng để không bỏ sót hạ quyền sau khi kết nối phục hồi.
3. Khi mất xác minh, xóa quyền hiển thị, đóng/dọn các form đã nối, xóa cache dữ liệu và ngữ cảnh Copilot/tab cũ, gỡ các kênh Supabase đã đăng ký. Xóa đường dẫn hồ sơ/subtab trên header, ẩn menu tác vụ cũ và vô hiệu hóa nút làm mới cũ; người dùng dùng Thử lại hoặc Đăng nhập lại. Phát sự kiện hủy phiên để bộ tải phân hệ bỏ DOM cũ và bỏ kết quả tải đang chờ. Không xóa token Auth chỉ để thay vai trò; lần tải lại vẫn xác minh từ máy chủ.
4. Xác minh lại khi cửa sổ có tiêu điểm hoặc tab hiện lại; định kỳ 60 giây khi tab đang hiện và có tiêu điểm. Auth đổi danh tính hoặc đăng xuất qua storage ở tab khác làm xóa dữ liệu và tải lại. Nếu chỉ làm mới token của cùng danh tính, dữ liệu storage chỉ là tín hiệu để xác minh lại với máy chủ, không phải nguồn cấp quyền; giữ nháp khi quyền không đổi. Trang phục hồi từ bộ nhớ trình duyệt cũng tải lại để xác minh. Đây là cập nhật giao diện; các request API/RPC vẫn phải kiểm tra quyền hiện tại ngay tại máy chủ.
5. Nếu người dùng và vai trò không đổi, lần xác minh bình thường giữ nháp, ngữ cảnh làm việc và cache hiện tại. Không tải lại chỉ vì nhận một sự kiện focus.

## Bằng chứng kiểm tra phiên

[Báo cáo phiên](phase4/session/ui-results.txt): 11 nhóm PASS trên CSDL/GoTrue/PostgREST/trình duyệt thật, bao gồm thiết lập tài khoản Auth và mười tình huống:

- Xác minh bình thường không xóa nháp hoặc tạo lại ngữ cảnh JS.
- Token của cùng tài khoản được làm mới từ tab khác vẫn giữ nháp sau khi xác minh lại quyền.
- Đổi tài khoản STAFF sang STAFF trong cùng tab.
- Đăng nhập một STAFF khác từ tab thứ hai.
- Đăng xuất từ tab thứ hai.
- ADMIN bị đổi sang STAFF rồi quay lại cửa sổ.
- Nhân viên mất trạng thái hoạt động, bộ kiểm tra định kỳ phát hiện, form bị dọn và request CSDL tiếp theo bị từ chối.
- RPC xác minh không khả dụng: bỏ quyền hiển thị, dữ liệu và kênh cũ.
- Hạ quyền sau một lần lỗi mạng vẫn làm tải lại ngữ cảnh quản trị cũ.
- Phản hồi xác minh danh tính cũ đến sau đăng nhập liên tab không thể phục hồi dữ liệu/quyền cũ.

Kiểm tra định kỳ gọi đúng callback đã được đăng ký sau khi kiểm soát thời gian trong trình duyệt kiểm thử; không giả lập kết quả xác thực hoặc dữ liệu nghiệp vụ. Kiểm tra kênh chỉ xác nhận gỡ các kênh đã đăng ký, **chưa kiểm thử payload Realtime đầu cuối hoặc RLS của luồng Realtime**.

Chạy lại bằng PowerShell: `$env:PAWPAL_PHASE4_SESSIONS='1'; node scripts/test/admin_access_phase3_ui.cjs`. Dùng chung bộ dựng môi trường và phiên Auth đã có, các tình huống riêng nằm tại `scripts/test/admin_access_phase4_cases.cjs`.

## Hồi quy sau bản sửa cuối

[Báo cáo hồi quy](phase4/regression-results.txt): 300 nhóm tích hợp với Auth thật PASS, chạy lại sau khi bổ sung dọn đường dẫn hồ sơ/menu cũ. Đây là bản sao báo cáo từ bộ đầy đủ ở `phase3/auth-integration/ui-results.txt`, không phải một lượt kiểm tra bổ sung để cộng số lượng. Mười nhóm [đổi mật khẩu Auth thật](phase3/password-ui-results.txt) và 6 bài API phân quyền cũng PASS. Mã băm nguồn của các báo cáo khớp file hiện tại; không còn CSDL/container hoặc tệp cấu hình bí mật tạm của các lượt kiểm thử.

Đã xem [ảnh phiên bị thu hồi](phase4/session/revoked-session.png): form và dữ liệu cũ được đóng/dọn, không còn tên đối tượng trên đường dẫn hồ sơ hoặc menu chức năng; người dùng chỉ còn Thử lại/Đăng nhập lại để xác minh lại. Không tạo hoặc thay bố cục modal trong bước này.

## Còn phải thực hiện

- Nối 28 nguồn hiện có (20 nền tảng, 5 quan hệ khách, 3 giá/phòng trống) với API sau khi tích hợp lịch sử/replay an toàn và kiểm tra quyền khi hoàn thành. Không mở STAFF bằng quyền bảng quản trị.
- Tích hợp nền tảng lịch sử STAFF của migration 178 vào API: replay, đọc từng phần, bản tóm tắt và ngữ cảnh mô hình phải giữ nguồn và kiểm tra quyền hiện tại; không trả lại nội dung quản trị cũ sau hạ quyền.
- Nối giao diện trợ lý cho STAFF khi đường đọc đã an toàn; kiểm tra quyền lúc gọi công cụ, lúc hoàn thành và lúc trả kết quả.
- Kiểm thử dữ liệu Realtime đầu cuối, khóa tài khoản, đổi vai trò và nhiều tab theo PQ-19–PQ-25 liên quan; kiểm tra nhật ký và các bề mặt thông báo/tìm kiếm/xuất dữ liệu.

Chưa đánh dấu giai đoạn 4 hoàn tất; các mục tổng hợp trong checklist vẫn để mở.

## Gateway đọc nền tảng — migration 177

Đã thêm `public.read_staff_copilot(p_tool, p_filters, p_max_bytes)` và migration khôi phục riêng. Hàm chỉ nhận danh sách công cụ cố định; tự lấy nhân viên qua `work_actor`, yêu cầu đúng vai trò STAFF và quyền `work.copilot.use` cùng quyền công việc tương ứng. Không nhận actor/role/cột/SQL từ payload. Không thay các gateway ADMIN, quyền vai trò hoặc ACL bảng/view.

Hai mươi công cụ hiện hỗ trợ:

- Khách, thú cưng, đơn và điểm: `customer.lookup`, `pet.lookup`, `order.lookup`, `points.lookup`.
- Tiền và danh mục: `payment.order`, `catalog.product`, `inventory.low_stock`, `catalog.service`, `offer.list`.
- Công việc của mình: `appointment.list`, `appointment.search`, `ticket.open`, `ticket.lookup`, `conversation.list`, `conversation.context`, `hotel.stays`, `taxi.trips`.
- Cá nhân và hướng dẫn: `staff.lookup`, `staff.schedule`, `knowledge.search`.

Khách chỉ có mã, tên và SĐT; không trả Auth, email, ngày sinh hoặc quyền tài khoản. Sản phẩm trả giá bán/tồn, không giá vốn. Tiền chỉ tổng hợp trong đúng mã đơn, không trả danh sách payment/refund thô hay doanh thu cửa hàng. Ca/phiếu/hội thoại/lưu trú/chuyến lọc theo phân công hiện tại. Hàng chờ chỉ có ID, thời gian và trạng thái; chưa chọn khách/nội dung trước tiếp nhận. Tin nhắn chỉ đọc content đã lọc, tối đa 800 ký tự có dấu truncated; không đọc raw_content. Lịch cá nhân không có lý do riêng tư của ca nghỉ. Hướng dẫn/ưu đãi phải đang bật/hiệu lực trong CSDL.

Mỗi lần đọc tối đa 10 dòng, giới hạn trang 1–1000, bộ lọc tối đa 2048 byte, giá trị tối đa 120 ký tự, khoảng thời gian tối đa 31 ngày và phản hồi tối đa 32 KB. `total_is_page=true` bắt buộc: số dòng chỉ thuộc trang vừa đọc, **không được trình bày như tổng số liệu toàn cửa hàng hoặc tổng tất cả kết quả**. Đây là DTO nền tảng; chưa nối vào formatter hoặc model cũ khi chưa có xử lý ý nghĩa trang này.

`prepareStaff` trong `chat_read_tools.js` tạo descriptor bất biến bằng danh tính/quyền đã xác minh ở máy chủ, đưa vào WeakSet của bộ đọc. Ngân sách 3 nguồn, 2 nguồn đồng thời, tổng 64 KB và hạn đọc hiện có tiếp tục được áp dụng. CSDL kiểm tra lại độc lập, nên giả mạo object quyền JavaScript hoặc gọi RPC trực tiếp không mở phạm vi. Nhánh STAFF không sử dụng lease quản trị; admission/rate-limit ở API phải được chốt khi nối API, không coi ngân sách JavaScript này là hạn mức SQL cho mọi lời gọi trực tiếp.

[Báo cáo gateway](phase4/gateway/ui-results.txt): 21 nhóm PASS trên GoTrue/PostgREST/CSDL thật. Có dữ liệu 13 khách phân trang 10/3, hai đơn có khoản thu thật riêng biệt, ca/phiếu/hội thoại của hai nhân viên, lịch cá nhân, đặt phòng và chuyến được tạo qua RPC thật. Kiểm tra cả thu hồi phân công/quyền với token đang giữ, công cụ cấm, bộ lọc giả mạo, payload lớn, nguồn dữ liệu tối thiểu, quyền ADMIN không đổi, read-only và rollback chỉ xóa hàm mới. Mã băm nguồn khớp; bản sao và cấu hình bí mật tạm đã dọn.

Hồi quy máy chủ: 30 bài trong `chat_read_tools.test.cjs`, `chat_stage3.test.cjs`, `chat_stage3_staff.test.cjs`, `chat_stage4_customer_case.test.cjs` PASS. Hai bộ `admin_copilot_business.cjs` và `admin_copilot_extended.cjs` cũng PASS ở chế độ offline; không gọi Cloud/Gemini. Không sửa giao diện trong bước gateway này, không thêm JS giao diện hoặc modal.

Chạy lại: `$env:PAWPAL_PHASE4_GATEWAY='1'; node scripts/test/admin_access_phase3_ui.cjs`. Dùng CSDL bản sao 165 cùng các migration 166–176 đã kiểm tra trước khi thử 177; không áp dụng vào CSDL rà soát chính hoặc Cloud. API hiện vẫn yêu cầu quyền lịch sử quản trị và không cho STAFF dùng trợ lý; lịch sử/replay cùng các công cụ chưa hỗ trợ bị từ chối trong gateway mới. Chưa hoàn thành giai đoạn 4.

## Nền tảng lịch sử STAFF — migration 178, ngày 06/11/2026

Lịch sử mới nằm trong `pawpal_private.staff_copilot_exchange`, không sao chép hoặc đọc `public.admin_copilot_history`. Mỗi lượt gắn hồ sơ nhân viên, Auth ID, phiên hội thoại, UUID request và reply, phiên bản phạm vi, mốc quyền/phân công và danh sách hồ sơ nguồn. Không cấp quyền bảng cho trình duyệt hoặc service role; máy chủ dùng hàm lưu riêng chỉ cấp cho service role. Các hàm đọc tự lấy `auth.uid()` và chỉ chấp nhận STAFF đang hoạt động, không bị ban, không phải đổi mật khẩu và còn quyền Copilot.

`get_staff_copilot_scope` cấp mốc phạm vi hiện tại. `save_staff_copilot_exchange` kiểm tra lại mốc này và từng nguồn trước khi lưu; request UUID trùng chỉ trả lại câu trả lời gốc nếu danh tính, phiên, câu hỏi và mốc quyền khớp. Mốc phạm vi là dấu thay đổi, không phải chữ ký cấp quyền. Kiểm tra người gọi, quyền và phân công trong CSDL mới là hàng rào truy cập.

`staff_copilot_sessions`, `staff_copilot_history_page`, `staff_copilot_recent_context`, `staff_copilot_message_part` và `replay_staff_copilot_exchange` đều xác minh lại từng hồ sơ nguồn. Mất phân công ca/chat/phiếu/chuyến thì nội dung dựa vào nguồn đó không còn được đọc hoặc phát lại. Việc nhận thêm một ca khác không làm mất nội dung vẫn được phép đọc. Đổi Auth ID gắn với hồ sơ chặn token cũ; tài khoản mới không kế thừa lịch sử của Auth ID trước. Lịch sử là nội dung đã lưu; phát lại mang cờ `replayed`, không được trình bày như dữ liệu vừa truy vấn lại.

Danh sách nguồn được `createReadBudget` trong file máy chủ hiện có tự thu từ descriptor đã chuẩn bị và DTO thật. Luôn giữ quyền của nguồn kể cả kết quả rỗng. Với transcript, nguồn là hội thoại đã xác minh, không phải ID tin nhắn; hàng chờ chat chỉ mang phạm vi hàng chờ. Snapshot nguồn bất biến, gộp cả nguồn đọc đồng thời và không nhận actor/role hoặc danh sách do mô hình cung cấp. API khi dùng lịch sử/bản tóm tắt làm ngữ cảnh phải kế thừa nguồn của chúng vào lượt mới; phần nối này chưa thực hiện.

Phân trang tối đa 10 phiên hoặc 10 tin nhắn, ngữ cảnh tối đa 6 tin; JSON tối đa 32 KB. Câu trả lời tối đa 16000 ký tự; nội dung dài chia phần 1200 ký tự với offset và mã phiên bản, kiểm tra lại quyền ở mỗi phần. Chừa dung lượng cho offset/flags của trang cuối. Xóa phiên chỉ xóa các lượt thuộc hồ sơ và Auth ID đang đăng nhập, không động tới bảng lịch sử quản trị.

[Báo cáo lịch sử](phase4/history/ui-results.txt): **16 nhóm PASS** trên CSDL, GoTrue, PostgREST và trình duyệt thật, gồm:

- Chống ghi trực tiếp/giả mạo provenance; quyền bảng và helper riêng không mở cho trình duyệt.
- Cùng UUID trả lại nội dung gốc; đổi câu hỏi/phiên bị chặn; đồng nghiệp không đọc, phát lại hoặc xóa hộ.
- Lưu trùng request vẫn kiểm tra lại nguồn gốc ban đầu; thay danh sách nguồn ở lần thử lại không làm lộ câu trả lời dựa trên hướng dẫn đã tắt.
- Mốc quyền cũ không được lưu; chuyển ca chặn lịch sử, ngữ cảnh, replay và từng phần; thay đổi phân công không liên quan vẫn giữ nội dung hợp lệ.
- Thu hồi quyền nghiệp vụ/Copilot, đổi vai trò, trạng thái hoạt động, ban Auth và yêu cầu đổi mật khẩu có hiệu lực với token đang giữ.
- Đổi liên kết Auth không làm kế thừa lịch sử; canary quản trị cũ cùng hồ sơ/phiên không xuất hiện ở đường STAFF.
- 13 phiên chia 10/3, 12 tin chia 10/2 không trùng, ngữ cảnh tối đa 6 tin; câu trả lời tiếng Việt 16000 ký tự đọc lại chính xác qua từng phần có giới hạn byte.
- Rollback 178 chỉ xóa bề mặt mới, giữ gateway 177, các hàm cũ và lịch sử quản trị.

Mã băm nguồn khớp, bản sao/container/cấu hình bí mật tạm đã dọn. Bốn bài `chat_staff_provenance.test.cjs`, 30 bài hồi quy bộ đọc/planner cũ và hai bộ nghiệp vụ Copilot offline cũng đạt; kết quả 34 bài Node lưu tại [unit-results.txt](phase4/history/unit-results.txt). Đã chạy lại 21 nhóm gateway với phần ghi nhận nguồn cho cả 20 công cụ và kết quả đạt, mã băm nguồn mới khớp. Không gọi mô hình hoặc sửa giao diện trong bước này.

Chạy lại: bỏ các biến `PAWPAL_PHASE4_SESSIONS` và `PAWPAL_PHASE4_GATEWAY`, đặt `$env:PAWPAL_PHASE4_HISTORY='1'`, rồi chạy `node scripts/test/admin_access_phase3_ui.cjs`. Chỉ thử trên bản sao cục bộ. Migration 178 và rollback chưa áp dụng vào CSDL rà soát chính hoặc Cloud.

**Giới hạn còn lại:** HTTP AI/giao diện STAFF vẫn bị chặn bởi cổng quyền hiện có. Chưa nối lịch sử mới vào API, chưa hoàn thiện giá chi tiết/phòng trống/quan hệ khách, admission/rate-limit, kiểm tra quyền sau xử lý mô hình và ngay trước trả kết quả, cùng kiểm thử payload Realtime đầu cuối. Các kiểm tra ở migration 178 không thay thế các bước này; giai đoạn 4 còn mở.

## Quan hệ khách trong phạm vi công việc — migration 179, ngày 06/11/2026

`read_staff_copilot_relations` bổ sung 5 nguồn riêng: `internal.customer_resolve`, `internal.customer_pets`, `internal.customer_latest_order`, `internal.customer_appointment`, `internal.customer_tickets`. Registry STAFF hiện có 25 nguồn, đi qua hai RPC đóng; migration 179 không sửa gateway 177, kho lịch sử 178, ACL bảng hoặc quyền vai trò. HTTP AI và giao diện STAFF vẫn chưa được mở.

Nguồn xác định khách yêu cầu mã/UUID/SĐT chính xác hoặc họ tên đầy đủ đã chuẩn hóa; giới hạn 2 kết quả, đủ phát hiện trường hợp chưa xác định duy nhất. Không tìm gần đúng rồi tự chọn người đầu tiên. Kết quả chỉ có UUID, mã và tên. Planner STAFF khi tích hợp phải dừng khi không có hoặc có nhiều khách, rồi mới đọc quan hệ của khách đã xác định; planner quản trị cũ chưa được dùng cho các DTO này.

Mỗi nguồn yêu cầu `work.copilot.use`, `work.customer.read` và quyền nghiệp vụ tương ứng. Thú cưng và đơn tuân theo quyền phục vụ khách đang có trên giao diện; lịch chỉ chọn ca mình phụ trách, phiếu chỉ chọn khiếu nại mở gắn trực tiếp đúng khách và được giao cho mình. Không suy ra khách từ hội thoại/đơn khi phiếu chưa gắn khách. Đơn mới nhất là đơn được tạo mới nhất ở mọi trạng thái, gồm đơn hủy; không trả tiền thu hoặc trạng thái thanh toán suy đoán. Lịch trả một ca gần nhất theo hướng sắp tới/vừa qua bằng thời gian máy chủ.

Quan hệ trả UUID khách ở từng dòng và trong scope. Bộ đọc máy chủ so sánh cả hai với descriptor đã chuẩn bị, kể cả trang rỗng; phản hồi không khớp bị loại trước khi đến mô hình. Ngân sách dùng chung tối đa 3 nguồn/2 nguồn đồng thời/64 KB. Provenance giữ quyền khách, quyền nghiệp vụ và UUID khách kể cả kết quả rỗng, cộng các hồ sơ nguồn thực tế; việc đổi người phụ trách sau đó chặn lịch sử của câu trả lời liên quan.

Thú cưng/phiếu phân trang 10 dòng, trang 1–1000; resolver tối đa 2 dòng, lịch/đơn mới nhất tối đa 1 dòng. `total_is_page=true`: không dùng số dòng hiện tại làm tổng hồ sơ hoặc tổng phiếu của khách. Mỗi nguồn tối đa 32 KB; bộ lọc 2048 byte, mỗi giá trị tối đa 120 ký tự. Không nhận actor, role, SQL, tên cột hoặc bộ lọc ngoài danh sách đóng.

[Báo cáo quan hệ khách](phase4/relations/ui-results.txt): **11 nhóm PASS** bằng Auth/CSDL/PostgREST/trình duyệt thật. Có đối chiếu khách theo UUID/mã/SĐT, trùng tên và chuỗi gần đúng, đơn hủy mới hơn đơn cũ, đơn khách khác mới hơn nữa, 13 thú cưng chia 10/3, ca đồng nghiệp gần hơn và phiếu của người/khách khác. Kiểm tra giả bộ lọc, quyền khách/quyền nghiệp vụ bị thu hồi với token cũ, chuỗi xác định khách + 2 nguồn dùng đúng 3 lượt, lưu history thật rồi đổi phân công, ADMIN/anon bị chặn và rollback giữ nguyên mọi hàm trước đó.

Bộ máy chủ hiện có 37 bài đạt (7 bài provenance, 30 bài hồi quy); hai bộ nghiệp vụ Copilot offline cũng đạt. Chạy lại 16 nhóm history và 21 nhóm gateway với shared reader hiện tại, mã băm nguồn khớp. Báo cáo Node: [unit-results.txt](phase4/relations/unit-results.txt). Bản sao/container/cấu hình bí mật tạm đã dọn, không áp dụng migration 179 vào CSDL rà soát chính hoặc Cloud.

Chạy lại: chỉ đặt `PAWPAL_PHASE4_RELATIONS=1` trong các biến chọn chế độ giai đoạn 4, rồi chạy `node scripts/test/admin_access_phase3_ui.cjs`. Bộ thử áp dụng 177/178/179 trên bản sao, thử rollback 179 và tự dọn tài nguyên thuộc lượt thử.

**Còn lại:** giá chi tiết/phòng trống; planner/formatter STAFF không nhầm tổng trang thành tổng toàn bộ; tích hợp history/replay và nguồn kế thừa vào API; hạn mức request và xác minh quyền trước trả kết quả; giao diện và payload Realtime đầu cuối. Giai đoạn 4 chưa hoàn thành.

## Giá và khả năng nhận phòng — migration 180, ngày 06/11/2026

`read_staff_copilot_booking` bổ sung `catalog.service_price`, `catalog.price_rows` và `hotel.availability`, đưa registry STAFF lên 28 nguồn. Hàm tự lấy nhân viên từ Auth, chỉ chấp nhận STAFF đang hợp lệ với `work.copilot.use` và `work.booking.create`; không cấp quyền bảng, chỉnh giá, phân công hoặc xem các ca của người khác. Đây là dữ liệu phục vụ tạo lịch, chưa phải cổng API AI hoặc giao diện đã bật.

Hai công cụ giá chọn đúng dịch vụ bằng UUID/mã/tên đầy đủ đã chuẩn hóa; tối đa 2 kết quả xác định để phát hiện trùng tên. Nếu chưa xác định duy nhất thì không trả bảng giá của người đầu tiên. Chỉ chọn dòng giá hoạt động, có thời gian bắt đầu không lớn hơn thời điểm đọc và thời gian kết thúc chưa đến. Mỗi loại giá đều lọc `service_id` thực tế, gồm quy tắc Taxi và loại phòng Hotel; không dùng toàn bộ giá chung của phân hệ để trả lời một dịch vụ riêng.

DTO giữ điều kiện biến thể/mã biến thể, các cận cân nặng/cự ly và cờ bao gồm cận trên. Hotel giữ `billing_minutes`, Taxi giữ giá và phụ phí riêng; không tự cộng thành báo giá, không suy ra phụ phí ngoài dữ liệu và không coi giá hiện tại là giá đã chốt cho lịch hẹn. Các khoảng áp dụng cận dưới và cận trên theo đúng cờ cấu hình. Giới hạn nhập cân nặng 1000, cự ly 10000, tối đa 3 chữ số thập phân.

Phòng chỉ gồm phòng vật lý hoạt động thuộc loại phòng/dịch vụ hoạt động và loại phòng có thời gian hiệu lực hiện tại. `reserved` xét giao khoảng nửa mở `[start,end)` với booking chưa hủy/đóng; `occupied` xét booking đang nhận phòng, kể cả thời gian ghi trên booking đã qua. Một phòng chỉ nhận được khi cả hai đều false. Kết quả chỉ có UUID/mã phòng, tên loại, sức chứa cấu hình và trạng thái; không trả booking/appointment, khách, thú cưng hoặc người phụ trách dù booking đang chặn phòng là của người khác. Không có thao tác giữ phòng; lúc lưu lịch phải kiểm tra lại.

Mỗi nguồn tối đa 10 dòng/trang, 32 KB; `total_is_page=true` và với phòng `available_is_page=true` bắt buộc. Không trình bày số phòng của trang đang đọc thành tổng khả năng nhận toàn cửa hàng hoặc số bé tối đa. Chỉ chấp nhận khoảng hữu hạn, kết thúc sau bắt đầu, tối đa 31 ngày. Bộ đọc máy chủ kiểm tra tổng trang, trạng thái phòng nhất quán và mọi dòng giá thuộc dịch vụ đã xác định trước khi trả cho tầng trả lời.

Migration 180 mở rộng helper kiểm tra nguồn của 178 cho `work.booking.create` và các loại `service_price`, `taxi_price`, `room_type`, `room`; dịch vụ dùng quyền đặt lịch cũng phải đang hoạt động. Provenance lấy từ DTO SQL qua descriptor đã chuẩn bị, không từ mô hình hoặc request tùy ý. Tắt giá/loại phòng/phòng/dịch vụ hoặc mất quyền đặt lịch làm chặn câu trả lời lịch sử có nguồn đó. Thay đổi giá hay lịch giữ phòng không biến câu trả lời cũ thành dữ liệu hiện tại: replay vẫn là nội dung đã lưu với thời điểm cũ, API/formatter khi nối phải phân biệt và đọc lại nếu hỏi trạng thái hiện tại.

[Báo cáo giá/phòng](phase4/booking/ui-results.txt): **14 nhóm PASS** bằng Auth, CSDL, PostgREST và trình duyệt thật. Bao gồm giá Grooming ở cận 20/30/30.001kg, giá chưa/hết hiệu lực/không hoạt động, Taxi 100/200/200.001km, cận cân nặng bao gồm, quy tắc dịch vụ khác có giá canary, Hotel đúng loại/kỳ tiền, dịch vụ trùng tên và bị tắt; 13 dòng giá chia 10/3, 14 phòng chia 10/4; booking của nhân viên khác, cận trả phòng, đang nhận phòng và đã hủy. Kiểm tra payload/filter/thời gian giả, nguồn lịch sử sau tắt giá/loại phòng/thu hồi quyền, không ghi booking/appointment/payment/audit, ADMIN/anon bị chặn và rollback khôi phục chính xác helper cùng các hàm cũ.

[41 bài Node](phase4/booking/unit-results.txt) và hai bộ nghiệp vụ Copilot offline đạt; các bộ quan hệ khách, lịch sử và gateway được chạy lại với shared reader mới. Mã băm nguồn khớp, bản sao/container/cấu hình bí mật đã dọn. Migration 180 chưa áp dụng vào CSDL rà soát chính hoặc Cloud; không thêm JS giao diện hoặc modal.

Chạy lại: chỉ đặt `PAWPAL_PHASE4_BOOKING=1` trong các biến chọn chế độ giai đoạn 4 rồi chạy `node scripts/test/admin_access_phase3_ui.cjs`. Khôi phục theo thứ tự 180 trước 179/178; rollback 180 thay helper về định nghĩa 178 nên phải triển khai theo đúng thứ tự và không chạy vượt các migration mới hơn.

**Còn lại:** planner/formatter STAFF cho 28 nguồn; API admission/rate-limit; tích hợp history/replay và kế thừa nguồn; xác minh quyền sau xử lý và trước trả kết quả; giao diện và Realtime đầu cuối. Chưa hoàn thành giai đoạn 4.

## API đọc và xóa lịch sử STAFF — sau push `db27efdb`

Đã push phần phân quyền đến migration 180 lên `origin/main` tại `db27efdb` theo yêu cầu người dùng. Không push thay đổi số Zalo ngoài phạm vi phân quyền; không đưa tệp môi trường thử cục bộ và đầu ra tạm vào commit. Push mã không tự áp dụng các migration Supabase. Phần API dưới đây thực hiện sau mốc đó và đang giữ ở local.

`api/admin-chat.js` xác minh một trong hai quyền vào cổng chung rồi phân nhánh theo vai trò từ Auth/CSDL. STAFF chỉ vào nhánh `work.copilot.use`; ADMIN tiếp tục bắt buộc `admin_copilot_history.read` và quyền ghi lịch sử khi thao tác tương ứng. Không dùng quyền Copilot công việc để vào nhánh lịch sử quản trị. Không sửa các đường khách/thành viên hoặc stream câu trả lời quản trị.

STAFF hỗ trợ GET `sessions`, lịch sử theo phiên/offset và `message_part`, cùng DELETE phiên của chính mình. Tất cả đi qua caller client với JWT thật và RPC lịch sử riêng của migration 178; không chọn actor từ query/body, không dùng service client để đọc lịch sử cũ. Từ chối view/filter/body ngoài danh sách đóng. POST tạo câu trả lời, lưu tùy ý, benchmark và replay qua HTTP của STAFF vẫn đóng cho tới khi tích hợp luồng tạo câu trả lời an toàn.

Mỗi request kiểm tra mốc phạm vi trước khi đọc. Sau RPC, API xác minh lại Auth qua máy chủ rồi kiểm tra hồ sơ/ID Auth/vai trò và đọc lại mốc phạm vi. Nếu quyền/phiên mất hiệu lực thì không gửi payload; nếu phạm vi thay đổi giữa chừng thì trả 409 để người dùng tải lại. Dữ liệu từng phần cũng tuân theo bước này. Nhánh xóa có thể đã xóa phiên của mình trước khi phát hiện thay đổi quyền ở bước cuối; phản hồi lỗi không được hiểu như cam kết chưa xóa. Các RPC vẫn kiểm tra phạm vi ở thời điểm thực thi.

Phản hồi có `Cache-Control: no-store`; JSON tối đa 32 KB. API giới hạn trang 1–1000, offset lịch sử tối đa 1000000, offset nội dung tối đa 16000 và mã phiên bản đúng định dạng. Hạn mức lịch sử 60 request/phút theo Auth ID dùng bộ đếm trong tiến trình, nhằm giới hạn đọc/xóa ở instance hiện tại; không coi đây là hạn mức SQL hay admission phân tán cho tạo câu trả lời. Nhánh POST chưa dùng hạn mức này để mở AI.

[Báo cáo HTTP/Auth thật](phase4/history-api/ui-results.txt): **8 nhóm PASS**, gồm thiết lập Auth và bảy tình huống API. Chạy máy chủ HTTP Node thật, xác thực GoTrue và RPC PostgREST của bản sao. Hai tài khoản STAFF không đọc/xóa chéo; canary lịch sử ADMIN cùng hồ sơ/phiên không xuất hiện. Các bài cố ý đổi vai trò và chuyển ca sau khi SQL đã đọc nhưng trước bước xác minh cuối chứng minh nội dung bị giữ lại, thay vì chỉ kiểm tra mất quyền từ đầu request. Có kiểm tra token không hợp lệ, mất quyền Copilot, từng phần và xóa phiên của mình không chạm bảng quản trị. Luồng này không gọi mô hình hoặc đọc service history cũ.

[344 bài Node](phase4/history-api/unit-results.txt) đạt, bao gồm API quản trị, admission, ngân sách, nguồn đọc, planner, privacy, customer/member và stream, cùng 8 bài mới cho nhánh STAFF. Hai bộ `admin_copilot_business.cjs` và `admin_copilot_extended.cjs` offline cũng đạt. Ba fixture API cũ được bổ sung `admin_copilot_history.read` để mô phỏng đầy đủ quyền đã được xác minh trong hệ thống thật; tiếp tục kiểm tra thiếu quyền nghiệp vụ riêng.

Bộ chạy Node trên không bao gồm `chat_inbox_states.test.cjs`: đây là script UI tự chạy dùng transport giả cũ, hiện dừng do fixture chưa khởi tạo `PawpalChatbot` sau thay đổi cấu trúc phân hệ giai đoạn 3. Khi thử riêng, lỗi vẫn ở bước khởi tạo fixture trước thao tác inbox; chưa sửa hoặc dùng script này làm bằng chứng cho API mới. Kiểm thử UI/Realtime đầu cuối vẫn là việc còn lại, không suy ra đã đạt từ 344 bài Node.

Mã băm nguồn báo cáo HTTP khớp; bản sao/container/cấu hình bí mật đã dọn. Chạy lại: chỉ đặt `PAWPAL_PHASE4_HISTORY_API=1` trong các biến chế độ giai đoạn 4 rồi chạy `node scripts/test/admin_access_phase3_ui.cjs`. Không có migration mới trong bước nối API này; cần migration 178 trước khi vận hành nhánh STAFF.

**Còn lại:** POST STAFF với planner/formatter của 28 nguồn, lịch sử/replay kế thừa provenance, admission phân tán và kiểm tra quyền trước trả câu trả lời; giao diện và Realtime. Chưa hoàn thành giai đoạn 4.

## Hạn mức CSDL và nguồn kế thừa — migration 181

Đã bổ sung nền tảng cấp lượt xử lý dùng chung cho nhiều instance và tự giữ nguồn lịch sử. Đây là bước chuẩn bị cho POST STAFF; API hiện vẫn chưa tạo câu trả lời cho STAFF. Không thêm modal hoặc JS giao diện, không áp dụng migration lên Cloud hay CSDL rà soát chính.

`acquire_staff_copilot_request` tự xác định STAFF/Auth hiện tại, yêu cầu quyền Copilot, nhận đúng UUID request/phiên và câu hỏi tối đa 2000 ký tự. CSDL chỉ có 2 vị trí STAFF toàn hệ thống, mỗi Auth ID chỉ có 1 lượt còn hiệu lực; lượt hết hạn sau 45 giây và vị trí hết hạn được thay thế. Lease gắn Auth ID, hồ sơ, request, phiên, mã băm câu hỏi và mốc phạm vi. Lượt cũ không thể đọc hoặc giải phóng vị trí đã cấp lại. Bảng rate giữ tối đa một hàng cho mỗi Auth ID, ràng buộc với Auth user và tự xóa khi user bị xóa; bảng slot cố định 2 hàng. Không lưu nội dung câu hỏi hoặc câu trả lời trong hai bảng này.

Bộ đếm cấp lượt tối đa 10 lần cho một Auth ID trong cửa sổ cố định 60 giây, bắt đầu từ lần cấp đầu tiên. Đây không phải cửa sổ trượt. Khi đã có lượt của mình hoặc hết vị trí, lỗi trả ngay thay vì tạo hàng đợi. Hạn mức STAFF riêng với cổng ADMIN hiện có; không tuyên bố tổng cả hai vai trò chỉ có 2 lượt. RPC giải phóng dùng Auth ID của người gọi và không yêu cầu còn quyền Copilot, để dọn được lượt sau thu hồi quyền; không giải phóng hộ được người khác.

`run_staff_copilot_read` kiểm tra lại lease/phạm vi ở mỗi nguồn, chỉ điều phối tới ba gateway đóng 177/179/180. Tối đa 3 nguồn nghiệp vụ thành công, tổng dữ liệu nguồn và ngữ cảnh tối đa 64 KB; mỗi nguồn giữ giới hạn 32 KB/10 dòng của nó. SQL khóa hàng lease để cập nhật bộ đếm nên các nguồn cùng lượt được tuần tự hóa; Node vẫn có trần 2 lời đọc đang chờ, không bảo đảm hai nguồn thực thi SQL song song. Lệnh có thời hạn 6 giây và chờ khóa tối đa 1 giây; lỗi/đụng khóa phải được xử lý như không đọc được nguồn, không biến thành số không. Do giao dịch lỗi được rollback, bộ đếm SQL đếm nguồn thành công; Node tiếp tục đếm cả số lần thử và không retry không giới hạn.

`read_staff_copilot_request_context` chỉ cho nạp một lần, từ tối đa 6 tin đã lọc bằng lịch sử riêng hiện tại, mỗi nội dung tối đa 1200 ký tự. CSDL tự giữ hợp nguồn trong hàng lease và tính dung lượng ngữ cảnh vào 64 KB; giới hạn hợp nguồn tối đa 64 ref/16 KB. Không nhận ngữ cảnh hoặc danh sách nguồn kế thừa do trình duyệt/mô hình tự gửi. Khi chưa cần ngữ cảnh thì không bắt buộc nạp để trả một tra cứu độc lập.

`complete_staff_copilot_request` chỉ cấp cho service role. Hàm gắn lại Auth ID, lease, câu hỏi và phạm vi; tự gộp nguồn kế thừa với nguồn mới do bộ đọc máy chủ thu rồi gọi bộ lưu 178. Vì nguồn kế thừa nằm trong CSDL, máy chủ bỏ quên nguồn đó trong payload hoàn thành cũng không làm mất ràng buộc. Tắt một FAQ sau lúc nạp nhưng không thay mốc phân công vẫn chặn lưu nhờ xác minh từng nguồn. Lượt hoàn thành không được đọc thêm nguồn; việc trả câu trả lời vẫn cần API xác minh Auth/phạm vi lần cuối. Nội dung lịch sử cũ không được coi như nguồn vừa truy vấn lại.

`chat_read_admission.js` hiện có helper STAFF riêng để cấp/dọn lượt và nạp ngữ cảnh. `createReadBudget({lease})` định tuyến descriptor STAFF qua wrapper dùng chung; các descriptor ADMIN giữ đường cũ. Các RPC đọc trực tiếp phục vụ công việc vẫn còn để UI nghiệp vụ sử dụng; đây không phải hạn mức áp dụng cho mọi truy vấn trực tiếp hoặc thay quyền truy cập bảng. Khi nối POST, controller bắt buộc phải lấy lease trước khi dùng bộ đọc/lưu mới; chưa có tuyên bố HTTP POST đã được bảo vệ từ việc chỉ thêm helper.

[Báo cáo yêu cầu dùng chung](phase4/request/ui-results.txt): **14 nhóm PASS** trên CSDL, GoTrue, PostgREST và trình duyệt thật. Ba STAFF hoạt động độc lập kiểm tra 2 vị trí dùng chung, một lượt mỗi Auth, người khác không dọn hộ, lease hết hạn/cấp lại, 3 nguồn thành công và trần byte, ba họ gateway, ngữ cảnh nạp một lần và không ghi giả từ trình duyệt. Hoàn thành với danh sách nguồn mới rỗng vẫn giữ ca nguồn của câu trước; chuyển ca sau đó làm ẩn cả câu tiếp theo. Kiểm tra riêng tắt FAQ sau khi nạp (mốc phạm vi không đổi) vẫn không lưu được. Đổi phạm vi giữa lượt chặn cả đọc và lưu; thay câu hỏi/Auth ID bị từ chối. Có kiểm tra cửa sổ 10 lượt/60 giây, giải phóng sau thu hồi quyền và rollback chỉ gỡ bề mặt mới.

[348 bài Node](phase4/request/unit-results.txt) đạt, gồm 4 bài mới cho descriptor có lease, RPC admission, context Unicode và kiểm tra cấu trúc/byte/nguồn; các API quản trị và STAFF lịch sử vẫn đạt. Hai bộ nghiệp vụ Copilot offline cũng đạt. Bộ UI fixture cũ `chat_inbox_states.test.cjs` tiếp tục nằm ngoài bộ Node như đã ghi ở phần API; không dùng các kết quả này thay kiểm thử UI/Realtime.

Mã băm nguồn báo cáo khớp; bản sao/container/cấu hình bí mật đã dọn. Chạy lại: chỉ đặt `PAWPAL_PHASE4_REQUEST=1` trong các biến chế độ giai đoạn 4 rồi chạy `node scripts/test/admin_access_phase3_ui.cjs`. Áp dụng 181 sau 180 và khôi phục theo thứ tự ngược. Phần mới đang local, không push hoặc triển khai Cloud ở lượt này.

**Còn lại:** planner/formatter cho STAFF và POST bắt buộc dùng lượt xử lý này; ghép lịch sử/replay, kiểm tra Auth/quyền sau xử lý và trước trả lời; giao diện và Realtime đầu cuối. Giai đoạn 4 chưa hoàn thành.

## POST trả lời STAFF — xác minh nguồn trước mô hình, migration 182

`api/admin-chat.js` đã nối nhánh POST STAFF sau xác thực vai trò, dùng registry công việc, admission CSDL 181 và kho lịch sử riêng. Không dùng các gateway quyền bảng cũ, truy vấn service history hoặc bộ trình bày tổng quản trị để mở trợ lý cho STAFF. `admin_copilot.js` có `planStaff`, `formatStaffFacts` và `answerStaff` trong file máy chủ hiện có; không thêm JS giao diện hoặc modal.

Tra cứu nghiệp vụ trả lời tất định từ DTO SQL và không gọi mô hình cho số liệu. Bộ trình bày có danh sách trường riêng cho đủ 28 DTO, kiểm tra trạng thái và số liệu, ghi rõ trang/thời điểm đọc. Số dòng và số phòng nhận được chỉ thuộc trang vừa đọc; đơn mới nhất không suy ra thanh toán, giá cấu hình chưa phải báo giá đã chốt, phòng chưa được giữ. Các câu hỏi doanh thu/báo cáo, lương/nhân sự toàn hệ thống, đánh giá, nội dung quản trị và cấu hình không được mở bằng quyền công việc. Từ chối thao tác ghi nghiệp vụ; không tự gửi câu trả lời cho khách.

Luồng quan hệ khách giải quyết đúng mã/SĐT/tên đầy đủ trước khi đọc ca/phiếu/thú cưng/đơn. Không có hoặc nhiều khách trùng tên thì dừng, không truy vấn quan hệ của người đầu tiên. `readContext` từ trình duyệt không cấp danh tính hoặc phạm vi; người dùng phải nêu đối tượng trong câu hỏi, rồi SQL xác định lại. Hỏi tiếp “Trang 2” nạp câu hỏi gốc từ lịch sử STAFF đã được lọc quyền, giữ bộ lọc qua planner và kế thừa nguồn vào lượt mới. Các công cụ mới/được kế thừa vẫn qua registry và SQL hiện tại.

Trước câu trả lời mới, API đọc scope và thử replay đúng chủ/UUID request/phiên/câu hỏi. Replay hợp lệ không cấp lượt, gọi nguồn hoặc mô hình lần nữa. Câu trả lời mới bắt buộc lấy lease CSDL, dùng `createReadBudget({lease})` và khi cần thì nạp ngữ cảnh một lần bằng 181. Lưu qua service-only `complete_staff_copilot_request`; nguồn kế thừa tự gắn ở CSDL. Cả khi không đọc được thêm dòng trên trang tiếp theo, ràng buộc nguồn của lượt trước vẫn được giữ. API dọn slot trước khi kết thúc HTTP; nếu dọn gặp lỗi, TTL CSDL vẫn chặn giữ vị trí vô hạn.

Nháp và tóm tắt chỉ dùng hội thoại đã giao; hướng dẫn dùng FAQ đang bật. Nếu không có nguồn phù hợp thì trả thông báo thiếu nguồn và không gọi mô hình. Nháp có câu hỏi nghiệp vụ hỗ trợ thì phải đọc nguồn tương ứng trước; không có/mơ hồ thì dừng để xác định mã. Dữ liệu đưa vào provider được làm sạch thông tin xác thực, email, SĐT và trường nhạy cảm bằng bộ privacy hiện có. Kết quả mô hình chỉ là chuỗi nội dung có giới hạn; luôn có nhãn nháp cần kiểm tra và phạm vi nguồn rút gọn, không tự trở thành lệnh công cụ hoặc xác nhận nghiệp vụ.

Migration 182 thêm `validate_staff_copilot_request(p_lease,p_scope_refs)` để kiểm tra lease/phạm vi và hợp nguồn mới với nguồn lịch sử do CSDL giữ **ngay trước khi gửi sang provider**. Nhờ kiểm tra từng nguồn, FAQ bị tắt sau lúc đọc vẫn bị chặn trước dispatch dù mốc phân công không thay đổi. Sau xử lý, API xác minh lại Auth/vai trò/hồ sơ/scope trước khi lưu; 181/178 xác minh nguồn lúc lưu. Sau khi lưu, API xác minh lại Auth/scope và gọi native replay một lần nữa để kiểm tra nguồn trước khi gửi nội dung. Không gửi chunk mô hình STAFF chưa được kiểm tra: nhánh này trả JSON sau các bước xác minh, kể cả khi body có `stream:true`.

Nếu quyền thay đổi sau commit, câu trả lời có thể đã được lưu nhưng HTTP không trả nội dung. Client cần retry cùng UUID để kiểm tra lại, không tạo request mới vì cho rằng chưa lưu. Khi đổi ca/chat hoặc tắt nguồn làm mất quyền đọc, replay trả lỗi thay vì bản cũ. Response giữ giới hạn 32 KB; nội dung dài dùng cơ chế phần/phiên bản của kho lịch sử. POST có thêm trần trong tiến trình 30 request/phút/Auth để hạn chế cả replay; lời gọi tạo câu trả lời vẫn phải qua hạn mức dùng chung 181, không dựa vào bộ đếm tiến trình thay thế.

[Báo cáo POST](phase4/answer/ui-results.txt): **17 nhóm PASS** bằng GoTrue, PostgREST, HTTP Node và CSDL thật. Các tình huống gồm tra cứu không gọi mô hình/replay không đọc lại nguồn, giá và phòng trống qua họ booking, quan hệ khách và trùng tên, payload giả mạo/nguồn cấm, nháp từ chat được giao, lỗi provider, đổi vai trò trong lúc sinh nháp và sau commit, chuyển chat sau đọc, FAQ bị tắt ngay trước dispatch hoặc trong lúc sinh nháp, replay sau chuyển người, trang tiếp theo giữ nguồn và rollback 182 không thay các hàm trước. Không ghi payment/nghiệp vụ tiền. Provider trong bộ thử là bản thay thế offline điều khiển được thời điểm lỗi/đổi quyền; không gọi Gemini hoặc nhà cung cấp thực.

[357 bài Node](phase4/answer/unit-results.txt) đạt, gồm 9 bài POST mới và kiểm tra định dạng cho đủ 28 DTO; kiểm tra thiếu quyền/lease, lỗi nguồn/mô hình, nguồn trước dispatch, privacy, không lưu nháp không có nguồn và chặn nội dung khi quyền đổi sau save. Các API/stream quản trị và các luồng khách/thành viên vẫn đạt. Hai bộ nghiệp vụ Copilot offline đạt. Đã chạy lại [8 nhóm HTTP lịch sử](phase4/history-api/ui-results.txt) với API mới; các câu hỏi quản trị/benchmark vẫn bị từ chối trong STAFF, GET/DELETE và ADMIN giữ đường tương ứng.

Mã băm nguồn khớp và bản sao/container/cấu hình bí mật đã dọn. Chạy lại: chỉ đặt `PAWPAL_PHASE4_ANSWER=1` trong các biến chế độ giai đoạn 4 rồi chạy `node scripts/test/admin_access_phase3_ui.cjs`. Cần migration 181/182 trước mã POST mới; rollback 182 chỉ gỡ hàm xác minh nguồn, sau đó phải dùng mã API tương thích trước khi vận hành. Phần này chưa push hoặc triển khai Cloud.

**Còn lại:** nối tab trợ lý STAFF vào giao diện, kiểm tra desktop/mobile, phản hồi lỗi/mất quyền/nháp và đọc phần tiếp; kiểm thử payload Realtime đầu cuối cùng nhật ký/bề mặt thông báo liên quan. Bộ UI fixture cũ đã ghi hạn chế ở phần HTTP lịch sử vẫn không được dùng làm bằng chứng thay cho kiểm thử giao diện thật. Giai đoạn 4 chưa hoàn thành.

## Giao diện trợ lý STAFF trong phân hệ Chatbot

Đã nối tab Trợ lý bằng bộ nạp/phân hệ STAFF hiện có. Mã màn hình nằm trong `modules/chatbot/chatbot.js`, bảng tab ở `admin.js`, kiểu dáng dùng `admin-components.css`; không tạo JS nghiệp vụ hoặc modal rời. Tab chỉ hiện khi còn `work.copilot.use`; truy cập hash trực tiếp vẫn kiểm tra quyền. ADMIN giữ bộ nạp và DOM Copilot quản trị cũ. Các thân khởi tạo quản trị của sáu phân hệ không thay đổi so với mốc đã push; bộ đối chiếu hiện lấy đúng phần `initializeManagementDomain`, vì Git HEAD mới đã chứa phần STAFF được phê duyệt từ các giai đoạn trước.

Màn hình có danh sách/tìm kiếm/phân trang phiên, tạo phiên mới, lịch sử và tin trước, nội dung dài đọc theo phần có phiên bản, gửi câu hỏi, tải lại và xóa phiên riêng. Xác nhận xóa hiển thị ngay trong khối thao tác với Hủy/Xác nhận xóa, không thêm modal. Từ một hội thoại được giao có nút Soạn nháp với trợ lý; màn hình xác minh lại hội thoại bằng RPC công việc trước khi chọn ngữ cảnh. Không lấy Auth ID hoặc vai trò từ hash, không dùng thông tin khách trên trình duyệt để cấp phạm vi.

Nội dung hiển thị bằng DOM text; chỉ xử lý phần chữ đậm đơn giản, không gán HTML từ câu trả lời hoặc lịch sử. Chuỗi `<img onerror=...>` lưu trong CSDL vẫn là chữ, không tạo ảnh hoặc thực thi mã. Nháp có nhãn từ API và không tự gửi cho khách. Phiên đang chọn chỉ lưu UUID trong sessionStorage với khóa có cả staff ID và Auth ID; không lưu tên phiên/nội dung chat/câu trả lời trong browser storage. Khi reload hoặc quay lại màn hình, nội dung được đọc lại qua API thật.

Nếu mất phản hồi POST sau khi máy chủ đã lưu, giao diện giữ đúng UUID/phiên/câu hỏi/ngữ cảnh trong RAM để thử lại. Trường nhập bị khóa cho đến khi nhận kết quả hoặc người dùng chủ động bỏ câu hỏi đang chờ; không tự phát request mới với nội dung đã thay đổi. Việc bỏ câu hỏi không cam kết máy chủ chưa lưu, giao diện nhắc tải lại lịch sử để kiểm tra. Điều này cũng áp dụng khi lỗi quyền hoặc phân công: backend quyết định có thể replay hay không. Không lưu yêu cầu đang chờ vào localStorage.

Mỗi lượt tải gắn với revision và danh tính, kiểm tra lại phiên Auth sau HTTP; phản hồi cũ không được gắn sang view/tài khoản mới. Rời màn hình dọn listener, timer và AbortController; callback đến muộn không được sửa DOM. Khi có 401/403/409, dọn tin nhắn/danh sách cũ, bỏ ngữ cảnh hiển thị và hủy các lượt tải khác trước khi xác minh lại. Khi khóa tài khoản/đổi người/đổi vai trò, sự kiện invalidation hiện có dọn view và request đang chờ. Bổ sung `pawpal:access-verified` để trường hợp chỉ mất riêng quyền Copilot cũng dọn tab/dữ liệu, dù tài khoản vẫn còn hoạt động và sử dụng phân hệ khác được.

Layout giữ card chính không lồng hộp nội dung, nền/bo góc/màu theo hệ thống và tác vụ text-only. Mobile tách hai hàng header cho STAFF, giữ Menu cùng tab đang chọn trong tầm nhìn; nhóm tab tự cuộn tới tab active. Phân trang nằm ngoài card, nút active xanh thương hiệu, nút tin trước/bỏ câu hỏi chỉ hiện khi cần. Đã xem [ảnh desktop](phase4/copilot-ui/assistant-desktop.png), [ảnh mobile tổng thể](phase4/copilot-ui/assistant-mobile.png) và [ảnh mobile ô nhập](phase4/copilot-ui/assistant-mobile-composer.png); không tràn ngang hoặc cắt nút gửi.

[Báo cáo UI/Auth thật](phase4/copilot-ui/ui-results.txt): **16 nhóm PASS** qua trình duyệt Chrome, GoTrue, PostgREST, HTTP API và CSDL bản sao. Bao gồm trạng thái trống, gửi dữ liệu thật, reload/storage, câu hỏi cấm dọn nội dung, cố ý làm mất phản hồi HTTP thật sau commit rồi retry cùng UUID không tạo bản trùng; chọn chat được giao, nháp và câu dài/đọc phần tiếp; hủy/xác nhận xóa; chuyển phân công khi provider đang xử lý; 13 phiên chia 10/3, 12 tin chia 10/2 không trùng, HTML chỉ là chữ; rời/quay lại phân hệ, khóa tài khoản, mất riêng quyền Copilot và ADMIN giữ DOM cũ. Không mock nguồn nghiệp vụ ở trình duyệt; fixture được ghi vào Supabase cục bộ và mọi thao tác dùng RPC/API thật. Provider nháp là bản thay thế offline, không gọi Gemini.

[357 bài Node](phase4/copilot-ui/unit-results.txt), hai bộ nghiệp vụ Copilot offline và [11 nhóm kiểm tra phiên](phase4/session/ui-results.txt) chạy lại đều đạt. Đối chiếu sáu thân quản trị không đổi. Không tuyên bố đã chạy lại toàn bộ bộ 300 nghiệp vụ từ giai đoạn 3 trong bước UI này; bằng chứng hiện tại là kiểm tra UI/API mục tiêu và bộ phiên. Bộ fixture UI cũ `chat_inbox_states.test.cjs` tiếp tục không dùng để thay thế kiểm thử thực tế này.

Mã băm nguồn của UI và phiên khớp; bản sao/container/cấu hình bí mật tạm đã dọn. Chạy lại: chỉ đặt `PAWPAL_PHASE4_COPILOT_UI=1` trong các biến chế độ giai đoạn 4 rồi chạy `node scripts/test/admin_access_phase3_ui.cjs`; kiểm tra phiên dùng `PAWPAL_PHASE4_SESSIONS=1`. Bước UI không thêm migration, yêu cầu nguồn API và migration đến 182 khi vận hành. Phần mới vẫn local; chưa push hoặc triển khai Cloud.

**Còn lại:** payload Realtime đầu cuối, nhật ký và các bề mặt thông báo/tìm kiếm/xuất dữ liệu liên quan. Tải lại khi focus/hiện tab và kiểm tra quyền ở API đã có, nhưng không coi đó là bằng chứng Realtime tức thời. Giai đoạn 4 chưa hoàn thành.

## Realtime thật và migration 183 — 06/11/2026

Kiểm thử dùng container Supabase Realtime v2.143.3 riêng, tenant và logical replication trỏ đúng CSDL bản sao có marker sở hữu. GoTrue, PostgREST, trình duyệt và WebSocket đều thật; không dùng payload giả, không mở Logs Cloud. Publication của bản sao được tạo riêng vì bản dump kiểm tra không bao gồm publication. Payload thử chỉ chứa canary tổng hợp trong CSDL thử.

Trước sửa, cả hai STAFF không nhận INSERT/UPDATE của `chat_message`, nhưng đều nhận `old.id` khi tin bị xóa. Đây là giới hạn của Postgres Changes: DELETE không được áp RLS như INSERT/UPDATE; tài liệu chính thức cũng mô tả việc chỉ gửi khóa chính khi bật RLS. [Supabase — Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes). Bằng chứng trước sửa được giữ ở `phase4/realtime/payload-findings.txt`.

Migration 183 ngừng phát DELETE/TRUNCATE thô trong publication, giữ INSERT/UPDATE. Bảng `workspace_signal` chỉ chứa Auth ID người nhận, revision ngẫu nhiên, nhóm dữ liệu và thời điểm. RLS giới hạn đúng `auth.uid()`; client chỉ đọc, không có quyền ghi. Trigger nội bộ ánh xạ người được phân công/khách chủ sở hữu; không chuyển mã nghiệp vụ, nội dung tin, số tiền hoặc audit payload vào tín hiệu. Các thay đổi chung mà STAFF được đọc qua projection gửi tín hiệu làm mới cho STAFF; DELETE gửi tín hiệu cho ADMIN để giữ đồng bộ danh sách. Thay đổi private Copilot chỉ gửi đúng Auth ID chủ lịch sử.

Các quan hệ cần làm mới gồm appointment và hạng mục, hội thoại, khiếu nại/tin nhắn, hồ sơ khách/thú cưng, nhật ký/ảnh chăm sóc, wishlist và mục con, điểm/thành viên/voucher, thông báo và các danh mục công việc. Một người chỉ nhận tối đa một revision trong cùng giao dịch. Trigger có thể gửi một tín hiệu riêng cuối cùng khi tài khoản bị khóa để client xác minh lại và dọn giao diện; tín hiệu không cấp lại quyền truy cập nghiệp vụ.

Client Admin dọn cache, xác minh quyền và nạp lại view phù hợp; nếu đang nhập form thì giữ nháp và hiện trạng thái Có cập nhật. Copilot dọn nội dung cũ và đọc lại lịch sử có quyền; tín hiệu do chính POST vừa lưu không được hủy POST hoặc làm mất thông báo replay. Client khách hàng dùng lại callback không tham số của các kênh đang hoạt động để đọc snapshot có quyền; không phát DELETE giả. Gỡ kênh gỡ cả callback; đổi danh tính dọn callback cũ. Khi kết nối lại, client nạp lại snapshot để bù tín hiệu đã bỏ lỡ.

Đã kiểm chứng trực tiếp: không còn DELETE thô; ADMIN giữ INSERT/UPDATE và nhận tín hiệu xóa; subscription không filter vẫn chỉ đọc own signal; không tự ghi tín hiệu; tín hiệu riêng không sang STAFF khác; gộp một tín hiệu/giao dịch; khách Auth thật đọc lại snapshot sau khi xóa wishlist con; gỡ callback; khóa Auth làm mất quyền trên UI mà không cần focus hoặc polling. Lượt tổng hợp đạt **29 nhóm**, bao gồm cả bộ Copilot UI với Realtime bật và rollback phục hồi đúng flags publication/định nghĩa ba RPC capability, bỏ bảng/hàm/trigger mới. Báo cáo `phase4/realtime/ui-results.txt` có trạng thái PASS, mã băm nguồn khớp và `disposableDatabaseRemoved: true`; container/cấu hình bí mật tạm đã dọn.

Hai lỗi giao thoa được sửa khi chạy cùng Realtime: giữ thông báo replay sau khi tự nạp lịch sử, và nạp lại trạng thái trống sau xóa phiên nếu tín hiệu đến lúc DELETE đang chạy. POST đang lưu không bị hủy bởi tín hiệu của chính bản ghi vừa lưu. Bộ kiểm tra retry chờ thông báo kết quả POST rõ ràng, vì lịch sử có thể xuất hiện sớm nhờ Realtime; không dùng sự xuất hiện lịch sử làm bằng chứng request đã hoàn tất. Bộ UI còn kiểm tra chuyển phân công trong lúc provider xử lý, thu hồi riêng quyền trợ lý, đóng view và hồi quy ADMIN; provider vẫn là bản thay thế offline.

357 bài Node cùng hai bộ nghiệp vụ Copilot offline đạt ở mốc Realtime 183; các bề mặt còn lại tại mốc đó đã được chốt ở mục dưới. Migration 183 chưa áp dụng Cloud. Trước chuyển đổi phải phát hành client hiểu tín hiệu rồi mới ngừng DELETE, kiểm tra consumer DELETE và phương án rollback; rollback publication có thể mở lại lỗi cũ nên không tự chạy khi STAFF đang hoạt động. Báo cáo cũ vẫn là bằng chứng lịch sử; ba báo cáo chốt bên dưới đã được chạy lại và khớp mã băm nguồn hiện tại.

## Chốt giai đoạn 4 — migration 184 và các bề mặt liên quan

Đã bổ sung nhật ký đổi vai trò `STAFF_ACCESS_CHANGE` qua chính RPC quản lý tài khoản hiện có. Bản ghi gồm staff/Auth của người thực hiện, staff đích, request ID, thời điểm, lý do và danh sách vai trò trước/sau. Giữ nguyên `STAFF_ACCESS_SAVE` để kiểm tra idempotency; gọi lại cùng request không thêm bản ghi thay đổi. Nhân viên không có quyền giả mạo, sửa hoặc xóa nhật ký; bảng audit còn có trigger bất biến kể cả với thao tác sửa trực tiếp. Rollback 184 khôi phục đúng định nghĩa hàm trước đó và giữ các bằng chứng đã ghi.

Đã chặn rõ câu yêu cầu hoàn tiền/phân công/cấp quyền/đổi giá/khóa tài khoản và danh sách nhân sự toàn hệ thống trong planner STAFF trước admission, đọc nguồn hoặc gọi provider. Công cụ vẫn chỉ đọc dữ liệu theo SQL/RPC có quyền; không dựa vào việc mô hình đồng ý hoặc từ chối. Những câu tra cứu hồ sơ và lịch cá nhân tiếp tục được phép.

Kiểm tra JSON, CSV và HEAD đếm chính xác trên bảng tiền/giá vốn/nhân sự/lịch sử quản trị/audit/thông báo đều bị giới hạn như truy vấn thường. HEAD bị từ chối có thể chỉ có HTTP 403 mà không có mã lỗi JSON; bộ kiểm tra xử lý đúng trường hợp này. Các hàm tìm kiếm quản trị bị STAFF từ chối, ADMIN gọi được. Projection công việc không trả hội thoại/ca hoặc danh tính cá nhân của đồng nghiệp theo ID giả mạo.

Hai khoản thu thực trong CSDL thử có giá trị 123.456 đồng trong ngày 06/11 và 777.777 đồng đúng đầu ngày 07/11 theo giờ Việt Nam. API trợ lý ADMIN tính đúng 123.456 đồng cho ngày 06/11 và loại cận trên; không gọi mô hình cho số liệu. STAFF vẫn không thấy hai canary qua JSON/CSV/số đếm. Đơn, dòng hàng và khoản thu được tạo hợp lệ trên bản sao rồi dọn cùng CSDL; không sửa/xóa ledger đã ghi. Cấu hình hai vị trí đọc ADMIN được seed đúng migration 136 trong clone vì dump chỉ có schema, không chứa hai dòng cấu hình đó; không nới admission của sản phẩm để vượt kiểm tra.

Đã xác nhận các bề mặt Realtime audit/notification bằng subscription không filter với hai STAFF và ADMIN. Một client thử nghiệm giữ nguyên kênh và token của người vừa còn là ADMIN, không tham gia cơ chế dọn giao diện; sau khi người đó bị hạ xuống STAFF, kênh vẫn kết nối nhưng không nhận audit mới. Đây là kiểm tra RLS phía máy chủ độc lập với việc frontend tự gỡ kênh.

PQ-23/PQ-24 chạy qua RPC quản lý thật: hai tab cùng danh tính tự nâng/hạ vai trò từ CSDL; khi hạ quyền, Dashboard tài chính và realm/ngữ cảnh cũ bị dọn. PQ-25 khóa hồ sơ làm hai tab gỡ toàn bộ kênh và dữ liệu; token lấy trước khóa bị RPC công việc trả 403. Ngắt WebSocket thật rồi chuyển phân công trong khoảng mất kết nối: khi đăng ký lại, client đọc lại phạm vi và loại hội thoại/nháp cũ. Nhánh tài liệu ẩn cũng được thử bằng điều khiển thuộc tính visibility do Chrome headless không ẩn tab; các phần Auth/REST/CSDL/Realtime còn lại vẫn thật, không giả lập payload.

Handler STAFF kiểm tra mất phân công trước khi quyết định giữ nháp: mất phạm vi sẽ đóng/dọn form và dựng lại view, kể cả khi tài liệu ẩn. Nếu không xác minh được phạm vi thì dọn nội dung hồ sơ cũ và yêu cầu tải lại; phản hồi lỗi từ revision cũ không ghi đè view vừa chuyển. Đã kiểm kê các consumer hiện có: Admin dùng listener tín hiệu và nút làm mới miền; các consumer khách hiện tại ở header, thông báo, hỗ trợ, hồ sơ, bé cưng, nhật ký, yêu thích và thành viên đều là callback đọc lại không tham số, được bridge chung đăng ký/gỡ theo vòng đời kênh. Không gửi DELETE giả hoặc giữ row ID đã xóa trong tín hiệu.

### Kết quả chốt và giới hạn kiểm thử

| Bộ kiểm tra chạy lại | Kết quả | Bằng chứng |
|---|---|---|
| Realtime thật + bề mặt phụ + PQ-19 đến PQ-25 + toàn bộ UI trợ lý + rollback 183/184 | 45 nhóm PASS | `phase4/realtime/ui-results.txt` |
| POST STAFF, nguồn/phân công/quyền trước/sau provider và sau commit, replay, rollback 182 | 17 nhóm PASS | `phase4/answer/ui-results.txt` |
| Phiên thật, nhiều tab, Auth refresh, đổi danh tính/vai trò, lỗi mạng/phản hồi cũ và dọn form | 11 nhóm PASS | `phase4/session/ui-results.txt` |
| Node API/quyền/planner/đọc/lịch sử/admission/stream | 357 PASS | `phase4/realtime/unit-results.txt` |
| Hai bộ nghiệp vụ Copilot offline | PASS | Lệnh `node scripts/test/admin_copilot_business.cjs` và `node scripts/test/admin_copilot_extended.cjs` |

Ba báo cáo tích hợp có mã băm nguồn khớp và xác nhận dọn CSDL riêng. Đã kiểm tra không còn container/CSDL `pawpal_access_ui_*`, xem lại ảnh desktop/mobile và giữ nguyên hai CSDL chuẩn bị có chủ sở hữu từ giai đoạn trước. Provider được thay offline để điều khiển lỗi và thay quyền; không gọi Gemini, không đọc Logs hoặc ghi Cloud. Các bộ cũ 300 nhóm nghiệp vụ/kiểm tra nguồn nhỏ hơn là bằng chứng lịch sử, không gộp vào con số chạy lại hiện tại. Bài browser độc lập `chat_inbox_states.test.cjs` có fixture khởi tạo cũ không thuộc bộ Node 357; không tuyên bố đã sửa hoặc chạy đạt bài này.

Giai đoạn 4 đã hoàn tất trong phạm vi triển khai và kiểm thử local. Bộ nghiệm thu toàn bộ 30 PQ, các luồng công khai và hồi quy tổng thuộc giai đoạn 5; chuyển đổi Cloud và phát hành thuộc giai đoạn 6. Thứ tự migration bổ sung là 181 → 182 → 183 → 184; client hiểu tín hiệu phải sẵn sàng trước 183 ngừng DELETE. Tránh rollback publication khi STAFF đang hoạt động vì sẽ mở lại hạn chế DELETE đã tái hiện. Phần sau `db27efdb` thuộc đợt push giai đoạn 4 theo yêu cầu ngày 06/11/2026; không kèm cấu hình bí mật hoặc thay đổi hotline/Zalo riêng trong `components/fab/fab.html`, chưa áp dụng Cloud.
