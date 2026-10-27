# Kiểm tra đồng bộ — đợt hồ sơ 25/10/2026

V1.27: [Checkout committed hai cổng, giỏ A/B, nhiều bé/phiên/quyền/INSERT và review](guest-checkout-e2e-release-review.md). Guest tạo đơn → Admin nhận/xác nhận/hủy → khách thấy đúng trạng thái, không thu tiền/xuất kho. Giỏ guest/A/B=3/2/1 qua Auth thật và reload. Hai bé trùng tên tạo hai lịch riêng, cả hai INSERT đến Admin; same-phone khác owner bị chặn, expiry/revoke 401. Đã dọn mọi fixture, giữ sáu audit. 93 test Node, sáu Chrome, 33 kiểm tra/336 SQL PASS; 103 file syntax. Vercel trang chính 200 nhưng API guest mới 404; chưa push/deploy. OTP giả lập/concurrency/gate phát hành còn mở.

Phạm vi OTP chốt 27/10: chỉ dùng OTP giả lập, không triển khai/chờ SMS thật. Checklist V1.26 chuyển nghiệm thu sang challenge giả lập qua UI/server và liên kết guest đúng binding. Test login committed V1.25 không thay cho luồng OTP; nhánh liên kết 116 hiện chặn simulator nên còn phải rà/nối. Các dòng “chưa SMS thật” phía dưới là ghi nhận lịch sử, không phải điều kiện triển khai hiện tại.

Guest committed 27/10: [Admin xác nhận lịch, liên kết giữ ID và đăng nhập A/B](guest-committed-two-portal.md). Sửa GUEST-RT-01 bằng cách bỏ đăng ký `room_type` cũ; 27 bảng hợp lệ, Admin tự nhận sửa tên bé và nhãn Thành viên. Guest tạo spa committed, Admin duyệt, khách đọc confirmed; A thấy lại bé/lịch sau login, B bị chặn lịch A. Hai Auth/khách và bé/lịch thử đã dọn, giữ hai audit. Checklist V1.25; không OTP/SMS, migration hoặc push/deploy. INSERT sau sửa/checkout committed/nhiều writer còn mở.

Hoàn thiện chức năng guest 27/10: [sửa hồ sơ, xem giờ/nhân viên, mã tra cứu riêng và lỗi máy chủ tại ô](guest-features-completion.md). Migration 120–123 Cloud; 91 test Node PASS. Chrome → HTTP → SQL thật 60 query, thêm/sửa bé giữ ID, đổi contact/xoay cookie, slots, tạo spa, xóa cookie rồi recovery; rollback 0 fixture. Năm RPC mới khớp body/quyền qua một query metadata. Checklist V1.24; API/UI chưa push/deploy, Auth thật/cạnh tranh sau commit/Admin–User Realtime còn mở.

Checkout guest 27/10: [validation tại ô và retry sau lỗi uncertain](guest-stage4-checkout-validation.md). Chrome module thật/API fixture PASS, 24 test giỏ/voucher/client PASS. Khóa trước khi cấu hình sẵn sàng; dữ liệu sai không quote, nhận tại cửa hàng bỏ lỗi địa chỉ ẩn. Lỗi giữ form/giỏ/mã, receipt trước retry; checklist V1.23, không Cloud/migration/push/deploy hoặc nghiệm thu cạnh tranh sau commit.

Form chọn lịch 27/10: [validation spa/hotel/taxi tại ô](guest-stage4-schedule-validation.md). Chrome module thật offline PASS: chặn giờ/phòng/địa chỉ/quãng đường/độ dài sai trước quote, focus/ARIA và xóa giờ về khi một chiều. Hồi quy ba múi giờ và bốn test PASS. Checklist V1.22; không Cloud/migration/push/deploy, lỗi nghiệp vụ server và Auth/commit hai portal còn mở.

Form thêm bé guest 27/10: [lỗi tại ô và giữ dữ liệu khi lưu thất bại](guest-stage4-pet-validation.md). Chrome module thật/transport fixture PASS: không gửi khi sai, focus/ARIA, retry cùng mã rồi chọn Pet ID. Hai test context và syntax PASS; không gọi Cloud/migration/push/deploy. Checklist V1.21; mục lỗi toàn bộ đặt lịch vẫn mở.

