# Giai đoạn 4 — Chatbot, phiên và Realtime

Bắt đầu 05/11/2026. **Đang thực hiện trên môi trường thử nghiệm**, chưa triển khai Cloud hoặc push. Giai đoạn 3 đã hoàn tất; kết quả bên dưới không đồng nghĩa đã mở trợ lý AI cho Nhân viên.

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
