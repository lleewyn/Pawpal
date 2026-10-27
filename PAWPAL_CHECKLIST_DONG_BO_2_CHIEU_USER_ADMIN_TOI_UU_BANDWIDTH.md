# PAWPAL --- CHECKLIST KIỂM THỬ ĐỒNG BỘ 2 CHIỀU USER ↔ ADMIN

**Phiên bản:** 1.50 · **Cập nhật:** 27/10/2026 · **Trạng thái tổng:** ĐANG KIỂM TRA MỘT PHẦN · **Timezone:**
Asia/Ho_Chi_Minh (UTC+7)

**Sửa Thêm nhân viên 27/10:** [Nguyên nhân và kiểm thử](docs/verification/sync/staff-create-save-fix.md).

- [x] Tái hiện production: thiếu email đăng nhập/mật khẩu tạm trả 400 nhưng UI che lỗi cụ thể. Sửa kiểm tra đầu vào, focus/ARIA và giữ thông báo API ở local.
- [x] Chrome với hai asset form local → API/Cloud thật: tạo nhân viên QA hợp lệ HTTP 200, đóng modal; đăng nhập vẫn bị khóa khi chưa cho phép, không cấp vai trò. Đã dọn staff/Auth fixture, giữ audit.
- [x] Người dùng yêu cầu push: `a6635fed` đã lên main, Vercel deploy success. Hai asset staff khớp source; Chrome trên production xác nhận lỗi thiếu email hiện rõ/focus đúng, dấu bắt buộc mật khẩu hiển thị và không gửi yêu cầu tạo nhân viên. [Bằng chứng](docs/verification/sync/staff-create-production.txt).

**Bổ sung guest 27/10:** [OTP giả lập và chống trùng](docs/verification/sync/guest-demo-otp.md).

- [x] Phát hành production `a6fec053` lên main sau xác nhận; Vercel success và [Playwright MCP kiểm tra website chính](docs/verification/sync/guest-production-smoke.md). Giỏ đổi phân loại/reload đúng, form guest/đăng ký mở được, API guest chặn cookie thiếu. Không suy rộng thành toàn bộ E2E production.

- [x] Chuẩn bị bản hợp nhất production không xung đột trên checkout riêng; 112 test và hai Chrome PASS, 34 file runtime syntax PASS. [Chi tiết phát hành](docs/verification/sync/guest-production-release-ready.md); bước push main/kiểm tra production vẫn mở theo quy định AGENTS.

- [x] Đã push `d1aede07` lên nhánh guest; Vercel báo Preview thành công. HTTP Preview chuyển tới SSO; chưa nghiệm thu Preview/production từ lượt kiểm tra này.

- [x] Chrome thật → local API → Cloud: mỗi cặp request tạo bé/lịch/đơn trả cùng ID, DB không trùng; Admin hủy đơn QA chưa thu tiền.
- [x] Đăng ký OTP giả lập → Supabase Auth → portal/reload giữ Customer/Pet/Appointment/Order ID; một completion thành công, cookie cũ/OTP dùng lại bị chặn.
- [x] Dọn fixture/Auth chính xác, giữ audit; 86 test Node PASS, không migration/load test/polling mới.
- [x] Phát hành bản vá guest/giỏ lên Vercel qua Git main và nghiệm thu smoke đúng phạm vi ghi trong báo cáo production. E2E rộng hơn giữ các gate riêng, không tự đóng từ smoke.

**Mục tiêu:** phát hiện lỗi khi User thao tác nhưng Admin không nhận cập
nhật, hoặc Admin thao tác nhưng User không thấy cập nhật; đồng thời
tránh request/egress Supabase không cần thiết.

**Phạm vi:** Guest/Public, User Portal, Thú cưng, Dịch vụ/Lịch hẹn,
Shop/Đơn hàng, Khiếu nại/Chat, Notification, Paw Points/Voucher, Admin,
Supabase.

> Đây là kế hoạch test, không phải bằng chứng đã chạy trên môi trường
> thật. Tên bảng, enum, FK, RLS và cơ chế realtime phải xác minh với
> schema/code đang triển khai.

**Dấu hoàn thành:** `[x]` ở đầu việc con xác nhận đúng phạm vi SQL/RLS, offline hoặc UI/Auth/commit thật đã ghi bằng chứng. Ô cha `[ ]` giữ trống khi chưa kiểm tra đủ các nhánh; không đồng nghĩa các phần bên trong chưa làm. Các mục chưa chạy không đánh dấu.

### Các đợt đã thực hiện

### SLA tiếp nhận 5 phút đã cấu hình — 26/10/2026

- [x] Theo xác nhận người dùng, bật một rule `direct_request`, SLA 300 giây trên Supabase Cloud; không đặt vai trò tự phân công, ghi audit cấu hình.
- [x] Xác minh yêu cầu mới nhận deadline 5 phút; retry không kéo dài hạn. Một hội thoại tổng hợp trong transaction đã rollback sạch; cả 8 hội thoại cũ giữ nguyên revision/deadline. [Bằng chứng](docs/verification/sync/chat-sla-5min-cloud.txt).
- [x] Playwright MCP mở Admin → Chatbot → Quy định → chuyển giao: thấy “Khách yêu cầu gặp chuyên viên”, “300 giây”, “Hiệu lực”. Không thêm polling/channel/query vào ứng dụng.
- [ ] Countdown/tiếp nhận trên luồng UI mới có commit thực tế và engine tự phân công/từ khóa/cảm xúc chưa nghiệm thu đầy đủ; không coi bài rollback là UI E2E. Frontend local chưa phát hành.

### Các mục hiện chưa đóng

- [ ] Phát hành các thay đổi giao diện đồng bộ/loyalty/ticket/review/hoàn điểm/đổi gửi bù còn ở local; lần push `73f82a8d` chỉ khôi phục route Vercel.
- [ ] Hoàn tất các nhánh UI E2E còn lại: người nhận trả lời/resolve sau transfer, public page published trên dịch vụ active trong môi trường tách biệt và các phân hệ khác. UI moderation published/hidden trên dịch vụ inactive riêng, transfer/receipt/quyền compose/reload đã kiểm ở đợt 1.46.
- [ ] Hai kết nối ghi đồng thời và mất response sau commit thật; request HTTP đọc A/B đồng thời trên một kết nối SQL tuần tự chưa đóng mục DB writers.
- [ ] SLA-01 đã sửa backend bằng migration 109, rule tiếp nhận 5 phút đã bật Cloud theo người dùng (đợt 1.47); còn phát hành UI và nghiệm thu countdown toàn chuỗi/engine tự phân công.
- HOÃN — Upload ticket/quyền Storage làm sau theo yêu cầu người dùng vì chưa nối nơi lưu ảnh; không tạo bucket/policy/file input, không dùng mục này để chặn đợt chat/ticket/đánh giá/thông báo hiện tại. Gateway thanh toán thật N/A theo yêu cầu.

### UI chuyển ca và công bố sau commit — 26/10/2026

- [x] Công bố/ẩn trên dịch vụ thử inactive riêng: khách → Admin duyệt → khách cập nhật và reload đúng, DB xác nhận published/hidden. Không đưa đánh giá thử vào dịch vụ đang phục vụ. [Báo cáo](docs/verification/sync/advanced-portal-live-ui.md).
- [x] Anonymous API loại dịch vụ/review inactive, bốn lần moderation sinh bốn notice/source_event đúng chủ; không nới filter hoặc backfill dữ liệu.
- [x] UI transfer sang người nhận thử trong BrowserContext đăng nhập riêng; người nhận tự nhận cập nhật, mở ô trả lời; người cũ bị khóa ô trả lời; reload giữ đúng phân công. Khách thấy thông điệp chuyển, không thấy ghi chú nội bộ.
- [x] Sửa khóa thao tác chat theo hội thoại đến hết RPC/refresh và chỉ cho đúng người phụ trách soạn/gửi. Giữ/thả một request take thật, click lặp vẫn một request, gửi ngay sau khi ô mở lưu đúng một tin; không thêm polling/query/channel.
- [x] Ba hồi quy UI chat offline và năm test SLA PASS. Dọn khách/Auth, người nhận/quyền tạm, lịch/bé cưng, chat/review/notice và dịch vụ inactive; giữ bảy audit bất biến. [Cleanup](docs/verification/sync/advanced-portal-live-cleanup.txt).
- [ ] Người nhận gửi/resolve sau transfer; public page active published trong môi trường tách biệt. Rule SLA 5 phút đã bật theo xác nhận ở đợt 1.47; còn countdown UI toàn chuỗi.

### Hai giao diện qua Playwright MCP — 26/10/2026

- [x] Đăng nhập form thật Admin/khách A ở hai origin riêng, kết nối Supabase Cloud; khách A → B qua đăng xuất/đăng nhập thật. [Báo cáo chi tiết](docs/verification/sync/two-portal-live-ui.md).
- [x] Ticket: tạo từ form khách → Admin tự nhận, ghi chú nội bộ không lộ, phản hồi hai chiều, giải quyết bằng giải thích, reload hai cổng giữ trạng thái/nội dung đúng.
- [x] Review riêng tư: khách gửi chờ duyệt → Admin ẩn → khách tự cập nhật, reload giữ “Đã ẩn”; chuông đúng chủ lịch, không lộ lý do riêng.
- [x] Chat: khách yêu cầu chuyên viên → Admin tiếp nhận/trả lời → khách phản hồi → Admin hoàn tất; hai cổng nhận cập nhật và reload giữ lịch sử, một tin staff. Ghi nhận một 409 khi gửi quá sát lúc nhận ca, bản nháp giữ và retry thành công; chưa đánh PASS gửi liên tục.
- [x] Khách B không mở được ticket/lịch A qua deep link, không lộ review/chat A; badge 0. Ba notice có source_event khác nhau, không notice cho B.
- [x] Sửa hai lỗi UI và kiểm lại trực tiếp: modal thông báo đóng khi mở nội dung liên quan; nút gửi ticket chỉ bật sau initializer sẵn sàng. Hồi quy header/scheduler 18 PASS, không thêm query/channel/polling.
- [x] Dọn fixture hai khách/Auth, ticket/chat/review/lịch/bé cưng/thông báo; giữ bảy audit bất biến. [Bằng chứng cleanup](docs/verification/sync/two-portal-live-cleanup.txt).
- [x] Bổ sung UI moderation published/hidden sau commit và chuyển nhân viên/receipt/reload ở đợt 1.46, theo đúng giới hạn fixture riêng.
- [ ] Engine/SLA theo rule thật và các nhánh E2E còn ghi ở đầu tài liệu; frontend local chưa phát hành. Không đóng toàn bộ hệ thống chỉ từ đợt này.

### Chuyển chat qua Auth/gateway/commit/Realtime thật — 26/10/2026