Admin tìm guest 27/10: [tìm tại quầy, đơn và lịch theo contact tự khai](guest-admin-search.md). Migration 119 Cloud sau 9 nhóm kiểm tra/72 SQL rollback + reverse; giữ ACL/invoker, thêm `customer.read` cho tìm đơn/lịch. POS hiện loại khách/nguồn số, Chrome transport fixture PASS. Checklist V1.20; chưa Auth/commit hai portal hoặc push/deploy frontend.

Admin sửa contact guest 27/10: [giữ số tự khai khi lưu hồ sơ](guest-admin-profile-contact.md). Migration 118 Cloud sau 9 kiểm tra/65 SQL rollback + reverse; ACL/SECURITY INVOKER giữ nguyên, apply không sửa hàng có sẵn. Rename không tạo phone chính; đổi self-contact thu hồi session, không gộp/chiếm số member. UI source-note test fixture PASS; checklist V1.19, chưa Auth/commit hai portal hoặc push/deploy frontend.

Admin contact guest 27/10: [contact tự khai, số chính và snapshot người nhận](guest-admin-contact.md). Migration 117 Cloud sau 7 kiểm tra/36 SQL rollback + reverse, ACL/signature giữ nguyên, không sửa dữ liệu khách hoặc tạo phone chính. Frontend local hiện contact fallback có nhãn chưa xác minh, tách owner/receiver đơn; hai UI fixture tests và tổng Node 88 PASS. Chưa Admin Auth/E2E committed hoặc push/deploy frontend; checklist V1.18.

GĐ-04 hotel/taxi 27/10: [hotel hai bé trùng tên và taxi khứ hồi UI→SQL thật](guest-stage4-hotel-taxi-ui.md) PASS trong rollback. Hotel 39 SQL/hai pet/một owner/một room booking; taxi 33 SQL/một pet/một trip, đúng Pet ID/pending/0 payment, 0 fixture sau rollback. Không response fixture cho quote/create/receipt. Checklist V1.17 cập nhật tái sử dụng dữ liệu; chưa commit/Realtime hai portal hoặc push/deploy.

GĐ-04 ranh giới tài khoản 27/10: [hủy response/ghi giỏ cũ qua lần đổi tài khoản](guest-stage4-account-boundary.md). Thêm generation in-memory dùng chung, 83 test Node PASS. Event/storage/Web Locks hai tab thật PASS với trạng thái Auth/response ghi giả lập; app stale-member nhận RPC 401 và không fallback giỏ guest. Guest quote đọc Cloud thật vẫn PASS. Checklist V1.16 giữ mở Auth login thật/committed hai portal; chưa migration/push/deploy.

GĐ-04 khôi phục checkout/buy-now 27/10: [voucher theo scope, lỗi 503/reload và nút Mua ngay](guest-stage4-checkout-recovery.md). 81 test Node PASS. Một create bị intercept 503 trước server; sau đó UI→SQL thật tạo hai đơn trong rollback, 83 SQL/0 fixture còn lại. Voucher/request ID được giữ, buy-now không tiêu giỏ hiện có. Checklist V1.15; chưa commit/Realtime hai portal hoặc push/deploy.

GĐ-04 checkout SQL UI 27/10: [giao hàng/voucher/create/receipt/reload/retry tuần tự](guest-stage4-sales-sql-ui.md) PASS qua handler/Cloud SQL thật trong rollback, catalog anon từ hai sản phẩm thử chưa commit. 47 SQL: 1 đơn/line/hold/payment/redemption, 0 payment succeeded, 0 fixture còn lại. Không khóa catalog đang bán hoặc giả lập response tạo đơn. Checklist V1.14 đánh thêm UI xác nhận sau receipt; chưa commit/Realtime Admin/User, migration hoặc push/deploy.

