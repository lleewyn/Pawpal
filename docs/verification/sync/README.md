# Kiểm tra đồng bộ — đợt hồ sơ 25/10/2026

Đã tiếp tục đợt thú cưng: xem [kết quả và thay đổi thú cưng](pets.md). Các kết quả dưới đây vẫn chỉ nói về đợt hồ sơ, không cộng gộp thành PASS E2E toàn hệ thống.

Đợt 26/10: [kết quả lịch hẹn và sửa múi giờ](bookings.md), gồm kiểm tra RPC/RLS Cloud và browser offline. Không cộng gộp thành PASS E2E hai portal.

Đợt đơn hàng 26/10: [RPC/RLS đơn hàng và khôi phục checkout](orders.md), gồm một đơn COD tổng hợp hoàn tác và regression offline. Chưa nghiệm thu thanh toán/hoàn tiền thực tế hoặc E2E hai portal.

Đợt hỗ trợ 26/10: [RPC/RLS ticket, API và đồng bộ offline](support.md), gồm 13 assertion Cloud đã rollback, 35 test Node và Chrome offline. Chưa nghiệm thu E2E hai portal.

## Phạm vi và môi trường

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