- [x] 8 kiểm tra/47 request HTTP PASS: khách đăng nhập thật gọi API Vercel open/yêu cầu nhân viên, retry một hội thoại/message; Admin nhận ca và chuyển cho nhân viên đủ quyền bằng hai request chồng thời gian; người nhận nhận Realtime và đọc phân công mới.
- [x] Nhân viên chưa được phân công không trả lời được, nhân viên cũ mất quyền trả lời sau chuyển; gateway khách không lộ ghi chú nội bộ/raw fields, đọc cùng revision trả notModified. [Bằng chứng](docs/verification/sync/chat-and-reviews.md).
- [x] Dọn toàn bộ hội thoại/messages, khách/Auth và nhân viên/quyền tạm; giữ hai audit bất biến của QA Admin. Không cấp Admin cho nhân viên thử, gọi AI, Logs hay stress test.
- [x] UI transfer/receipt/quyền compose/reload đã xác minh trong context người nhận riêng ở đợt 1.46.
- [ ] Người nhận trả lời/resolve sau transfer qua Auth thật; hiện hai nhánh này chỉ có SQL rollback. Không đánh dấu toàn chuỗi hoàn tất.

### Thông báo ticket và kiểm duyệt dịch vụ — 26/10/2026

- [x] Phát hiện NOTIFY-01/P1: phản hồi/trạng thái ticket và kiểm duyệt review chưa tự tạo notification chuông; message hệ thống trong ticket không phải notification.
- [x] Chuẩn bị migration 110: public staff reply/trạng thái ticket và review status tạo notice đúng owner, không gửi ghi chú nội bộ/lý do kiểm duyệt riêng tư; khóa source_event chống trùng, không backfill notice cũ.
- [x] 14 kiểm tra Cloud/111 SQL rollback PASS: retry/no-op không trùng, owner A/B, read acknowledgement, public/private và review pending/công bố/ẩn. [Bằng chứng](docs/verification/sync/customer-event-notifications.md).
- [x] Áp dụng migration 110 lên Cloud; xác minh ba trigger/chỉ mục chống trùng/helper private, không backfill hoặc sửa thông báo cũ. [Bằng chứng](docs/verification/sync/customer-event-notifications-apply.txt).
- [x] Ticket Auth/commit/Realtime thật: 11 kiểm tra/54 request HTTP PASS; A nhận public reply và trạng thái, B không đọc/nhận được, nội bộ không lộ, retry không trùng, đánh dấu đọc giữ qua client mới. Dọn fixture, giữ ba audit bất biến. [Kết quả](docs/verification/sync/ticket-notifications-auth-realtime.txt).
- [x] Review riêng tư Auth/commit/Realtime thật: 8 kiểm tra/55 request HTTP PASS; pending → hidden → rejected, retry/revision/owner và thông báo đúng chủ lịch; không công bố review thử nghiệm. Dọn fixture, giữ hai audit bất biến. [Kết quả](docs/verification/sync/review-notifications-auth-realtime.txt).
- [x] Bổ sung UI thật/reload cho ticket và review chờ duyệt→ẩn, thông báo/deep link đúng chủ; xem đợt Playwright MCP 1.45.
- [x] Công bố/ẩn sau commit bằng UI trên dịch vụ inactive riêng; khách nhận và reload đúng. Public API loại nội dung inactive theo thiết kế, xem đợt 1.46.
- [ ] Public page hiển thị published trên dịch vụ active trong môi trường tách biệt và các nhánh toàn chuỗi khác. Upload/Storage hoãn theo yêu cầu.

### SLA theo rule — 26/10/2026

- [x] Tái hiện SLA-01/P1: rule đang bật nhưng `set_public_chat_mode` không đặt deadline. Đọc Cloud thấy rule thực tế đang rỗng; không tự chèn cấu hình thật.
- [x] Chuẩn bị migration 109 cho yêu cầu nhân viên trực tiếp: rule active `direct_request`, lấy SLA ngắn nhất, 0 giây là tức thì, không có rule thì NULL. Retry/followup không kéo dài hạn, sửa rule không đổi lượt cũ; quay về bot xóa hạn cũ.
- [x] 13 kiểm tra Cloud/84 SQL rollback và 5 test hiển thị SLA PASS; xác minh sạch fixture/DDL, không sửa rule/hội thoại thật. Sửa local bảng rule hiển thị đúng `0 giây`. [Bằng chứng](docs/verification/sync/chat-sla.md).
- [x] Hồi quy offline 14 bài Chrome/87 test Node cùng Copilot/loyalty service PASS; không Logs/stress test, không thêm query trình duyệt/channel/polling.
- [x] Áp dụng migration 109 lên Supabase Cloud ngày 26/10/2026; xác minh trigger, rule direct_request và quyền private helper/gateway. Không sửa hội thoại/rule hiện có hoặc chèn deadline mặc định. [Bằng chứng áp dụng](docs/verification/sync/chat-sla-cloud-apply.txt).
- [x] Cấu hình rule tiếp nhận thật 5 phút theo người dùng, xác minh backend và màn hình rule Admin ở đợt 1.47.
- [ ] Phát hành UI và nghiệm thu countdown/từ khóa/cảm xúc/phân công tự động đầy đủ hai portal.

### Sửa 404 trên Vercel — 26/10/2026

- [x] Xác minh production: `/` 200, `/services`/`admin`/`user` 404; file HTML trực tiếp và API function vẫn 200. Thiếu `vercel.json` sau commit `0ef89a39`.
- [x] Khôi phục cấu hình route local, 4 kiểm tra PASS; 61 file đích đều có trong HEAD, có thể phát hành riêng bản sửa này. [Chi tiết](docs/maintenance/2026-10-26-vercel-routing-404.md).
- [x] Đã push riêng commit `73f82a8d` lên `origin/main` theo yêu cầu; Vercel báo success. Production `/`, `/services`, `/shop`, `/admin`, `/admin/login`, `/user`, `/booking`, `/service-detail` và asset kiểm tra đều 200; GET API Auth trả 405 đúng phương thức, không còn 404. [Bằng chứng HTTP](docs/maintenance/vercel-routing-live-2026-10-26.txt). Đây là kiểm tra route, không thay nghiệm thu nghiệp vụ hai portal. Các thay đổi đồng bộ khác vẫn ở local.

### Phạm vi chốt theo yêu cầu người dùng

- [x] Chat handoff/transfer/reply/resolve:13 kiểm tra Cloud/89 SQL statements PASS, một hội thoại tổng hợp đã rollback sạch;4 test handler API mock PASS cho token/owner/projection30 tin. [Bằng chứng](docs/verification/sync/chat-and-reviews.md).
- [x] Đánh giá dịch vụ:10 kiểm tra Cloud/97 SQL statements PASS cho pending/retry/owner, phản hồi Admin và lọc public published/hidden. Fixture rollback sạch; không đăng review thật.
- [x] Đã triển khai Admin xử lý công bố/chờ duyệt/ẩn/không duyệt cùng lý do bắt buộc trong modal review; revision/retry/owner được kiểm tra. Migration106 đã áp dụng Cloud sau xác nhận riêng, UI local bật mặc định; không sửa/xóa review cũ. 14 kiểm tra Cloud rollback/129 SQL statements và Chrome modal PASS. [Bằng chứng](docs/verification/sync/chat-and-reviews.md).
- [x] Hồi quy gộp mở rộng12 bài Chrome,79 test Node cùng Copilot/service PASS; không Logs/stress-test. Frontend mới chưa push/deploy.
- [ ] Full UI E2E hai portal và cấu hình SLA thật vẫn chưa đóng. Đã bổ sung Auth/gateway/commit/Realtime cho chuyển chat, ticket và review riêng tư ở đầu tài liệu; các bài này chưa thay đủ thao tác UI/reload/công bố.

- [x] Ticket/messages phân trang: migration105 đã áp dụng Cloud sau xác nhận riêng; giữ RPC cũ, không sửa/xóa ticket. 14 kiểm tra/126 SQL statements transaction rollback PASS; Chrome 10/10/3 ticket, 20/3 message, count toàn owner và deep link ngoài trang PASS. Frontend bật mặc định local; chưa push/deploy. [Bằng chứng](docs/verification/sync/support.md).
- [x] Hồi quy gộp mở rộng 11 bài Chrome, 75 test Node và hai nhóm service; không gọi fixture Cloud từ batch. Migration104 và105 đều được đối chiếu metadata tồn tại trên Cloud.

- [x] Chuẩn bị migration104 phân trang loyalty: 14 kiểm tra/113 SQL statements transaction rollback PASS, Chrome history 10/2 và wallet/catalog 6/1 PASS; điểm vẫn tính toàn ledger. Không đổi dữ liệu thật.
- [x] Sau xác nhận cụ thể, đã áp dụng migration104 Cloud và xác minh metadata RPC mới/cũ cùng tồn tại; không sửa/xóa ledger hoặc voucher. Bật phân trang mặc định trong mã local, Chrome + 7 test Node + service PASS. Frontend mới chưa push/deploy, chưa nghiệm thu Auth/Realtime E2E. [Bằng chứng](docs/verification/sync/loyalty.md).

- [x] Chuẩn bị migration 103 RPC phân trang thông báo additive: 9 kiểm tra/61 SQL statements trong transaction rollback PASS; Chrome 23 dòng/3 trang và lọc unread PASS, 18 test header/scheduler PASS.
- [x] Sau xác nhận người dùng, đã áp dụng migration 103 trên Cloud và đọc metadata xác minh cả RPC phân trang/RPC cũ tồn tại. Bật mặc định phân trang trong header local; Chrome + 18 test Node PASS. Không sửa/xóa notification hoặc dùng Logs. Website đã deploy chưa nhận code frontend mới vì chưa push/deploy; chưa nghiệm thu Auth/Realtime E2E. [Bằng chứng](docs/verification/sync/notifications.md).

- [x] Hồi quy gộp `node scripts/test/sync_offline_batch.cjs`: 9 bài Chrome offline, 75 test Node, Copilot business và loyalty service PASS; báo cáo [offline-batch.txt](docs/verification/sync/offline-batch.txt). Không gọi fixture Cloud, Logs hoặc deploy. Inbox 10 dòng/trang, cache và invalidation theo conversation PASS; sửa SLA deadline không hợp lệ tránh NaN, 3 test SLA PASS.
- [ ] Các hạng mục vẫn cần nghiệm thu: hoàn điểm và đổi/gửi bù hai portal; đầy đủ thao tác UI/Auth/commit/Realtime/reload; moderation/handoff. Ticket/review đã có kiểm thử SDK Auth/commit/Realtime ghi riêng ở đầu tài liệu. Upload/Storage HOÃN theo yêu cầu, không đánh PASS và không chặn đợt hiện tại. Phân trang server thông báo/loyalty/ticket đã có RPC mới, frontend mới vẫn ở local; chưa khẳng định tổng egress production tối ưu hoàn toàn. Không dùng batch offline để đóng E2E.

- [x] Retry phản hồi ticket sau nạp lại helper: journal session theo owner/ticket/SHA-256 nội dung giữ đúng ID, ack đúng mới xóa; không lưu content/token. Chrome offline PASS lỗi → nạp lại helper → retry cùng ID và lần gửi mới có ID mới. Chưa kiểm tra reload toàn portal/commit thật.

- [x] Retry đánh giá dịch vụ qua reload: giữ UUID theo owner/booking/line trong sessionStorage trước gửi; xác nhận đúng IDs mới xóa. Chrome offline PASS sau lỗi → reload → nhập lại → retry cùng ID. Không lưu content/token, không gọi Cloud. Chưa nghiệm thu mất response sau commit thật.