GĐ-04 tra cứu lịch guest 27/10: [receipt → nút tra cứu → panel theo cookie](guest-stage4-booking-lookup.md). Luồng spa/UI/HTTP/SQL thật qua rollback PASS, một pet/một lịch/0 fixture còn lại; phiên mới không có binding nhận 401, không private data. Refresh thủ công, không polling/phone fallback; UI/mobile/chuyển tài khoản dùng intercept riêng. 77 test Node PASS, checklist V1.13; chưa nghiệm thu phone/OTP sau mất phiên, committed hai portal hoặc deploy.

GĐ-04 booking local 27/10: [chọn/thêm pet, quote/create/receipt guest](guest-stage4-booking-ui.md). Spa Playwright → HTTP → SQL Cloud thật trong rollback PASS, 37 SQL/một pet/một booking, còn 0 fixture; hotel/taxi/mobile và nhãn trạng thái test UI có intercept riêng. Sửa validator để nhận UUID canonical cũ từ catalog thật; 72 test Node PASS. Checklist V1.12 đánh thêm ba mục booking local và không redirect login/OTP; chưa commit hai portal, migration, push hoặc deploy.

GĐ-04 shop local 27/10: [giỏ/checkout guest và khôi phục yêu cầu](guest-stage4-shop-ui.md). Thêm giỏ riêng variant/quantity, UI không login, cấu hình/quote Cloud thật; actual product button/mobile và Web Locks hai tab PASS. Create/receipt thành công được intercept cho kiểm tra UI, không đơn thật committed. Sửa unbound receipt giữ signed cookie/404 để thử lại cùng mã; token sai/thu hồi vẫn deny. 68 test Node PASS; checklist V1.11 đánh ba mục nối nhánh shop, gate và kiểm thử committed/member/booking còn mở. Chưa push/deploy.

GĐ-03/chuẩn bị GĐ-04 ngày 27/10: [tồn kho đồng thời và lớp gọi API guest](guest-stock-and-browser-client.md). Năm kiểm tra hai kết nối Cloud PASS, chờ khóa variant thật và hết tồn trong transaction, fixture rollback. Thêm client dùng chung, bootstrap có Web Locks/gom thao tác ghi/timeout không tự retry; chưa import vào UI. 60 test Node PASS, gồm 10 test client transport/locks giả lập. Checklist V1.10 giữ mở concurrency sau commit và toàn bộ giao diện.

GĐ-03 kiểm thử bổ sung 27/10: [nhiều bé và khóa hai writer](guest-stage3-multi-pet-concurrency.md). 33 kiểm tra booking/336 SQL trên RPC đã cài và ba kiểm tra hai kết nối Cloud PASS; fixture rollback, không migration/commit. Hai bé cùng hồ sơ có lịch riêng, receipt/retry đúng; writer thứ hai chờ khóa token rồi tiếp tục sau rollback. Chưa nghiệm thu cạnh tranh sau commit/tồn kho, UI hoặc đóng toàn bộ GĐ-03. Checklist V1.9 chỉ đánh thêm API nhiều bé.

GĐ-03 Auth link 27/10: [migration 116 và chuẩn hóa phone chung](guest-stage3-account-link.md). Đã áp dụng Cloud sau 22 kiểm tra HTTP/SQL rollback, SQL đảo/quyền; hai REST negative probe và 50 test Node PASS. Giữ owner/ID, xung đột không merge, thu hồi guest token. OTP/verifier/password API trong HTTP test được mock; chưa SMS thật, UI/deploy, concurrency hoặc toàn bộ GĐ-03. Nhánh link mới từ chối OTP giả lập; không đổi SMS mode hoặc yêu cầu OTP cho giao dịch guest.

GĐ-03 checkout guest 27/10: [quote/create/receipt/migration 115](guest-stage3-sales.md). 115 đã áp dụng Cloud sau 24 kiểm tra HTTP→SQL rollback, SQL đảo/quyền; ba REST probe, deferred constraints sau cài và 41 test Node PASS. Không cần pet để mua, không tạo profile khi quote, giữ kho/voucher/payment pending và tách người nhận/contact; source member giữ nguyên. Backend/UI chưa phát hành; concurrency/commit hai portal, liên kết Auth contact mới và chuẩn hóa legacy chưa xong, gate GĐ-03 còn mở.

