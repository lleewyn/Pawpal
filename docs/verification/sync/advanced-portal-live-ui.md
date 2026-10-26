# Chuyển chat và công bố đánh giá trên UI — 26/10/2026

Tiếp đợt [hai giao diện](two-portal-live-ui.md), dùng Playwright MCP và Supabase Cloud thật. Admin/khách ở hai origin local như trước; người nhận chat đăng nhập bằng form trong một BrowserContext riêng, không chia sẻ bộ nhớ đăng nhập với Admin hoặc khách. Không giả token hay thay trạng thái ứng dụng để bỏ qua đăng nhập/quyền.

## Công bố và ẩn đánh giá

- Khách gửi một review 5/5 cho lịch thử đã hoàn tất, gắn **dịch vụ thử inactive riêng**. Không gắn review vào dịch vụ đang phục vụ khách.
- Admin tìm đúng review trong bảng, chọn Công bố và lưu lý do. Khách đang mở lịch nhận trạng thái “5/5 — Đã công bố”; reload vẫn giữ trạng thái. [Ảnh](advanced-review-published.png).
- Admin chuyển Ẩn, khách cập nhật “Đã ẩn”. Đối chiếu read-only sau commit thấy review hidden và thông báo đúng chủ lịch.
- API anonymous `public_service_reviews` và `public_service_directory` loại dịch vụ inactive cả khi review published. Lượt probe đầu kỳ vọng sai rằng review inactive sẽ được trả ra public, đã dừng assertion; đọc hợp đồng xác nhận filter `s.status='active'`. Sửa kỳ vọng, kiểm lại một vòng công bố/ẩn bằng UI: trạng thái DB đúng, public vẫn rỗng, dịch vụ thử vắng khỏi danh mục, mỗi moderation có một source_event riêng. Không nới filter hoặc làm dịch vụ thử active để vượt kiểm tra.

Đây là PASS UI moderation sau commit, delivery/reload tới chủ lịch và loại nội dung inactive khỏi public. **Chưa thay nghiệm thu public page hiển thị review published trên một dịch vụ active trong môi trường tách biệt.** Nhánh active published→hidden có SQL rollback riêng, không công bố đánh giá tổng hợp lên dịch vụ thật.

## Chuyển nhân viên qua UI

- Tạo người nhận tạm `E2E Portal recipient`, không cấp vai trò Admin; chỉ tám quyền cần cho đọc inbox/thông tin liên hệ cơ bản, chat, danh sách người nhận và RPC audit. Người nhận không gửi hay resolve trong lượt này, nên không tạo audit tác giả cần giữ hồ sơ nhân viên tạm.
- Khách yêu cầu chuyên viên trên khung chat. Admin tìm đúng khách, nhận ca và gửi một tin thử.
- Người nhận đăng nhập UI độc lập, mở hội thoại: đọc được nhưng ô trả lời bị khóa trước khi phân công.
- Admin mở menu chuyển nhân viên, tìm/chọn đúng người nhận tạm, nhập ghi chú nội bộ, xác nhận chuyển. Người nhận đang mở nhận cập nhật và ô trả lời được mở; người cũ bị khóa ô trả lời. Reload từng phiên vẫn giữ đúng quyền và phân công. [Ảnh transcript người nhận](advanced-transfer-recipient.png).
- Khách nhận system message chuyển ca và tin staff, không thấy ghi chú `PRIVATE transfer`. [Ảnh khách](advanced-transfer-customer.png). Probe DB xác nhận đúng người được phân công, một tin staff và ghi chú riêng không trở thành message công khai.

PASS UI transfer → receipt → quyền compose → reload. Chưa thử người nhận gửi/resolve sau chuyển qua UI; không lấy trạng thái ô đã mở làm bằng chứng đã lưu câu trả lời.

## Sửa chặn thao tác chat chồng nhau

Lượt trước cho phép gõ/gửi trong khi thao tác nhận ca còn đang lưu/refresh, gây 409 snapshot cũ. `tab-chatbot-live.js` nay giữ khóa theo ID hội thoại trong suốt RPC và refresh, không nhận thêm thao tác cùng ca; chỉ mở ô gửi khi trạng thái `agent_handling` và `assignedStaffId` đúng staff đang đăng nhập. Sau chuyển, người cũ không còn được gõ/gửi trong UI; quyền DB vẫn là lớp quyết định.

Kiểm tra MCP trên request thật: giữ đúng một request take tại route trước khi cho đi tiếp (không mock kết quả), xác minh ô soạn khóa trước nhận và trong lúc chờ; phát thêm một sự kiện click không tạo request thứ hai; thả request rồi gửi ngay khi ô mở. Kết quả **takeRequests=1**, một tin staff lưu thành công, không phải retry một 409 mới. Sau transfer/reload, ô cũ khóa và ô người nhận mở. Không thêm query, channel hoặc polling cho khóa này.

Hồi quy offline PASS: `admin_chat_realtime_egress_ui.cjs`, `admin_chat_inbox_ui.cjs`, `chatbot_business_ui.cjs`; năm test SLA PASS; syntax module PASS. Các script offline dùng transport mock và không thay bằng chứng UI/Auth/commit thật ở trên.

## SLA và phần chưa đóng

Probe Cloud thấy không có rule active `direct_request`, deadline NULL; Admin hiển thị “Chưa có hạn phản hồi”. Đây là hành vi đúng cho cấu hình rỗng, chưa phải nghiệm thu countdown theo rule đã triển khai trong nghiệp vụ. Đã hỏi người dùng thời hạn mong muốn 2/5/15 phút; chưa tự chọn hoặc kích hoạt rule global trong lúc chờ. Engine từ khóa/cảm xúc và phân công tự động chưa nghiệm thu.

Upload/Storage hoãn, không tải tệp. Không Logs/stress test/AI inference/giao dịch tiền. Mã UI local chưa push/deploy. Các sửa đổi About/Blog đang có trong workspace không thuộc đợt này và không bị chỉnh.

## Bằng chứng và cleanup

[Các probe read-only](advanced-portal-live-probes.txt) ghi kết quả committed state, [cleanup](advanced-portal-live-cleanup.txt) PASS. Trước dọn: hai khách, một hội thoại, một review hidden, bốn notice với bốn source_event, không notice cho B. Dọn ba tài khoản Auth, hai khách, lịch/bé cưng, review/notice/chat, nhân viên nhận/quyền tạm và dịch vụ inactive. Giữ bảy audit bất biến của QA Admin: bốn moderation, hai chat operation, một transfer; không tắt trigger hoặc xóa audit. Người nhận không có audit nên hồ sơ/Auth tạm xóa được. Credential ngoài repo đã xóa. Các ảnh đã xem lại, chỉ chứa dữ liệu thử.

Fixture: `node scripts/test/two_portal_live_fixture.cjs --setup --advanced`; chỉ chạy khi cần xác minh thay đổi. `advanced_portal_probe.cjs` đọc trạng thái từng giai đoạn, không tự thao tác UI và không phải chứng nhận toàn hệ thống.