- N/A — Gateway thanh toán/hoàn tiền thật không áp dụng. Không dùng các ghi chú “chưa test gateway” bên dưới làm điều kiện chặn nghiệm thu; vẫn kiểm tra thu/hoàn tiền thủ công và quyền, số dư, retry tương ứng.
- Các phần còn lại được gom thành một đợt xử lý tiếp; chỉ đánh `[x]` khi có bằng chứng. Full UI E2E, giới hạn payload, ledger hoàn điểm, đổi/gửi bù, handoff/SLA, retry reload và moderation cần hoàn thành hoặc ghi rõ giới hạn thực tế. Upload/Storage hoãn.

- [x] Gửi đánh giá dịch vụ Chrome offline PASS: lỗi ghi giữ draft, retry cùng ID, double-click không gửi trùng, ack thành công hiển thị review và đổi tài khoản khi đang gửi không dựng lại giao diện cũ. Thêm khóa disabled trong handler; không gọi Cloud. Chưa kiểm tra reload giữ ID, moderation/publication hoặc HTTP/Auth thật.

- [x] Chrome offline bổ sung hotel/taxi và đánh giá đã lưu: thông tin/giờ Việt Nam và HTML an toàn PASS. Sửa thiếu định nghĩa escapeHtml khiến lịch có dòng dịch vụ lỗi render. Chưa kiểm tra submit đánh giá hoặc Auth/Cloud thật. [Bằng chứng lịch](docs/verification/sync/bookings.md).

- [x] Bổ sung Chrome offline lịch hợp lệ: mã/dịch vụ/giờ UTC+7 hiển thị, tải execution và chỉ một channel; response logistics/execution chậm sau đổi phiên không render hoặc tạo lại channel. 8 test Node lịch/giờ vẫn PASS; không gọi Cloud. Còn hotel/taxi/review đầy đủ và hai portal/Auth/Realtime thật.

- [x] Chi tiết lịch User: thêm dispose/guard tài khoản và vòng đời xuyên các lượt đọc, dọn auth/storage/channel; chặn tải cũ sau đổi phiên/rời trang và phản hồi đánh giá từ phiên cũ. Chrome offline PASS cho ID không khớp và response chậm sau đổi tài khoản/dispose; không gọi Cloud. Chưa kiểm tra đầy đủ màn hình lịch hợp lệ hoặc Auth/RLS/HTTP thật. [Bằng chứng](docs/verification/sync/bookings.md).

- [x] Chi tiết đơn User: thêm guard owner/lifecycle, dọn dữ liệu/dialog/channel khi đổi phiên; request chậm sau dispose không dựng lại subscription. Chrome offline với HTML/module thật PASS; regression danh sách đơn PASS. Không gọi Cloud; còn chi tiết lịch và quyền trang đích qua HTTP/Auth thật. [Bằng chứng](docs/verification/sync/orders.md).

- [x] Danh sách đơn User: sửa chốt tài khoản/version trước và sau query; đổi auth/storage xóa đơn và thống kê cũ, dọn channel/listener; init lại không giữ handler cũ. Chrome offline với HTML/module thật PASS cho response chậm/đổi tài khoản/dispose. Không gọi Cloud, chưa thay nghiệm thu HTTP/Auth/Realtime thật. [Bằng chứng](docs/verification/sync/orders.md).

- [x] Sửa khởi động 26/10: thêm `npm start`, khôi phục `server.js` cho web trên máy, giữ Supabase Cloud. Smoke HTTP offline tại PORT cấu hình 4000: `/`, `/shop`, `/services`, `/user`, `/admin` và helper `.mjs` trả 200; `/.env` trả 404. Không gọi nghiệp vụ Cloud hoặc nghiệm thu đăng nhập/E2E từ smoke này. Windows có thể dùng `npm.cmd start` nếu PowerShell chặn `npm.ps1`.

- [x] Hồ sơ: hoàn tất đợt kiểm tra RPC/RLS và offline — [bằng chứng](docs/verification/sync/README.md).
- [x] Thú cưng: hoàn tất đợt kiểm tra RPC/RLS, service và form offline — [bằng chứng](docs/verification/sync/pets.md).
- [x] Lịch hẹn: hoàn tất đợt kiểm tra RPC/RLS, sửa múi giờ và regression offline — [bằng chứng](docs/verification/sync/bookings.md).
- [x] Đơn hàng: hoàn tất đợt kiểm tra RPC/RLS COD và khôi phục checkout offline — [bằng chứng](docs/verification/sync/orders.md).
- [x] Hỗ trợ khách hàng: hoàn tất đợt RPC/RLS, API và đồng bộ offline — [bằng chứng](docs/verification/sync/support.md).
- [x] Dọn dữ liệu: fixture của năm đợt đã hoàn tác và xác minh không còn.
- [ ] Nghiệm thu đầy đủ hai portal đăng nhập thật, HTTP/Auth, commit và reload.
- [ ] Kiểm tra sâu đổi trả/hoàn tiền, notification, voucher và các phần ticket chưa chạy.

### Tiến độ đợt hồ sơ — 25/10/2026

Đã chọn kiểm tra mã local và RPC/RLS Cloud bằng fixture tổng hợp trong transaction luôn hoàn tác. **Chưa push/deploy, chưa nghiệm thu toàn hệ thống.** Bằng chứng, phạm vi, bug và cách tái hiện: [docs/verification/sync/README.md](docs/verification/sync/README.md).

- **PASS ở lớp kiểm tra:** 11 assertion RPC/RLS Cloud; kiểm tra browser offline về polling, sự kiện, giới hạn query, timezone và đổi tài khoản; 10 test regression hồ sơ/auth offline.
- **Đã sửa local:** bỏ polling lịch/đơn mỗi 10 giây; chỉ refresh phần thay đổi; đọc view số dư thay toàn bộ lịch sử điểm; sửa UUID và trạng thái lịch; dọn listener/channel, chặn response A vào B.
- **Dữ liệu:** hai customer A/B và một staff tổng hợp trong transaction; đã rollback và xác minh không còn fixture. Không sửa khách thật, không dùng Supabase Logs, không stress-test.
- **Chưa chạy đầy đủ:** UI → HTTP API → DB commit → UI phía còn lại → reload/login lại. Vì vậy các ô E2E tương ứng bên dưới chưa đánh PASS; không dùng kết quả SQL/offline để thay nghiệm thu hai màn hình.

| Test ID liên quan | Trạng thái case đầy đủ | Bằng chứng hiện có / phần còn thiếu |
|---|---|---|
| SYNC-00-01/02/03 | RETEST | Mã local và Cloud được phân biệt; actor SQL tổng hợp, chưa đăng nhập thật hai portal |
| SYNC-00-04/07 | RETEST | Browser offline 60 giây đồng hồ giả lập không read nền; chưa baseline Network hai màn hình thật |
| SYNC-00-05/06 | RETEST | Đã đối chiếu RPC/schema/publication hồ sơ; chưa mọi phân hệ và delivery Realtime thật |
| SYNC-00-08 | RETEST | Cleanup transaction fixture hồ sơ PASS; chưa quy trình cleanup E2E đã commit |
| SYNC-01-02/03/04 | RETEST | RPC User → Admin và Admin → User PASS; thiếu UI/API/commit/reload toàn chuỗi |
| SYNC-01-06/07 | RETEST | B không đọc/sửa hồ sơ A trong SQL/RLS; chưa URL/HTTP phiên đăng nhập thật |
| SYNC-01-09, SYNC-09-08 | RETEST | Response lịch A chậm không vào B, cache/channel có guard; chưa mọi tài nguyên |
| SYNC-03-11 | RETEST | Browser lịch hồ sơ hiển thị đúng UTC+7 qua nửa đêm; chưa đối chiếu UI Admin cùng lịch |
| SYNC-07-01 | RETEST | User đọc được view số dư có giới hạn; chưa đối chiếu UI Admin và ledger có giao dịch |
| SYNC-09-03/06 | RETEST | SQL chặn tên rỗng/revision cũ/quyền sai; chưa mọi form và lỗi HTTP |
| SYNC-09-07, SYNC-11-04/05/07 | RETEST | Hồ sơ offline dọn watcher, không polling, gom sự kiện, scope theo customer; chưa toàn hệ thống |
| SYNC-10-01/02/03/06 | RETEST | RPC/RLS hồ sơ A/B/Guest đã test; chưa tất cả bảng và Auth/HTTP thật |
| SYNC-11-03/06/09/10 | RETEST | Hồ sơ chỉ đọc phần thay đổi, view số dư và không retry loop; chưa Network/egress toàn hệ thống |
| Các case còn lại ngoài các đợt ghi riêng | NOT RUN | Chưa có bằng chứng chạy đầy đủ |

**Việc tiếp theo:** hoàn thiện runtime kiểm thử local và actor đăng nhập thật, chạy smoke hồ sơ đủ chuỗi trước; sau đó từng luồng thú cưng → lịch hẹn → đơn → ticket → notification/điểm. Mỗi luồng chỉ tạo một record và đối chiếu theo ID. Gate GĐ-00 chưa đóng cho luồng ghi E2E đã commit.

### Tiến độ đợt thú cưng — 25/10/2026

Bằng chứng chi tiết: [docs/verification/sync/pets.md](docs/verification/sync/pets.md).

- **PASS SQL/RLS:** 13 assertion tạo/sửa hai chiều, owner A do server xác định, retry cùng ID không trùng, quan hệ customer/pet, validation/version, lưu trữ/khôi phục và cách ly B/Guest. Một pet fixture, mọi thay đổi đã rollback và kiểm tra không còn dữ liệu test.
- **PASS offline:** 12 test service và bài Chrome dùng form thật: double-submit, giữ draft sau lỗi, retry cùng ID, giữ safety note, chặn đổi actor, giảm query thừa và giới hạn 3 lịch sử cân nặng gần nhất/pet.
- **Đã sửa local:** `petService.js`, `pets.js`; không đổi schema/RPC/policy hoặc modal Admin. Chưa push/deploy.
- **Băng thông:** không Logs/stress-test/polling mới; browser và SDK regression dùng fetch giả. Chỉ một lần đọc metadata và một lượt fixture Cloud trong đợt này; chưa đo tổng egress.

| Test ID liên quan | Trạng thái case đầy đủ | Bằng chứng hiện có / phần còn thiếu |
|---|---|---|
| SYNC-02-01/02/03/06 | RETEST | Tạo/sửa User ↔ Admin PASS RPC/RLS; còn đủ chuỗi HTTP/UI/commit/reload |
| SYNC-02-05 | RETEST | SQL chặn cân nặng không hợp lệ; form/service có validation và test offline; chưa đủ mọi trường qua HTTP |
| SYNC-02-07 | RETEST | Server không tin customer_id client; B bị chặn; RPC admin theo khách chặn quan hệ sai; chưa staff ngoài scope và mọi đường đổi chủ |
| SYNC-02-08 | RETEST | Lưu trữ/khôi phục RPC giữ pet và owner; còn UI hai phía và lịch sử đặt lịch liên quan |
| SYNC-02-04/09 | NOT RUN | Chưa upload ảnh thật hoặc reload hai portal sau commit |
| SYNC-09-02/04/08 | RETEST | Lỗi/retry/đổi actor PASS offline, cùng ID không tạo pet thứ hai ở SQL; chưa mất response HTTP thật |
| SYNC-11-02/03/06/07 | RETEST | Khóa lưu sớm, bỏ query createdAt thừa, giới hạn nested history, bind save một lần; chưa đo Network toàn màn hình |