GĐ-03 booking guest 27/10: [quote/create/receipt và migration 114](guest-stage3-booking.md). Đã áp dụng Cloud sau 31 kiểm tra HTTP→SQL rollback, SQL đảo/quyền; hai REST negative probe, hai guard sau cài và 40 test Node PASS. Spa/hotel/taxi, retry, owner/session, giá cũ, phòng và duration theo variant; hàm member giữ nguyên. Backend local chưa push/deploy, chưa có shop guest hoặc UI/commit/Realtime/concurrency acceptance; gate GĐ-03 chưa đạt.

GĐ-03 một phần 27/10: [API phiên guest và lưu bé](guest-stage3-session-pets.md). Migration 113 service-only đã áp dụng Cloud; 24 kiểm tra HTTP→SQL rollback, hai REST probe thật và 39 test Node PASS. Cookie ký/HttpOnly, tách hồ sơ theo phiên, pet retry/owner isolation; không tạo hồ sơ khi mở trang. Backend local chưa push/deploy; chưa có quote/submit booking/order guest, E2E/concurrency hoặc liên kết Auth hồ sơ contact mới. Gate GĐ-03 chưa đạt.

GĐ-02 khách vãng lai 27/10: [migration 112 nền phiên/contact đã áp dụng Cloud](guest-stage2-schema.md). 28 kiểm tra DDL rollback, SQL đảo có chặn mất dữ liệu, metadata sau apply và sáu guard rollback PASS. Fingerprint cột cũ của 35 customer giữ nguyên; không thay RLS/RPC/index primary phone, chưa có API/UI guest hoặc backup/restore toàn DB. Đã cập nhật mục 5 checklist, chưa đánh GĐ-03.

GĐ-01 khách vãng lai 27/10: [đặc tả phiên, phone trùng và quyền dữ liệu](guest-stage1-rules.md) hoàn tất theo yêu cầu hiện có; chưa phải test tính năng PASS. [Preflight Cloud chỉ đọc](guest-data-integrity-readonly.txt): 33 dòng phone, không trùng/sai định dạng, không bé thiếu chủ/lịch sai chủ/chi tiết mất cha. Đã cập nhật mục 4 và 5.1 checklist; chưa thay schema hoặc chạy giao dịch guest.

GĐ-00 khách vãng lai 26/10: [khảo sát hoàn tất và giới hạn](guest-stage0-audit.md). Đã đối chiếu deployment `51548731`/ba asset thật, 13 file nền, 12 bảng cùng constraints/indexes/RPC/RLS; lưu catalog schema ngoài webroot. Chỉ đọc metadata, không migration hoặc tạo giao dịch. Catalog snapshot chưa phải backup pg_dump đã kiểm thử restore. GĐ-01 trở đi và guest booking/checkout chưa nghiệm thu.

Guest identity 26/10: [liên kết tài khoản và lỗi tra cứu theo phone](guest-activation-and-lookup.md). Fixture committed giữ Customer/Pet/Appointment ID; Admin Realtime đổi loại khách đúng; đăng ký/OTP UI chưa nghiệm thu. Phát hiện GUEST-LOOKUP-01, vá local backend owner gate và bỏ browser fallback; 35 test + hai HTTP deny thật PASS. Bản vá chưa phát hành, token tra cứu riêng cho guest còn thiếu.

SLA nghiệp vụ 26/10: theo người dùng đã bật hạn **5 phút** cho yêu cầu chuyên viên trên Cloud. [Bằng chứng](chat-sla-5min-cloud.txt): yêu cầu mới/retry đúng hạn trong rollback test, tám hội thoại cũ nguyên trạng; bảng rule Admin qua MCP hiển thị 300 giây/Hiệu lực. Chưa coi đây là countdown UI toàn chuỗi hoặc tự phân công. Các ghi chú “rule rỗng” ở đợt trước đã được thay bằng cập nhật này.

UI bổ sung 26/10: [chuyển ca qua context người nhận riêng, moderation published/hidden sau commit](advanced-portal-live-ui.md) PASS trong phạm vi fixture. Sửa khóa thao tác chat trong lúc nhận ca và quyền compose đúng người phụ trách, kiểm lại bằng request thật; ba hồi quy UI chat và năm test SLA PASS. Dọn cả tài khoản/quyền nhận tạm và dịch vụ inactive riêng, giữ bảy audit; chưa thay public active page/recipient reply-resolve/SLA nghiệp vụ.

