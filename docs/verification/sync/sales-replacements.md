# Đổi hàng và gửi bù — 26/10/2026

Đã triển khai mã Admin và trang khách; **migration 108 đã áp dụng lên Supabase Cloud ngày 26/10/2026** sau xác nhận cụ thể của người dùng. Đã xác minh RLS, quyền SELECT/không INSERT trực tiếp, RPC tạo đơn, chốt chặn hoàn tiền và trigger đồng bộ RMA. [Bằng chứng áp dụng và SHA-256](sales-replacements-cloud-apply.txt). Frontend chưa push/deploy. [33 kiểm tra Cloud/328 SQL PASS](sales-replacements-cloud-rollback.txt) trước triển khai dùng fixture và DDL trong transaction đã rollback. Chưa nghiệm thu Auth/HTTP/commit/Realtime thật giữa hai portal.

Cờ `PAWPAL_SALES_REPLACEMENTS_ENABLED` trong `scripts/api/supabase-client.js` đã bật mặc định sau khi xác minh Cloud. Các truy vấn Admin/khách dùng quan hệ mới khi cờ bật; có thể tắt riêng cờ để trở về truy vấn cũ khi cần. Hai bài Chrome xác minh nhánh bật bằng mock transport.

## Hành vi

- Admin mở yêu cầu trong chi tiết đơn gốc và chọn **Tạo đơn đổi hàng** hoặc **Tạo đơn gửi bù**.
- Đổi hàng yêu cầu đã nhận và kiểm định hàng cũ. Admin có thể tìm SKU thay thế; số lượng mỗi dòng phải đúng RMA, không tự tăng số lượng. Giá đơn thay thế và phí giao là 0 theo xác nhận không thu thêm tiền; không có luồng thu chênh lệch trong tính năng này.
- Gửi bù dùng đúng SKU gốc, không bắt nhận hàng chưa được giao. Không tự nhập lại kho khi tạo đơn gửi bù. Nhập lại kho hàng cũ là nghiệp vụ xác nhận nhận/kiểm định riêng.
- Mỗi RMA có một đơn thay thế liên kết, cùng chủ đơn và thông tin người nhận của đơn gốc. Khi tạo, chỉ giữ tồn khả dụng; thiếu tồn thì rollback cả đơn, liên kết và lượt giữ.
- Đơn thay thế dùng quy trình đơn hàng hiện có: xác nhận → giao → hoàn tất, cùng kiểm tra quyền, phiên bản và retry. Khi giao xuất kho một lần; hoàn tất không xuất thêm. Ghi trạng thái/vận đơn làm tăng revision RMA để trang khách cập nhật từ channel hiện có.
- Hủy trước giao giải phóng giữ kho. RMA chưa nhận hàng chuyển hủy; RMA đã nhận hàng giữ trạng thái đã nhận để lịch sử nhập kho vẫn được tính vào giới hạn hàng trả. Đơn thay thế đã hủy vẫn có liên kết lịch sử; đổi lại trường hợp này cần đối soát, không tự sinh đơn tiếp theo trên cùng RMA.
- Admin và khách có thể mở đơn thay thế, xem trạng thái và vận đơn. Khách xác nhận nhận đơn cũng hoàn tất RMA. Dữ liệu đơn và liên kết chỉ đọc được theo quyền Admin hoặc đúng chủ đơn.
- Không tạo payment, thưởng điểm, quy đổi điểm hoặc voucher mới. Có hoàn tiền trước đó thì phải đối soát trước khi tạo đơn thay thế; khi đơn thay thế chưa hủy, RPC thu ngân chặn hoàn tiền độc lập để tránh bồi hoàn hai lần.
- SKU, số lượng và giá của đơn thay thế đã tạo không được sửa trực tiếp để phát sinh thu thêm tiền. Bảng liên kết chỉ cấp SELECT cho authenticated; chỉ RPC có kiểm tra quyền mới tạo được liên kết.

## Kiểm tra đã chạy

- SQL/RLS: cả hai nhánh đổi và gửi bù; chặn đổi khi chưa nhận; thiếu tồn không để lại đơn; gửi bù sai SKU; sai phiên bản/số lượng/xác nhận; A/B/Guest không được ghi; retry/đổi payload/tạo đơn thứ hai; tổng 0 và đúng người nhận; giữ kho không xuất sớm; chặn vừa hoàn tiền vừa gửi hàng; không nhận/nhập lại lần hai; hủy giữ lịch sử nhận hàng; giao/hoàn tất retry không xuất trùng; khách xác nhận nhận hàng; cấm sửa giá/phí và sửa liên kết trực tiếp; owner đọc đúng/B không đọc chéo; không phát sinh tiền hoặc điểm.
- Chrome Admin với HTML và module thật, API giả lập: trường bắt buộc; tìm SKU tối thiểu hai ký tự, debounce 300ms, dùng RPC có sẵn giới hạn 10 kết quả và cache 30 giây; tên sản phẩm được trình bày bằng text; đúng số lượng; bấm trùng; retry giữ request ID; giữ bản nháp khi lỗi; khóa SKU gửi bù; hiển thị vận đơn liên kết. [Ảnh modal](sales-replacement-admin-offline.png).
- Chrome khách với HTML/module thật, API giả lập: hiện đơn gửi bù/trạng thái/vận đơn/liên kết, không hiển thị hướng dẫn trả lại hàng cho gửi bù, cập nhật hoàn tất qua channel cũ, escape nội dung và xóa dữ liệu khi đổi tài khoản. [Ảnh timeline](sales-replacement-customer-offline.png).
- Hồi quy offline: **14 bài Chrome/85 test Node cùng Copilot/loyalty service PASS**. [Kết quả](offline-batch.txt). Không có fixture Cloud trong batch này.

## Tái hiện khi cần

```text
node scripts/test/admin_sales_replacements_ui.cjs
node scripts/test/user_return_detail_ui.cjs
node scripts/test/sync_sales_replacements_cloud_rollback.cjs --cloud
```

Script Cloud chỉ kết nối khi có `--cloud`, statement timeout 8 giây/lock timeout 3 giây; mọi thay đổi luôn rollback. JWT claims mô phỏng, không giao hàng/chuyển tiền thật, không dùng Supabase Logs hoặc load test. 328 SQL không phải số request hoặc số đo egress của portal.

Migration: `scripts/database/v1/108_sales_replacements.sql`; lệnh triển khai riêng: `node scripts/database/v1/apply_sales_replacements_108.cjs --apply-cloud`. Migration thêm bảng liên kết có RLS, RPC tạo đơn và các trigger bảo vệ/đồng bộ; không sửa/xóa dữ liệu nghiệp vụ hiện có. Không mở thêm Realtime channel, không thêm polling hoặc truy vấn tải toàn bộ sản phẩm.

## Còn nghiệm thu

Đợt bổ sung: [11 kiểm tra giao diện→HTTP→SQL rollback và Admin Auth/PostgREST chỉ đọc](sales-replacements-http.md) PASS. Có kiểm chứng HTTP đọc A/B đồng thời trên transport SQL tuần tự, chưa phải hai kết nối ghi đồng thời. Đăng nhập Admin thật và quan hệ PostgREST đã xác minh; chưa thay nghiệm thu commit/Realtime hai portal.

Frontend push/deploy; Auth khách và giao diện đầy đủ hai portal qua HTTP/commit/reload/Realtime thật; hai phiên Admin tạo hoặc giao đồng thời. Các kiểm tra SQL tuần tự xác nhận khóa/idempotency, không thay thế kiểm thử hai kết nối ghi đồng thời. Gateway thật N/A theo yêu cầu.