**Tiếp theo:** kiểm tra luồng lịch hẹn ở lớp RPC và caller trước, tiếp tục dùng fixture ít và truy vấn theo ID. Full E2E vẫn chưa nghiệm thu; không đánh PASS các checkbox toàn chuỗi từ kết quả từng lớp.

### Tiến độ đợt lịch hẹn — 26/10/2026

Bằng chứng chi tiết: [docs/verification/sync/bookings.md](docs/verification/sync/bookings.md).

- **PASS SQL/RLS:** 13 assertion trên một lịch Spa tổng hợp: quote/giá, tạo và retry, Admin xác nhận/hủy, User đổi/hủy và retry, cách ly B/Guest. Fixture và mọi thay đổi đã hoàn tác, kiểm tra không còn bản ghi test.
- **Đã sửa local — SYNC-BKG-B01:** thời gian đặt/đổi lịch trước đây có thể bị hiểu theo múi giờ máy. Chuyển input/slot về giờ Việt Nam, giữ mapping ngày/giờ giữa danh sách và chi tiết, dùng timestamp DB cho cửa sổ thao tác.
- **PASS offline:** 14 test Node và browser UTC/Los Angeles/Tokyo. Cùng giờ nhập Việt Nam cho cùng instant UTC ở form Spa/hotel/taxi và đổi lịch. Không phát sinh truy vấn Cloud từ regression browser/Node.
- **Băng thông:** không Logs hoặc stress-test; chỉ một lịch trong transaction; không quét slot cả ngày hoặc tạo nhiều lịch lấp công suất. Lần chạy thành công có 112 SQL statements, không phải số request của portal. Chưa đo egress/p95.
- **Triển khai:** không đổi RPC/schema/policy; code còn local, chưa push/deploy. Full E2E hai portal và Realtime thật chưa nghiệm thu.

| Test ID liên quan | Trạng thái case đầy đủ | Bằng chứng hiện có / phần còn thiếu |
|---|---|---|
| SYNC-03-01/02/03/04 | RETEST | Tạo lịch/quote/owner/giá/retry PASS RPC/RLS; còn UI → HTTP → commit → Admin/reload |
| SYNC-03-05 | RETEST | Chặn thời gian quá khứ/nhân viên ưu tiên không hợp lệ ở server; chưa cạnh tranh slot hoặc công suất đầy |
| SYNC-03-06/08 | RETEST | User đọc được Admin xác nhận/hủy ở DB; còn hai UI, thông báo và persistence sau commit |
| SYNC-03-07 | NOT RUN | Chưa kiểm thử Admin đổi lịch; User đổi lịch được kiểm chứng riêng ở dòng sau |
| SYNC-03-09 | RETEST | User đổi cùng lịch sang pending để Admin duyệt lại; User hủy đủ điều kiện được áp dụng trực tiếp; chưa UI và yêu cầu duyệt riêng nếu có |
| SYNC-03-10/12 | NOT RUN | Chưa đủ chuỗi đang thực hiện/hoàn thành hoặc notification sau commit |
| SYNC-03-11 | RETEST | Parser/mapping/form/preview PASS offline trong 3 múi giờ; còn đối chiếu giờ trên UI Admin cùng fixture |
| SYNC-09-02/03/06 | RETEST | Retry cùng request không trùng, quote sai/phiên bản cũ và quyền sai bị chặn ở SQL; chưa mất response HTTP thật |
| SYNC-10-02/03/04/06 | RETEST | B/Guest bị chặn; User không gọi được RPC đổi trạng thái của Admin; chưa toàn bộ endpoint và Auth thật |

**Tiếp theo:** kiểm tra đơn hàng/checkout theo cùng nguyên tắc fixture ít, rollback và truy vấn theo ID. Các case full E2E vẫn giữ RETEST/NOT RUN; chưa đủ điều kiện đóng Gate hoặc phát hành toàn hệ thống.

### Tiến độ đợt đơn hàng và checkout — 26/10/2026

Bằng chứng: [docs/verification/sync/orders.md](docs/verification/sync/orders.md).

- [x] **SQL/RLS — 13 assertion:** giá/phí do server tính, chặn vượt tồn, tạo/retry không trùng order/payment, xác nhận, hủy hai chiều, giao/hoàn tất, xuất kho một lần và cách ly B/Guest.
- [x] **Fixture đã dọn:** một đơn COD và SKU/config/actor tổng hợp trong transaction; rollback và xác minh không còn; không thu tiền hoặc giao hàng bên ngoài.
- [x] **Sửa local:** giữ request ID theo customer qua reload; tra đơn cũ trước tạo lại; kiểm tra đúng acknowledgement; tách lỗi giỏ sau commit khỏi lỗi tạo đơn, chặn đổi actor.
- [x] **Offline:** 30 test Node giỏ/checkout và bài Chrome về double-click, mất phản hồi + reload, khôi phục ID, lỗi giỏ, ack sai và đổi tài khoản.
- [x] **Băng thông:** không Logs/polling/retry vô hạn/stress-test; recovery đọc đúng một ID/customer, chỉ khi đã có yêu cầu được gửi; các regression không gọi Cloud.
- [ ] **E2E đầy đủ:** hai portal, HTTP/Auth thật, commit/reload, Realtime/notification và hoàn tiền chưa nghiệm thu. Không push/deploy.

| Test ID liên quan | Trạng thái case đầy đủ | Bằng chứng hiện có / phần còn thiếu |
|---|---|---|
| SYNC-04-01/02/06/07/09 | RETEST | RPC/RLS COD tạo/xác nhận/hủy/giao/hoàn tất, giá/tồn/owner đã kiểm tra; còn hai UI, HTTP và persistence sau commit |
| SYNC-04-03/04/05 | RETEST | RPC retry không trùng; browser offline giữ ID qua reload, recovery trước quote và ack sai không xóa giỏ; còn mất response HTTP thật |
| SYNC-04-08 | RETEST | User hủy trực tiếp theo điều kiện RPC hiện hành; chưa luồng yêu cầu duyệt riêng nếu có |
| SYNC-04-10/11/12/13/14 | NOT RUN | Chưa đủ đổi trả/hoàn tiền thực tế, KPI và notification theo đơn |
| SYNC-09-02/04/08 | RETEST | Offline phục hồi đơn đã commit giả lập, không replay dọn giỏ chưa rõ kết quả; actor đổi lúc quote không tạo đơn; còn phiên thật |
| SYNC-10-02/03/04/06 | RETEST | B/Guest bị chặn và không gọi được RPC fulfillment Admin; chưa tất cả HTTP endpoint |

**Tiếp theo:** kiểm tra hỗ trợ/ticket và notification theo từng luồng nhỏ. Giữ nguyên nguyên tắc không làm quá tải Supabase và không đánh dấu hoàn tất các bước E2E chưa chạy.

## 0. Quy tắc ghi nhận

Trạng thái: `NOT RUN` / `PASS` / `FAIL` / `BLOCKED` / `RETEST` / `N/A`.

-   Chỉ đánh PASS khi đã chạy trên đúng môi trường và có bằng chứng.
    Toast thành công hoặc đọc code chưa đủ.
-   Mỗi luồng ghi phải xác minh: UI → request/response → DB record → màn
    hình phía còn lại → persistence sau reload có chủ đích.
-   Dùng tài khoản test User A, User B, Guest và Admin; không thao tác
    dữ liệu khách thật.
-   Gắn mã dễ tìm cho dữ liệu test, ví dụ `E2E-251025-A01`; lưu record
    ID để đối chiếu và dọn sau test.
-   Không ghi access token, OTP, secret hoặc dữ liệu cá nhân vào
    ảnh/log.

Thông tin mỗi lần chạy: ngày giờ, environment/URL, commit SHA hoặc ZIP
version, người test, browser, actor, Test ID, record ID, kết quả, Bug
ID, evidence (screenshot, Console, Network, DB read-only).

## 1. Giới hạn tải mạng --- bắt buộc

-   Chạy tuần tự, từng phân hệ; không chạy stress/load test trên project
    có quota hạn chế.
-   Mỗi case chỉ tạo 1 record, trừ case chống trùng; không tạo hàng loạt
    đơn, lịch, tin nhắn hay notification.
-   Chỉ giữ một tab User và một tab Admin trong bài test đồng bộ; không
    mở nhiều tab Admin tự refresh.
-   Không F5 liên tục: chỉ reload tại bước kiểm tra persistence.
-   Không SELECT toàn bảng/export dữ liệu lớn. Đối chiếu theo ID test và
    chỉ đọc các cột cần thiết.
-   Không tăng polling frequency hoặc bật Realtime hàng loạt để test.
    Xác minh cơ chế đang có (Realtime, polling, refresh thủ công).
-   Khi thấy request lặp, response quá lớn, retry liên tục hoặc egress
    tăng nhanh: dừng nhánh test, lưu Network log rồi điều tra; không bấm
    lại liên tục.
-   Ghi baseline Network khi mở màn hình và khi không thao tác trong 60
    giây; so sánh số request trước/sau một thao tác.
-   Một thao tác ghi không nên tạo nhiều insert/update giống nhau; một
    lỗi không được tạo retry vô hạn.
-   Dùng file ảnh test nhỏ, chỉ upload một lần.

## 2. GĐ-00 --- Chuẩn bị / baseline

-   [ ] **SYNC-00-01 \| P0** Xác nhận URL/environment, commit/ZIP
    version đang chạy; không trộn code local và staging.
-   [ ] **SYNC-00-02 \| P0** Xác nhận User A, User B, Guest và Admin là
    tài khoản test có quyền đúng.
-   [ ] **SYNC-00-03 \| P1** Mở một tab User A và một tab Admin; ghi
    thời điểm bắt đầu.
-   [ ] **SYNC-00-04 \| P1** Ghi request nền trong 60 giây khi không
    thao tác; phát hiện polling lặp bất thường.
-   [ ] **SYNC-00-05 \| P0** Xác định cơ chế đồng bộ thực tế; không giả
    định có realtime nếu chưa chứng minh.
-   [ ] **SYNC-00-06 \| P0** Xác định API/bảng nguồn cho từng nghiệp vụ;
    kiểm tra schema, enum, FK và RLS hiện hành.
-   [ ] **SYNC-00-07 \| P1** Ghi số request khi mở một danh sách và kích
    thước response nếu DevTools hỗ trợ.
-   [ ] **SYNC-00-08 \| P0** Xác nhận có cách truy vết record test và
    dọn dữ liệu test an toàn.

**Gate:** Chưa bắt đầu luồng ghi nếu sai môi trường, sai role hoặc chưa
biết cách đối chiếu record.

## 3. GĐ-01 --- Tài khoản, hồ sơ và cách ly dữ liệu

-   [ ] **SYNC-01-01 \| P0** User A đăng nhập; header/profile hiển thị
    đúng A.