Hai giao diện thật qua Playwright MCP 26/10: [kết quả, hai lỗi UI đã sửa và giới hạn](two-portal-live-ui.md). Admin và khách đăng nhập riêng, kiểm ticket hai chiều/giải quyết/reload, chat tiếp nhận/trả lời/hoàn tất/reload, review chờ duyệt→ẩn và thông báo, cô lập A/B. Hồi quy 18 test header PASS. Dọn toàn bộ fixture, giữ bảy audit bất biến. Frontend local chưa phát hành; chưa nghiệm thu UI publication/transfer/SLA hoặc toàn hệ thống.

Thông báo ticket/đánh giá 26/10: [migration 110 và kiểm thử luồng thật](customer-event-notifications.md). Đã áp dụng Cloud; 14 kiểm tra SQL rollback, 11 kiểm tra ticket Auth/commit/Realtime và 8 kiểm tra review riêng tư Auth/commit/Realtime PASS. Dọn fixture, giữ năm audit bất biến; không công bố review thử nghiệm. Upload/Storage hoãn theo yêu cầu người dùng. Các kết quả mới này thay ghi chú chưa kiểm tra Auth/Realtime trong các đợt cũ bên dưới, trong đúng phạm vi ticket/review; chưa nghiệm thu toàn bộ hai giao diện.

Chuyển chat 26/10: [8 kiểm tra Auth/gateway Vercel/commit/Realtime thật](chat-and-reviews.md) PASS, 47 request. Chuyển retry một lần, người nhận nhận Realtime, người cũ mất quyền trả lời, khách không thấy ghi chú nội bộ. Dọn fixture/quyền/tài khoản tạm, giữ hai audit bất biến. Người nhận chưa gửi/resolve qua Auth thật; chưa full UI E2E.

SLA theo rule 26/10: [SLA-01 và bản sửa](chat-sla.md), tái hiện rule bật nhưng không đặt deadline. Migration 109 qua 13 kiểm tra Cloud/84 SQL rollback và đã áp dụng Cloud, xác minh trigger/quyền; 5 test hiển thị và batch 14 bài Chrome/87 test Node PASS. Chưa cấu hình rule thật hoặc nghiệm thu engine tự động/phân công; UI local chưa push/deploy.

Đợt HTTP/Auth đổi hàng 26/10: [11 kiểm tra giao diện→HTTP→Cloud SQL rollback và Admin Auth/PostgREST thật chỉ đọc](sales-replacements-http.md) PASS. Lượt rollback dùng 15 request nghiệp vụ; lượt Auth chỉ đọc dùng 6 request Auth/REST, GET tối đa một dòng. Chưa nghiệm thu commit/Realtime hai portal hoặc hai DB writer đồng thời.

Đổi hàng/gửi bù 26/10: [hành vi và bằng chứng](sales-replacements.md). 33 kiểm tra Cloud/328 SQL rollback PASS; Admin và khách Chrome offline PASS; batch 14 bài Chrome/85 test Node PASS. Migration 108 đã áp dụng Cloud theo xác nhận người dùng, xác minh RLS/RPC/trigger; cờ giao diện đã bật mặc định trong mã local. Frontend chưa push/deploy và chưa nghiệm thu E2E hai portal.

Hoàn tiền có điểm thưởng 26/10: [quy tắc, mã và bằng chứng](refund-rewards.md). Đơn hàng 17 kiểm tra/160 SQL, dịch vụ 14 kiểm tra/147 SQL trong transaction rollback; hai modal Chrome PASS. Batch offline 13 bài Chrome/84 test Node PASS. Migration 107 đã áp dụng Cloud theo xác nhận người dùng, kiểm tra đủ bốn hàm thu ngân; frontend chưa push/deploy, chưa nghiệm thu E2E hai portal.

Đã tiếp tục đợt thú cưng: xem [kết quả và thay đổi thú cưng](pets.md). Các kết quả dưới đây vẫn chỉ nói về đợt hồ sơ, không cộng gộp thành PASS E2E toàn hệ thống.

Đợt 26/10: [kết quả lịch hẹn và sửa múi giờ](bookings.md), gồm kiểm tra RPC/RLS Cloud và browser offline. Không cộng gộp thành PASS E2E hai portal.

Đợt đơn hàng 26/10: [RPC/RLS đơn hàng và khôi phục checkout](orders.md), gồm một đơn COD tổng hợp hoàn tác và regression offline. Chưa nghiệm thu thanh toán/hoàn tiền thực tế hoặc E2E hai portal.

Đợt hỗ trợ 26/10: [RPC/RLS ticket, API và đồng bộ offline](support.md), gồm 13 assertion Cloud đã rollback, 35 test Node và Chrome offline. Chưa nghiệm thu E2E hai portal.

## Phạm vi và môi trường

Đợt chat/đánh giá: [13 kiểm tra handoff + 10 kiểm tra review Cloud](chat-and-reviews.md), fixture rollback sạch;4 test owner API offline PASS. Chưa nghiệm thu moderation UI hoặc Auth/Realtime thật.

Cập nhật phân trang: migration104 loyalty và105 support đã áp dụng Cloud sau xác nhận cụ thể, RPC cũ được giữ nguyên. UI local bật mặc định; Chrome loyalty/support paging PASS và batch mở rộng11 bài Chrome/75 test Node PASS. Frontend mới chưa push/deploy; chưa nghiệm thu toàn chuỗi hai portal.

Đợt hồi quy gộp 26/10: [kết quả và khoảng trống còn lại](batch-review.md), 9 bài Chrome/75 test Node cùng Copilot/loyalty service PASS; chỉ offline, không thay nghiệm thu E2E.

Đợt nhánh đổi trả 26/10: [từ chối và hàng không bán lại](return-branches.md), 9 kiểm tra Cloud/3 test offline PASS, fixture rollback; sửa local lý do từ chối trên User timeline.

Đợt ledger khi hoàn tiền 26/10: [8 kiểm tra chốt chặn và chi tiêu ròng](refund-ledger.md), fixture rollback sạch; chưa nghiệm thu workflow tự thu hồi/hoàn điểm.

Đợt đổi trả/hoàn tiền 26/10: [13 kiểm tra RPC/RLS](returns.md), một đơn/return/refund tổng hợp đã rollback; chưa test gateway hoặc điểm thưởng/chi tiêu xét hạng khi hoàn tiền.

Đợt áp voucher/hủy COD 26/10: [10 kiểm tra RPC Cloud](voucher-order.md), một đơn/voucher tổng hợp rollback sạch. Chưa kiểm tra hoàn tiền sau thanh toán hoặc E2E hai portal.

Tiến độ điểm/voucher 26/10: [Realtime, ledger và đổi điểm](loyalty.md), 7 test Node/kiểm tra service và 13 kiểm tra RPC/RLS Cloud PASS; fixture đã rollback. Chưa nghiệm thu E2E hoặc áp voucher vào đơn.

Tiến độ thông báo 26/10: [gom sự kiện, vòng đời header và đánh dấu đọc](notifications.md), 18 test offline và 8 kiểm tra RPC/RLS Cloud PASS; fixture đã rollback. Chưa nghiệm thu E2E thông báo.

Người thực hiện: Codex. Nhánh nền `main`, SHA `d8bb56e918105865d38d01592e4255d480f65849`, kèm working tree chưa commit. Người dùng giao quyền chọn môi trường: chọn mã local và kiểm tra tích hợp RPC/RLS trên Supabase Cloud `cpzuvaplseielhgcnqrn`, bằng fixture trong transaction luôn hoàn tác. Không push/deploy.

Đây là đợt đầu của checklist đồng bộ. Chưa xác nhận toàn hệ thống hoặc bản website đang deploy. Browser offline dùng origin giả `http://pawpal.test` với mọi request bị chặn; bài SQL dùng Cloud thật với role `authenticated`/`anon` và JWT claims mô phỏng trong transaction. Bài SQL không kiểm tra Supabase Auth qua HTTP, WebSocket Realtime hay hai màn hình sau commit.