-   [ ] **SYNC-01-02 \| P0** User A sửa một trường hồ sơ được phép; lưu,
    mở lại vẫn thấy dữ liệu mới.
    - [x] SQL: RPC lưu trả snapshot mới của đúng A; validation và revision cũ bị chặn.
-   [ ] **SYNC-01-03 \| P0** Admin mở hồ sơ A và thấy dữ liệu vừa sửa.
    - [x] SQL/RLS: actor Admin đọc đúng tên A vừa sửa, truy vấn theo ID test.
-   [ ] **SYNC-01-04 \| P0** Admin sửa một trường được phép; User A thấy
    thay đổi sau khi đọc lại.
    - [x] SQL/RLS: Admin sửa qua RPC; snapshot của A đọc lại đúng giá trị.
-   [ ] **SYNC-01-05 \| P0** User A logout/login lại; dữ liệu vẫn bền
    vững và thuộc A.
-   [ ] **SYNC-01-06 \| P0** Đăng nhập User B; không thấy hồ sơ hoặc dữ
    liệu riêng của A.
-   [ ] **SYNC-01-07 \| P0** B mở URL/ID bản ghi của A; API/RLS từ chối
    hoặc không trả dữ liệu.
    - [x] SQL/RLS: B không đọc/sửa hồ sơ A bằng ID; Guest không gọi được snapshot riêng.
-   [ ] **SYNC-01-08 \| P1** Hai tab cùng tài khoản: sửa ở tab 1, đọc
    lại tab 2; không hiển thị mâu thuẫn kéo dài.
-   [ ] **SYNC-01-09 \| P0** Đổi tài khoản A → B trên cùng trình duyệt;
    cache/localStorage không làm lộ dữ liệu hoặc notification của A.
    - [x] Browser offline hồ sơ: response lịch A trả chậm không ghi vào màn hình B; channel A được dọn.
-   [ ] **SYNC-01-10 \| P1** Lỗi mạng/token hết hạn khi lưu hồ sơ: không
    báo thành công giả, không ghi nhầm vào phiên khác.

## 4. GĐ-02 --- Thú cưng User ↔ Admin

-   [ ] **SYNC-02-01 \| P0** User A tạo một thú cưng test; lưu đúng một
    record.
    - [x] SQL/RLS: tạo một pet, owner do server lấy từ A; retry cùng ID không tạo pet thứ hai.
-   [ ] **SYNC-02-02 \| P0** Admin thấy đúng thú cưng, chủ sở hữu và
    trường dữ liệu.
    - [x] SQL/RLS: Admin đọc đúng pet, owner và safety/allergy/routine riêng biệt.
-   [ ] **SYNC-02-03 \| P0** User sửa một trường; Admin thấy giá trị
    mới, không tạo bản ghi thứ hai.
    - [x] SQL/RLS: User sửa tên, Admin đọc đúng trên cùng pet ID.
    - [x] Browser offline: double-submit chỉ một read/write; lỗi giữ draft, retry tạo mới giữ cùng ID.
-   [ ] **SYNC-02-04 \| P1** User cập nhật một ảnh nhỏ; Admin xem đúng
    ảnh hoặc thấy lỗi tải rõ ràng.
-   [ ] **SYNC-02-05 \| P0** Thiếu trường bắt buộc/giá trị không hợp lệ:
    bị chặn, không có record nửa vời.
    - [x] SQL/service: cân nặng không hợp lệ, breed không biết và phiên bản cũ bị chặn; không fallback dữ liệu giả.
-   [ ] **SYNC-02-06 \| P0** Admin sửa trường được phép; User thấy dữ
    liệu mới ở danh sách và chi tiết sau khi đọc lại.
    - [x] SQL/RLS: User đọc lại đúng tên và cảnh báo Admin sửa.
    - [x] Service/form offline: User sửa dị ứng vẫn giữ cảnh báo an toàn của Admin.
-   [ ] **SYNC-02-07 \| P0** Admin không thể đổi chủ sở hữu hoặc sửa thú
    cưng ngoài quyền.
    - [x] SQL/RLS: chặn customer/pet relation sai ở RPC sửa theo khách; B không đọc, sửa hoặc lưu trữ pet A.
-   [ ] **SYNC-02-08 \| P1** Ẩn/xóa theo nghiệp vụ hiện hành; User và
    Admin phản ánh cùng kết quả, lịch sử liên quan không hỏng.
    - [x] SQL/RLS: User lưu trữ → Admin đọc inactive; Admin khôi phục → User đọc active; giữ owner và không thêm lịch sử cân thừa.
-   [ ] **SYNC-02-09 \| P1** Reload mỗi phía một lần; dữ liệu khớp DB,
    không phát sinh record trùng.

## 5. GĐ-03 --- Dịch vụ và lịch hẹn

-   [ ] **SYNC-03-01 \| P0** User chọn đúng thú cưng, dịch vụ và slot
    còn trống; tạo một lịch.
    - [x] SQL/RLS: quote và tạo một lịch Spa tổng hợp với pet/dịch vụ/giá đúng.
-   [ ] **SYNC-03-02 \| P0** Chỉ báo thành công khi API/DB thành công;
    ghi appointment ID.
    - [x] SQL và caller offline: trả đúng booking ID; quote sai không tạo lịch nửa vời; thiếu acknowledgement không báo thành công.
-   [ ] **SYNC-03-03 \| P0** Admin thấy lịch với đúng User, thú cưng,
    dịch vụ, ngày giờ và trạng thái.
    - [x] SQL/RLS: Admin đọc đúng customer/pet/service/giá và pending theo ID fixture.
-   [ ] **SYNC-03-04 \| P0** Bấm đặt lịch một lần chỉ tạo một lịch; kiểm
    tra double-click riêng không tạo trùng ngoài ý muốn.
    - [x] SQL: tạo rồi retry cùng ID/payload chỉ một lịch; cùng ID đổi payload bị từ chối.
-   [ ] **SYNC-03-05 \| P0** Slot không khả dụng/thời gian quá khứ bị
    chặn ở server, không chỉ ở UI.
    - [x] SQL: từ chối thời gian quá khứ và nhân viên ưu tiên không khả dụng.
-   [ ] **SYNC-03-06 \| P0** Admin xác nhận lịch; User thấy trạng thái
    mới.
    - [x] SQL/RLS: Admin xác nhận, User đọc confirmed; User không gọi được RPC đổi trạng thái của Admin.
-   [ ] **SYNC-03-07 \| P0** Admin đổi lịch; User thấy đúng giờ mới,
    không còn hai lịch active.
-   [ ] **SYNC-03-08 \| P0** Admin hủy lịch; User thấy đúng trạng
    thái/lý do nếu có.
    - [x] SQL/RLS: User đọc cancelled sau Admin hủy trong nhánh savepoint test.
-   [ ] **SYNC-03-09 \| P0** User gửi yêu cầu hủy/đổi lịch; Admin nhận
    yêu cầu nếu quy trình yêu cầu duyệt.
    - [x] SQL: User đổi cùng lịch sang pending với giờ mới; retry chỉ tăng change_count một lần.
    - [x] SQL: User hủy lịch đủ điều kiện; Admin đọc cancelled; retry chỉ một audit hủy theo request ID.
-   [ ] **SYNC-03-10 \| P1** Chuyển lịch sang đang thực hiện/hoàn thành;
    hai phía nhất quán.
-   [ ] **SYNC-03-11 \| P1** Giờ hiển thị hai phía khớp UTC+7, không
    lệch ngày.
    - [x] Đã sửa local: input/slot/preview và mapping ngày giờ theo Việt Nam; cửa sổ thao tác ưu tiên timestamp DB.
    - [x] Browser offline: Spa/hotel/taxi/đổi lịch cho cùng instant ở UTC, Los Angeles và Tokyo; Node kiểm tra qua nửa đêm và năm mới.
-   [ ] **SYNC-03-12 \| P1** Notification chỉ tạo sau khi lịch đã
    commit; reload không sinh thông báo trùng.

## 6. GĐ-04 --- Shop, đơn hàng, giao hàng, đổi trả/hoàn tiền

-   [ ] **SYNC-04-01 \| P0** User checkout một đơn test; mã đơn, chi
    tiết, số lượng, giá và tổng tiền khớp.
    - [x] SQL/RLS: tạo một đơn COD, SKU quantity 2 × 50.000 + ship 5.000; server bỏ qua giá giả client gửi.
-   [ ] **SYNC-04-02 \| P0** Admin thấy đúng đơn và khách hàng.
    - [x] SQL/RLS: Admin đọc đúng customer, variant, quantity, giá và trạng thái của đơn test theo ID.
-   [ ] **SYNC-04-03 \| P0** Reload sau checkout không tạo đơn thứ hai;
    cart chỉ xóa theo kết quả commit thành công.
    - [x] Browser offline: reload khi mất phản hồi khôi phục đúng ID đơn đã tồn tại; không quote/create lần nữa, không replay phép trừ giỏ chưa rõ kết quả.
-   [ ] **SYNC-04-04 \| P0** Lỗi trước khi lưu: không báo thành công,
    không tạo đơn nửa vời.
    - [x] SQL: quote version sai không có order nửa vời. Offline: ack null/ID khác không báo tạo thành công hoặc xóa giỏ.
-   [ ] **SYNC-04-05 \| P0** Mất response sau khả năng commit: kiểm tra
    record trước khi retry; không tạo đơn trùng.
    - [x] SQL: retry cùng ID chỉ một order/detail/payment/reservation; offline: recovery đọc theo ID/customer trước quote/create.
-   [ ] **SYNC-04-06 \| P0** Admin xác nhận đơn; User thấy trạng thái
    mới.
    - [x] SQL/RLS: Admin xác nhận, User đọc confirmed; version cũ bị chặn.
-   [ ] **SYNC-04-07 \| P0** Admin chuyển trạng thái chuẩn bị/giao
    vận/đã giao theo luồng hợp lệ; User thấy đúng thứ tự.
    - [x] SQL/RLS: confirmed → shipped → completed; User đọc trạng thái/vận đơn; retry ship chỉ xuất kho một lần.
-   [ ] **SYNC-04-08 \| P0** User yêu cầu hủy đơn; Admin nhận yêu cầu;
    không tự coi là đã hủy nếu cần duyệt.
-   [ ] **SYNC-04-09 \| P0** Admin hủy đơn theo điều kiện; User, tồn kho
    và tiền phản ánh đúng quy tắc.
    - [x] SQL/RLS: Admin hủy COD chưa thu tiền, User đọc cancelled, reservation active về 0; chưa kiểm thử hoàn tiền đã thu.
-   [ ] **SYNC-04-10 \| P0** User gửi yêu cầu đổi/trả/hoàn tiền; Admin
    thấy đúng đơn và yêu cầu.
    - [x] RPC/RLS: một yêu cầu trả một sản phẩm, retry không trùng; Admin thấy pending/detail; B/Guest bị chặn. [Bằng chứng đổi trả](docs/verification/sync/returns.md).