## Kết quả đã chạy

| Bài kiểm tra | Kỳ vọng | Thực tế | Kết quả |
|---|---|---|---|
| Hồ sơ A qua RPC | Lưu tên rồi đọc lại đúng | Snapshot trả đúng fixture A và tên mới | PASS SQL |
| User → Admin | Actor admin đọc bản ghi A đã sửa | Đúng tên mới, truy vấn theo ID fixture | PASS SQL |
| Admin → User | RPC admin sửa; A đọc lại snapshot | Đúng tên admin vừa lưu | PASS SQL |
| Xung đột/validation | Revision cũ và tên rỗng bị từ chối | PT409/22023; dữ liệu giữ nguyên | PASS SQL |
| Cách ly B | B không đọc A và không gọi RPC sửa của admin | Không có hàng/quyền; 42501 | PASS SQL |
| Guest | Không đọc snapshot riêng | 42501 | PASS SQL |
| Số dư | User đọc được view số dư theo ID | Fixture có số dư 0, không tải lịch sử điểm | PASS SQL |
| Dọn fixture | Không tồn lại user/customer test | ROLLBACK, truy vấn EXISTS theo ID trả false | PASS SQL |
| Nhàn rỗi/ẩn tab | Không polling khi không có thay đổi | 60 giây đồng hồ giả lập: không có read mới | PASS browser offline |
| Sự kiện dồn | 10 sự kiện order chỉ đọc order một lần | Một query order, không query hồ sơ/pet/lịch | PASS browser offline |
| Vòng đời Realtime | Khởi tạo lặp chỉ còn một channel; tab ẩn hoãn đọc | Đúng scope customer_id, một channel; hiện lại mới đọc phần bẩn | PASS browser offline |
| Reconnect | Kết nối đầu không đọc trùng; reconnect đọc lại có giới hạn | Burst reconnect gộp thành một lượt cập nhật | PASS browser offline |
| Đổi tài khoản | Response chậm của A không render vào B | UI của B giữ nguyên; channel A được dọn | PASS browser offline |
| Lịch và giờ | Query dùng trạng thái hiện hành, giới hạn 5; UTC+7 đúng ngày | 17:30 UTC thành 00:30 ngày kế tiếp tại Việt Nam | PASS browser offline |
| Regression hồ sơ/auth | Validate/lỗi lưu không mất form; cache không thay thế xác thực | 10/10 test Node đạt | PASS offline |

Bằng chứng SQL máy đọc: [profile-cloud-rollback.txt](profile-cloud-rollback.txt), gồm 11 assertion và 51 SQL statements ở lần kiểm tra cuối. Có hai lần chạy trước trong quá trình xây dựng bài test: lần đầu gặp PT409 do test làm tròn timestamp PostgreSQL qua JavaScript Date; đã sửa test giữ timestamp dạng text đầy đủ. Lần thứ hai đạt 10 assertion; lần cuối thêm kiểm tra view số dư. Mọi lần đều rollback khi thành công hoặc thất bại.

## Những gì đã sửa

Chỉ sửa production ở `pages/user/modules/profile/profile.js`; không thay schema, policy hoặc RPC Cloud trong đợt này.

- **SYNC-B01:** bỏ đọc lại lịch/đơn mỗi 10 giây; dùng sự kiện theo khách hàng, gom sự kiện trong 200 ms, chỉ tải phần thay đổi. Khi reconnect thành công, cập nhật lại một lượt để bù sự kiện có thể bỏ lỡ.
- **SYNC-B02:** sửa regex UUID thiếu một nhóm, trước đây bỏ qua ID hợp lệ và phải thử tìm qua số điện thoại.
- **SYNC-B03:** query lịch sắp tới dùng `pending/confirmed/checked_in/in_progress`; giờ/ngày theo Việt Nam, không parse lại chuỗi ngày bản địa bằng `new Date`.
- **SYNC-B04:** đọc `customer_point_balance` theo customer ID thay tải toàn bộ ledger rồi cộng ở browser. Realtime vẫn nghe bảng giao dịch điểm vì view không phát sự kiện.
- **SYNC-B05:** dọn channel/listener khi rời module hoặc đổi actor; chặn response trễ render vào tài khoản khác; init đã dispose không tự tạo lại watcher.