-   [ ] **SYNC-04-11 \| P0** Admin duyệt/từ chối; User thấy kết quả và
    lý do nếu có.
    - [x] RPC nhận hàng kiểm định và retry nhập lại kho đúng +1; User thấy received. Bổ sung nhánh từ chối có lý do/revision và hàng không bán lại không nhập kho; còn đổi hàng và UI hai portal.
    - [x] Sửa local User detail bỏ sót resolution_type: hiển thị lý do từ chối trên timeline, escape HTML; 3 test offline PASS. [Bằng chứng nhánh đổi trả](docs/verification/sync/return-branches.md).
    - [x] Chrome offline với HTML/module User thật: lý do hiển thị an toàn, UTC+7, xóa dữ liệu khi đổi tài khoản, không tạo lại channel sau dispose hoặc phiên đổi khi request chậm. Còn UI Admin/Auth/HTTP/commit/Realtime thật.
-   [ ] **SYNC-04-12 \| P0** Chỉ báo hoàn tiền thành công khi giao dịch
    thực tế thành công; tổng hoàn không vượt số tiền đã thanh toán.
    - [x] RPC tiền mặt giả: thu 105.000đ, hoàn 50.000đ đúng một lần, chặn vượt khoản thu và replay đổi số tiền; User/Admin cùng thấy ròng 55.000đ. Chưa test gateway/HTTP/UI thật.
-   [ ] **SYNC-04-13 \| P1** Danh sách, chi tiết, notification, lịch sử
    và KPI liên quan không mâu thuẫn.
-   [ ] **SYNC-04-14 \| P1** Một chuyển trạng thái chỉ tạo notification
    một lần, không nhân đôi khi F5.

### Đợt đổi trả/hoàn tiền — 26/10/2026

- [x] 13 kiểm tra Cloud/112 SQL statements PASS; một đơn/return/payment/refund tổng hợp luôn rollback, xác minh sạch fixture.
- [x] Kiểm tra quyền A/B/Guest và chặn User tự nhận hàng/nhập kho/gọi hoàn tiền Admin; không Logs/stress-test hoặc chuyển tiền thật.
- [ ] Còn kiểm thử đồng thời và E2E hai portal. Đổi/gửi bù đã có mã, kiểm thử và migration 108 trên Cloud; hoàn điểm đã có migration 107 trên Cloud; gateway thật N/A theo yêu cầu. Các ô toàn chuỗi giữ trống; chưa push/deploy frontend mới.
- [x] Bổ sung 8 kiểm tra Cloud/82 SQL statements: hoàn nhanh bị chặn khi nguồn có điểm/eligible spend; snapshot tính chi tiêu ròng đúng trên refund fixture; trigger chặn hoàn eligible vượt mức. Fixture rollback sạch, không Logs/tiền thật. [Bằng chứng](docs/verification/sync/refund-ledger.md).
- [ ] Chưa nghiệm thu đầy đủ workflow hoàn điểm qua hai portal và hai phiên đồng thời. Không tự đổi hạng thành viên đã gán; số chi tiêu xét hạng được giảm theo tỷ lệ trong mã mới.
- [x] Bổ sung 9 kiểm tra Cloud/94 SQL statements PASS: chặn số lượng trả sai/vượt tổng, từ chối có lý do, nhận hàng không bán lại không tăng tồn bán được và không xử lý lại request đã giải quyết. Một fixture/sau cùng rollback sạch.

### Hoàn tiền có điểm thưởng — 26/10/2026

- [x] Chốt quy tắc: thu hồi theo tỷ lệ tiền hoàn cộng dồn, làm tròn xuống; chặn toàn bộ khoản hoàn khi khách không đủ điểm.
- [x] Mã migration 107 cho cả thu ngân đơn hàng và dịch vụ: tiền hoàn, bút toán âm điểm và chi tiêu xét hạng cùng transaction; không sửa/xóa lịch sử; khóa customer/payment, quyền, phiên bản và retry được kiểm tra.
- [x] Cloud rollback: đơn hàng 17 kiểm tra/160 SQL, dịch vụ 14 kiểm tra/147 SQL PASS; thiếu điểm không ghi refund dở dang, hoàn nhiều lần không lệch làm tròn, retry không trùng và quyền đọc metadata được giữ. [Bằng chứng](docs/verification/sync/refund-rewards.md).
- [x] Hai modal Chrome offline PASS: xem trước điểm/chi tiêu giảm/số dư, bỏ xác nhận khi đổi tiền, chống bấm trùng và chặn thiếu điểm. Xem trước không gọi thêm RPC khi gõ.
- [x] Hồi quy offline: 13 bài Chrome/84 test Node cùng Copilot/loyalty service PASS; không Logs, polling mới, stress test hoặc chuyển tiền thật.
- [x] Áp dụng migration 107 lên Supabase Cloud theo xác nhận cụ thể của người dùng ngày 26/10/2026; xác minh cả hai getter và hai RPC ghi tiền có logic mới. Không sửa/xóa dữ liệu hiện có. [Bằng chứng áp dụng](docs/verification/sync/refund-rewards-cloud-apply.txt).
- [ ] Auth/HTTP/commit/Realtime/reload hai portal và hai phiên hoàn đồng thời chưa nghiệm thu; frontend chưa push/deploy. Gateway thật N/A.

### Đổi hàng và gửi bù — 26/10/2026

- [x] Mã migration 108: liên kết RMA với đơn thay thế 0đ; đổi hàng sau nhận/kiểm định, gửi bù đúng SKU; kiểm tra số lượng, tồn khả dụng, quyền/revision và chống tạo trùng.
- [x] Tái sử dụng giữ kho/giao hàng: chỉ xuất khi giao, retry không xuất trùng; hoàn tất đồng bộ RMA. Hủy giải phóng giữ kho và giữ lịch sử RMA đã nhận để tránh nhập trả lặp. Không phát sinh thanh toán/điểm/voucher.
- [x] Chặn vừa hoàn tiền vừa gửi hàng thay thế qua hai màn hình; cấm sửa giá/phí/liên kết đơn thay thế để thu thêm tiền hoặc đổi chủ.
- [x] 33 kiểm tra Cloud/328 SQL PASS: cả hai nhánh đổi/gửi bù, Admin và khách xác nhận hoàn tất, quyền A/B/Guest, thiếu tồn không ghi dở dang, giữ/xuất kho và retry; fixture và migration luôn rollback. [Bằng chứng](docs/verification/sync/sales-replacements.md).
- [x] Chrome Admin/khách offline PASS: tạo đơn, tìm SKU có giới hạn/debounce, giữ bản nháp/retry, xem trạng thái/vận đơn/liên kết; tái sử dụng channel hiện có, không polling hoặc tải toàn bộ catalog.
- [x] Hồi quy offline 14 bài Chrome/85 test Node cùng Copilot/loyalty service PASS; không Logs, stress test hoặc giao hàng/tiền thật.
- [x] Áp dụng migration 108 lên Cloud ngày 26/10/2026 theo xác nhận cụ thể của người dùng; xác minh RLS, quyền đọc/không INSERT trực tiếp, RPC tạo đơn, chốt chặn hoàn tiền và trigger đồng bộ. Cờ tính năng đã bật mặc định trong mã local. [Bằng chứng áp dụng](docs/verification/sync/sales-replacements-cloud-apply.txt).
- [x] Bổ sung 11 kiểm tra modal Admin/trang khách → HTTP thử nghiệm → RPC/RLS Cloud PASS: tạo đơn, đọc sau reload, vận đơn/giao/hoàn tất và B bị chặn. Một transaction luôn rollback, 147 SQL/15 request nghiệp vụ; response JSON 23.148 byte trong test, không phải egress production. [Bằng chứng HTTP](docs/verification/sync/sales-replacements-http.md).
- [x] Đọc A/B qua hai HTTP request đồng thời không lẫn danh tính trên transport SQL đã tuần tự hóa; không coi đây là kiểm thử hai DB writer.
- [x] Đăng nhập Admin bằng Supabase Auth thật và đọc quan hệ mới qua PostgREST PASS: 6 request Auth/REST, GET tối đa một dòng, hàm thu ngân đọc thành công; không ghi nghiệp vụ hoặc xuất credentials. Không mở toàn bộ portal/Dashboard để kéo dữ liệu không liên quan.
- [ ] Frontend chưa push/deploy; chưa nghiệm thu Auth khách và giao diện đầy đủ hai portal qua HTTP/commit/Realtime/reload hoặc hai kết nối ghi đồng thời. Các kết quả HTTP rollback/Auth chỉ đọc không thay thế các ô toàn chuỗi.

## 7. GĐ-05 --- Khiếu nại, hỗ trợ và chat

-   [ ] **SYNC-05-01 \| P0** User gửi một ticket test gắn đúng đơn/đối
    tượng; Admin thấy đúng người gửi và nội dung.
    - [x] RPC/RLS: tạo/retry một ticket đúng owner/đơn; chặn đơn của B; Admin đọc đúng bản ghi. Còn E2E hai portal.
-   [ ] **SYNC-05-02 \| P0** User gửi phản hồi; Admin thấy đúng thứ tự
    và thời gian.
    - [x] RPC/RLS: phản hồi retry không trùng, Admin đọc được; offline giữ draft khi lỗi và hiển thị giờ Việt Nam.
-   [ ] **SYNC-05-03 \| P0** Admin phản hồi; User thấy nội dung mới.
    - [x] RPC/RLS: chỉ phản hồi công khai tới User, ghi chú nội bộ bị ẩn; offline cập nhật chi tiết bằng một channel chung.
-   [ ] **SYNC-05-04 \| P0** Admin đổi trạng thái ticket; User thấy
    trạng thái/lời giải thích đúng.
    - [x] RPC/RLS: yêu cầu bổ sung, đang xử lý, giải quyết và đóng; User thấy lời giải thích công khai; chặn revision cũ.
-   [ ] **SYNC-05-05 \| P0** User B không thể xem ticket của A bằng
    URL/ID.
    - [x] SQL/RLS chặn B đọc/phản hồi/đánh giá A, chặn Guest; offline chặn response/cache A vào B. Còn URL/HTTP thật.
-   [ ] **SYNC-05-06 \| P1** User và Admin gửi gần nhau; message không
    mất hoặc nhân đôi, thứ tự hợp lý.
-   [ ] **SYNC-05-07 \| P1 — HOÃN theo yêu cầu người dùng, chờ nối nơi lưu ảnh.** Khi triển khai upload, thử một file nhỏ hợp lệ và
    một file không hợp lệ; kiểm tra quyền Storage.
-   [ ] **SYNC-05-08 \| P1** Nếu có handoff chatbot → nhân viên, hai
    phía thấy đúng trạng thái chuyển giao; không tạo conversation trùng.
-   [ ] **SYNC-05-09 \| P1** Ticket đóng: gửi tiếp theo đúng quy tắc (bị
    chặn hoặc mở lại), lịch sử không mất.
    - [x] RPC/RLS chặn phản hồi mới khi đã giải quyết, đóng giữ lịch sử công khai; đánh giá retry không trùng.
-   [ ] **SYNC-05-10 \| P1** SLA/ưu tiên không bị sai sau phản hồi hoặc
    đổi trạng thái.

### Kết quả đợt hỗ trợ — 26/10/2026

- [x] 13 assertion Cloud/111 SQL statements PASS; một ticket và tham chiếu tổng hợp đã rollback, xác minh không còn fixture.
- [x] 35 test Node và Chrome offline PASS: một channel, gom đọc/sự kiện, không polling khi nhàn rỗi/ẩn tab, khóa double-click, retry và cách ly tài khoản.
- [x] Sửa local API dùng JWT người gọi + RPC, tách lỗi refresh khỏi xác nhận ghi, escape tiêu đề và giờ Việt Nam. Không đổi schema/RPC/policy, chưa push/deploy.
- [x] Ghi bằng chứng và giới hạn tại [support.md](docs/verification/sync/support.md); không dùng Logs hoặc stress-test.
- [ ] Phân trang lịch sử ticket: RPC hiện còn trả toàn bộ lịch sử của owner; chưa bảo đảm ID retry phản hồi qua reload.
- [x] Ticket có Auth/HTTP/commit và hai request tạo/phản hồi chồng thời gian, Realtime owner A/B, read acknowledgement qua client mới: 11 PASS; xem bằng chứng đầu tài liệu.
- [ ] E2E thao tác hai portal/reload trình duyệt, handoff chatbot và SLA/ưu tiên: còn nghiệm thu riêng. Upload/Storage HOÃN theo yêu cầu.

Tiếp theo: notification, sau đó điểm/voucher và đổi trả/hoàn tiền; tiếp tục fixture ít, truy vấn theo ID và cập nhật checklist theo bằng chứng.

## 8. GĐ-06 --- Notification

Tiến độ 26/10: bản trước đã push lên `origin/main` tại commit `0ef89a39`. Phần mới dưới đây còn local, chưa nằm trong commit đó.

- [x] Bỏ tự nạp helper thông báo cũ trong `components.js`: header là nơi duy nhất sở hữu tải snapshot/subscription của luồng nạp component. Tránh helper đọc trực tiếp, cache cũ và ghi đè giao diện header.
- [x] 10 test header offline PASS, gồm kiểm tra loader chỉ nạp header/support và không nạp helper thông báo trùng; không gọi Cloud, Logs hoặc stress-test.
- [x] Header gom sự kiện trong 200 ms, hoãn tải khi ẩn tab; sự kiện trong lúc đọc tạo đúng một lượt bù; reconnect gom tải lại. Dọn timer/channel khi rời trang, khôi phục khi quay lại từ bộ nhớ trình duyệt, chặn phản hồi cũ cả khi A → B → A.
- [x] Tổng 14 test offline PASS (`header_notifications.test.js`, `notification_sync.test.cjs`); không gọi Cloud. [Bằng chứng và giới hạn](docs/verification/sync/notifications.md).
- [x] Đánh dấu đọc chờ ack hợp lệ, gom double-click, dùng expected owner/cutoff và lấy snapshot sau ghi; chặn kết quả ghi phiên cũ. Tổng 18 test offline PASS.
- [x] RPC/RLS Cloud: 8 kiểm tra/54 SQL statements PASS, ba thông báo tổng hợp/hai owner; đã rollback và xác minh sạch fixture. Không Logs/stress-test, không thay schema/RPC/policy.
- [ ] Còn persistence sau commit/reload, Auth/HTTP/Realtime thật và giới hạn snapshot; chưa xác nhận toàn bộ thông báo hai chiều hoặc egress thực tế.

-   [ ] **SYNC-06-01 \| P0** Sự kiện nghiệp vụ đã commit tạo
    notification đúng người nhận nếu tính năng được hỗ trợ.
-   [ ] **SYNC-06-02 \| P0** Admin thao tác cần thông báo User;
    notification chỉ xuất hiện sau khi lưu thành công.
-   [ ] **SYNC-06-03 \| P0** Hành động User cần Admin biết phải ghi vào
    nguồn dữ liệu/queue nghiệp vụ dùng chung; không chỉ nằm trong
    localStorage của trình duyệt User.
-   [ ] **SYNC-06-04 \| P0** Đánh dấu đã đọc; trạng thái giữ sau
    reload/đăng nhập lại.
    - [x] RPC ghi read_at và snapshot đọc lại đúng; retry không ghi lại. Offline chờ ack và chặn snapshot cũ; còn commit/reload/login thật.
-   [ ] **SYNC-06-05 \| P1** Đọc tất cả; số chưa đọc và danh sách khớp
    sau khi đọc lại.
    - [x] RPC xử lý theo cutoff snapshot, chặn cutoff thiếu/tương lai, retry không đổi thêm; offline gửi đúng cutoff và gom double-click.
-   [ ] **SYNC-06-06 \| P0** User A không thấy notification cá nhân của
    B; kiểm tra owner/RLS.
    - [x] Snapshot A/B cách ly; RPC chặn đánh dấu ID khác owner, expected owner sai và Guest. Còn URL/HTTP/Auth thật.
-   [ ] **SYNC-06-07 \| P1** Click notification mở đúng chi tiết
    đơn/lịch/ticket và kiểm tra quyền trước khi hiển thị.
    - [x] Chrome offline popup thông báo: link đơn/lịch/ticket đúng route/query, encode ID; HTML hiển thị an toàn, giờ UTC+7; đổi tài khoản đóng popup cũ. Sửa mở lần đầu trước tải badge và xóa lỗi sau refresh thành công. Còn quyền trang đích/HTTP/Auth thật. [Bằng chứng](docs/verification/sync/notifications.md).
-   [ ] **SYNC-06-08 \| P1** Reload/đổi tab không tạo notification
    trùng.
-   [ ] **SYNC-06-09 \| P1** Notification công khai Topbar/Popup tách
    biệt notification cá nhân; Guest chỉ xem nội dung công khai.
-   [ ] **SYNC-06-10 \| P1** Không tuyên bố Email/SMS/Zalo đã gửi nếu
    chỉ ghi notification in-app.
-   [ ] **SYNC-06-11 \| P1** Lỗi ghi notification không tạo retry vô hạn
    hoặc báo sai trạng thái nghiệp vụ chính.
-   [ ] **SYNC-06-12 \| P1** Logout/đổi tài khoản/rời trang phải dọn
    listener; không nhận sự kiện của tài khoản trước.

## 9. GĐ-07 --- Paw Points, membership và voucher

Tiến độ 26/10 — [bằng chứng điểm/voucher](docs/verification/sync/loyalty.md):

- [x] Lọc Realtime ba bảng theo customer, gom sự kiện/đọc snapshot, hoãn tải khi ẩn tab và cập nhật bù khi reconnect; không polling.
- [x] Dọn timer/channel/listener khi dispose/đổi phiên; xóa giao diện cũ và chặn snapshot sai owner hoặc phản hồi cũ sau đổi tài khoản.
- [x] 7 test Node và bài kiểm tra service PASS, cú pháp/diff đạt; không phát sinh truy vấn Cloud trong đợt này.
- [x] RPC/RLS Cloud: 13 kiểm tra/98 SQL statements PASS cho cộng điểm Admin, đổi điểm User, ledger/ack/retry, version/hiệu lực/thiếu điểm và cách ly B/Guest. Một voucher/đổi điểm tổng hợp đã rollback và xác minh sạch fixture.
- [x] Áp voucher/hủy COD: 10 kiểm tra Cloud/89 SQL statements PASS; server tính lại giảm giá, chặn quote cũ/điều kiện sai, retry không trùng, hủy hoàn lượt dùng; fixture rollback sạch. [Bằng chứng](docs/verification/sync/voucher-order.md).
- [ ] Còn giới hạn payload, đổi trả/hoàn tiền, hoàn điểm dùng trực tiếp khi checkout, giao dịch đồng thời và nghiệm thu browser/E2E. Thay đổi mới còn local.

-   [ ] **SYNC-07-01 \| P0** Số dư điểm User và Admin khớp ledger.
    - [x] SQL: User snapshot và ledger Admin cùng 100 → 60 sau đổi voucher 40 điểm; history cộng đúng số dư. Còn hai UI/commit/reload.
-   [ ] **SYNC-07-02 \| P0** Một giao dịch cộng/trừ điểm được ghi một
    lần; số dư và lịch sử khớp.
    - [x] RPC cộng và đổi điểm retry chỉ tạo một credit/một debit, một wallet item; kiểm tra lại số dư sau các request bị từ chối.
-   [ ] **SYNC-07-03 \| P0** Admin tặng/điều chỉnh điểm đúng quyền; User
    thấy số dư/lý do theo thiết kế.
    - [x] RPC Admin cộng 100 điểm cho fixture, User đọc được cùng giao dịch qua snapshot; chưa nghiệm thu form Admin và thông báo.
-   [ ] **SYNC-07-04 \| P0** User không thể tự tăng điểm bằng gọi API
    trực tiếp.
    - [x] Role User bị chặn gọi RPC Admin và chèn trực tiếp ledger (42501); còn HTTP/Auth thật.
-   [ ] **SYNC-07-05 \| P0** Retry/double-click không cộng điểm trùng.
    - [x] Retry tuần tự cùng request cộng/đổi điểm không trùng; payload khác bị PT409. Chưa test tranh chấp nhiều transaction.
-   [ ] **SYNC-07-06 \| P1** User chỉ thấy voucher hiệu lực và đủ điều
    kiện.
-   [ ] **SYNC-07-07 \| P0** User dùng voucher; server tính lại giảm
    giá, Admin thấy đúng tổng đơn.
    - [x] RPC quote/create COD bỏ giá/discount/total client giả; Admin đọc một redemption và payment đúng tổng sau giảm. Còn hai UI/HTTP/commit/reload.
-   [ ] **SYNC-07-08 \| P0** Voucher hết hạn/không đủ điều kiện bị từ
    chối; không áp dụng giảm giá giả.
    - [x] RPC đổi điểm chặn voucher vô hiệu/hết hạn và thiếu điểm; chưa kiểm tra giảm giá checkout.
    - [x] Quote checkout chặn voucher hết hạn/đơn dưới tối thiểu/không sở hữu/voucher đã dùng; quote cũ bị PT409 khi mức giảm đổi.
-   [ ] **SYNC-07-09 \| P1** Admin sửa điều kiện voucher; User không
    tiếp tục dùng cấu hình cũ sau khi cập nhật.
    - [x] Đổi điều kiện fixture làm version cũ bị PT409; chưa kiểm tra đường sửa voucher qua UI/RPC Admin.
-   [ ] **SYNC-07-10 \| P1** Hủy đơn/hoàn tiền cập nhật điểm và voucher
    đúng chính sách hiện hành.
    - [x] User hủy COD và retry: đảo lượt dùng một lần, trả voucher về ví khả dụng; không hoàn thêm điểm đã đổi lấy voucher riêng. Chưa kiểm tra hoàn tiền hoặc điểm dùng trực tiếp tại checkout.

## 10. GĐ-08 --- Admin cập nhật dữ liệu công khai ảnh hưởng User

Chỉ test mục có triển khai thực tế.

-   [ ] **SYNC-08-01 \| P1** Admin bật/tắt hoặc sửa dịch vụ; Public/User
    phản ánh đúng sau khi đọc lại.
-   [ ] **SYNC-08-02 \| P1** Admin đổi giá sản phẩm; checkout xác minh
    lại giá phía server.
-   [ ] **SYNC-08-03 \| P1** Admin cập nhật tồn kho; User không mua vượt
    tồn khả dụng.