Các phát hiện có bằng chứng đọc nguồn và test hồi quy sau sửa; chưa có baseline Network production trước sửa. Hai lỗi regression test cũ do fixture chưa theo code hiện hành đã được sửa trong `customer_auth_ui.test.js`: dùng nút click lưu thay submit, và bổ sung API `window.addEventListener` vào mock. Không sửa logic xác thực production để làm test qua.

## Băng thông và giới hạn kết luận

Không dùng Supabase Logs, không stress/load test, không tạo hàng loạt đơn/lịch/chat, không sửa khách thật và không nới RLS. Hai customer fixture A/B và một staff fixture chỉ tồn tại trong transaction. Đối chiếu nghiệp vụ theo ID; chỉ tải metadata của các bảng/RPC được nêu tên. Không chạy các script cũ ghi thử lên khách lấy từ `limit(1)`.

Polling cũ có thể tạo 12 query/phút cho hai danh sách khi tab hiện (6 lượt × 2), chưa kể khởi tạo và Realtime. Đây là tính từ source, không phải số đo Network. Browser offline chứng minh không có polling sau sửa; chưa đo tổng bytes/egress hoặc p95 Cloud. Không tuyên bố toàn hệ thống đã được tối ưu từ các kết quả này.

## Tái hiện

- Offline: `node scripts/test/user_profile_sync_bandwidth_ui.cjs`.
- Regression: `node --test scripts/test/test_customer_profile_save.cjs scripts/test/customer_auth_ui.test.js`.
- SQL Cloud (không tự chạy lại nếu không cần): `node scripts/test/sync_profile_cloud_rollback.cjs --cloud`. Script có statement timeout 8 giây, lock timeout 3 giây, không có COMMIT; luôn ROLLBACK và kiểm tra fixture đã biến mất.

Playwright và kết nối PG dùng các dependency private hiện có trên máy, không kèm credentials trong repo. Không chạy fixture SQL ngoài transaction. Hoàn tác code bằng cách phục hồi riêng diff hồ sơ và test của đợt này; không reset toàn workspace vì còn thay đổi sản phẩm/dịch vụ/chatbot.

## Chưa kiểm tra

Luồng đầy đủ UI → HTTP API → DB commit → màn hình phía kia → reload/login lại; Auth thật cho A/B/Admin; Realtime delivery thật; các phân hệ thú cưng, đặt lịch, checkout, ticket, notification, voucher và quyền toàn hệ thống. Các case tương ứng giữ NOT RUN hoặc RETEST, không PASS từ test SQL/offline.
# Cập nhật giỏ guest 27/10/2026

**Production đã cập nhật:** `a6fec053` push main sau xác nhận, Vercel success; [smoke bằng Playwright MCP](guest-production-smoke.md) PASS các trang/form guest/đăng ký và đổi phân loại giỏ/reload. Checklist guest V1.30, đồng bộ 1.49; không nhận toàn bộ E2E production là hoàn thành.

Phát hành code: `d1aede07` đã push nhánh `feat/guest-admin-identity`, Vercel Preview thành công; [Preview yêu cầu Vercel SSO](guest-demo-preview-check.txt). Production chưa promote, không đánh dấu nghiệm thu website chính.

V1.29: [OTP giả lập guest và chống trùng](guest-demo-otp.md). Chrome thật → local API → Cloud/Auth: paired request tạo bé/lịch/đơn trả cùng ID, OTP chỉ một completion thành công; portal/reload giữ owner/bé/lịch/đơn. Đã dọn fixture, giữ audit; 86 test Node PASS. Vercel hiện chưa có bản này, không đánh dấu production đạt.

[Đổi phân loại ngay tại giỏ](guest-cart-variant.md): cập nhật ảnh/giá, giữ số lượng, gộp dòng có khóa và chặn thiếu tồn. 45 test Node và hai Chrome module thật với dữ liệu fixture PASS; checklist V1.28. Chưa push/deploy.