-   [ ] **SYNC-08-04 \| P1** Admin tạo/sửa/ẩn banner/bài viết/notice;
    Guest/User chỉ thấy nội dung được publish, không thấy bản nháp.
-   [ ] **SYNC-08-05 \| P1** Admin sửa chính sách thanh toán/giao hàng;
    checkout dùng cấu hình có hiệu lực.
-   [ ] **SYNC-08-06 \| P1** Admin khóa tài khoản theo quyền; User không
    tiếp tục thao tác trái phép, lịch sử vẫn được bảo toàn.
-   [ ] **SYNC-08-07 \| P1** Admin đổi quyền nhân viên; server/API thực
    thi quyền, không chỉ ẩn nút.
-   [ ] **SYNC-08-08 \| P1** Admin sửa FAQ/cấu hình chatbot; User chỉ
    nhận cấu hình đã lưu/publish.
-   [ ] **SYNC-08-09 \| P1** Thay đổi quản trị quan trọng có audit trail
    nếu nghiệp vụ yêu cầu.
-   [ ] **SYNC-08-10 \| P1** Lưu cấu hình thất bại không làm User thấy
    giá trị chưa commit.

## 11. GĐ-09 --- Mạng lỗi, retry, persistence và xung đột

-   [ ] **SYNC-09-01 \| P0** Mất mạng trước request ghi: không báo thành
    công, giữ dữ liệu nhập phù hợp.
-   [ ] **SYNC-09-02 \| P0** Mất response sau khả năng commit: xác minh
    record trước retry; không tạo trùng.
-   [ ] **SYNC-09-03 \| P0** 4xx validation/permission: hiển thị lỗi rõ,
    không retry liên tục.
-   [ ] **SYNC-09-04 \| P0** 5xx/timeout: có cách thử lại kiểm soát,
    không gửi vô hạn.
-   [ ] **SYNC-09-05 \| P1** Reload một lần sau ghi thành công; hai phía
    đọc cùng kết quả từ nguồn chuẩn.
-   [ ] **SYNC-09-06 \| P1** Hai phiên sửa cùng record; không âm thầm
    ghi đè nếu hệ thống có kiểm soát version/conflict.
-   [ ] **SYNC-09-07 \| P1** Rời trang/đóng tab; timer và listener được
    dọn.
-   [ ] **SYNC-09-08 \| P1** Logout trong lúc request chạy; response
    không gắn nhầm vào phiên kế tiếp.
-   [ ] **SYNC-09-09 \| P1** Record bị ẩn/xóa ở phiên khác; UI xử lý
    stale state rõ ràng.
-   [ ] **SYNC-09-10 \| P1** Log đủ để điều tra nhưng không chứa
    token/secret/PII không cần thiết.

## 12. GĐ-10 --- RLS và quyền User/Admin

-   [ ] **SYNC-10-01 \| P0** User A chỉ đọc/sửa dữ liệu A theo policy:
    hồ sơ, pet, address, order, appointment, ticket, notification.
-   [ ] **SYNC-10-02 \| P0** User B không thể đọc/sửa record của A bằng
    ID.
-   [ ] **SYNC-10-03 \| P0** Guest không truy cập inbox, hồ sơ hoặc đơn
    riêng của thành viên bằng URL/ID.
-   [ ] **SYNC-10-04 \| P0** User không tự đổi trạng thái
    đơn/lịch/ticket vốn thuộc quyền Admin.
-   [ ] **SYNC-10-05 \| P0** Nhân viên chỉ thao tác theo role/scope;
    không tự nâng role hoặc sửa trường nhạy cảm.
-   [ ] **SYNC-10-06 \| P0** Gọi API trực tiếp bỏ qua UI vẫn bị
    server/RLS chặn đúng.
-   [ ] **SYNC-10-07 \| P1** Response không trả cột nhạy cảm không cần
    thiết.
-   [ ] **SYNC-10-08 \| P1** Deep link notification kiểm tra quyền trước
    khi mở dữ liệu đích.

## 13. GĐ-11 --- Kiểm soát request/egress sau từng nhóm

-   [ ] **SYNC-11-01 \| P1** Màn hình danh sách có
    filter/pagination/limit; không tải cả bảng nếu không cần.
-   [ ] **SYNC-11-02 \| P1** Một thao tác ghi không tạo nhiều
    insert/update giống nhau.
-   [ ] **SYNC-11-03 \| P1** Chỉ tải lại dữ liệu cần thiết sau ghi,
    không reload toàn bộ User/Admin vô cớ.
-   [ ] **SYNC-11-04 \| P1** Không polling liên tục khi tab ẩn/nhàn rỗi
    trừ khi có yêu cầu rõ.
-   [ ] **SYNC-11-05 \| P1** Realtime chỉ subscribe đúng
    record/customer/conversation; unsubscribe khi không cần.
-   [ ] **SYNC-11-06 \| P1** Không trả `select('*')`/payload lớn không
    cần thiết trên đường đọc thường xuyên; ghi nhận để tối ưu.
-   [ ] **SYNC-11-07 \| P1** Chuyển tab không nhân đôi listener hoặc
    fetch cùng dữ liệu.
-   [ ] **SYNC-11-08 \| P1** Một lần F5 không tạo vòng lặp fetch hoặc
    insert.
-   [ ] **SYNC-11-09 \| P1** Lỗi API không gây retry loop.
-   [ ] **SYNC-11-10 \| P1** So sánh baseline và sau test: endpoint,
    method, status, số lần gọi, payload.
-   [ ] **SYNC-11-11 \| P1** Không chạy load/stress test hoặc tạo hàng
    trăm bản ghi trên project quota hạn chế.
-   [ ] **SYNC-11-12 \| P1** Nếu egress/request tăng bất thường, dừng
    test và tìm endpoint gây tải trước khi tiếp tục.

## 14. GĐ-12 --- Đối soát và regression

-   [ ] **SYNC-12-01 \| P0** Mỗi luồng PASS có bằng chứng UI → API → DB
    → UI phía còn lại.
-   [ ] **SYNC-12-02 \| P0** Đối chiếu record ID, owner/customer_id, FK,
    status, enum, amount và timestamps.
-   [ ] **SYNC-12-03 \| P0** Không có record/notification trùng hoặc
    record mồ côi.
-   [ ] **SYNC-12-04 \| P0** Không có lỗi cách ly dữ liệu giữa
    A/B/Guest/Admin.
-   [ ] **SYNC-12-05 \| P1** Danh sách, chi tiết, notification,
    dashboard/KPI và audit log liên quan không mâu thuẫn.
-   [ ] **SYNC-12-06 \| P1** Sau sửa lỗi, chạy lại case lỗi, chiều ngược
    lại và ít nhất một case hồi quy liên quan.
-   [ ] **SYNC-12-07 \| P1** Có evidence thực tế; screenshot đơn lẻ
    không đủ cho luồng ghi quan trọng.
-   [ ] **SYNC-12-08 \| P0** Chốt số PASS/FAIL/BLOCKED/N/A, Bug ID,
    owner và quyết định phát hành.

## 15. Thứ tự chạy để tìm lỗi nhanh

### Vòng A --- Smoke test tối thiểu

Chạy từng bước, mỗi luồng chỉ tạo một record: 1. **SYNC-01-02/03/04:**
User sửa hồ sơ → Admin thấy; Admin sửa → User thấy. 2.
**SYNC-02-01/02:** User tạo pet → Admin thấy. 3. **SYNC-03-01/03/06:**
User đặt lịch → Admin thấy → Admin xác nhận → User thấy. 4.
**SYNC-04-01/02/06:** User tạo đơn → Admin thấy → Admin xác nhận → User
thấy. 5. **SYNC-05-01/03/04:** User gửi ticket → Admin phản hồi → User
thấy. 6. **SYNC-06-04/06:** persistence đã đọc và cách ly notification.
7. **SYNC-07-02/03/07:** ledger điểm/voucher nếu đang triển khai. 8.
**SYNC-09-02/03:** retry/lỗi mạng không tạo trùng. 9.
**SYNC-10-01/02/06:** RLS và cách ly tài khoản. 10.
**SYNC-11-01/02/08:** kiểm soát request và F5.

### Vòng B --- Kiểm tra sâu

Chỉ bắt đầu sau khi smoke test không còn P0. Chạy từng phân hệ, chốt kết
quả và dọn dữ liệu test trước khi chuyển tiếp.

### Vòng C --- Regression sau sửa lỗi

Chạy lại case FAIL, case chiều ngược lại của nghiệp vụ đó, một case
quyền/RLS và một case request/bandwidth liên quan. Không cần chạy lại
toàn bộ mọi luồng nếu không bị ảnh hưởng; phải ghi lý do.

## 16. Mẫu ghi kết quả

  ---------------------------------------------------------------------------------
  Trường                              Nội dung
  ----------------------------------- ---------------------------------------------
  Test ID / Kết quả                   `SYNC-xx-xx` /
                                      `NOT RUN, PASS, FAIL, BLOCKED, RETEST, N/A`

  Environment / commit                URL và SHA/version

  Actor                               Guest / User A / User B / Admin

  Hành động / kỳ vọng                 Thao tác chính xác và kết quả mong đợi

  Thực tế / record ID                 Kết quả quan sát và ID

  Network                             Endpoint, method, status, số lần gọi, payload

  Persistence                         Kết quả sau một lần reload/đăng nhập lại

  Security                            RLS/owner/role đã xác minh chưa

  Evidence / Bug ID                   Ảnh, Console, Network, SQL read-only, issue

  Ghi chú                             Root cause đã xác minh hay mới là giả thuyết
  ---------------------------------------------------------------------------------

### Mẫu bug

-   **Bug ID / Severity:** P0, P1 hoặc P2
-   **Test ID / environment / commit:**
-   **Các bước tái hiện:**
-   **Kỳ vọng / thực tế:**
-   **Chiều lỗi:** User → Admin / Admin → User / hai chiều / bảo mật /
    bandwidth
-   **Record ID / endpoint / request count:**
-   **Evidence:**
-   **Nguyên nhân:** đã xác minh / giả thuyết
-   **Cách sửa / regression test:**

## 17. Điều kiện hoàn thành

-   [ ] Không còn lỗi P0 đã xác nhận về đồng bộ hoặc phân quyền.
-   [ ] Mỗi nghiệp vụ cốt lõi đã kiểm tra hai chiều nếu nghiệp vụ hỗ trợ
    hai chiều.
-   [ ] Luồng ghi quan trọng đã xác minh response, persistence và record
    nguồn.
-   [ ] User A/B/Guest không truy cập chéo dữ liệu.
-   [ ] Không có duplicate do double-click, F5 hoặc retry.
-   [ ] Notification không trùng và trạng thái đọc được lưu bền vững.
-   [ ] Không có polling/retry/request lặp bất thường trong các luồng đã
    test.
-   [ ] Mọi BLOCKED/N/A có lý do; mọi FAIL có Bug ID và người phụ trách.

**Nguyên tắc cuối:** kiểm thử nhẹ, có mục tiêu và có bằng chứng. Khi
thấy tải bất thường, dừng nhánh test để điều tra thay vì tiếp tục tạo
request.
