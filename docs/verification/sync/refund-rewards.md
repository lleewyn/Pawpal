# Hoàn tiền có điểm thưởng — 26/10/2026

Đã triển khai mã cho thu ngân đơn hàng và dịch vụ. **Migration 107 đã áp dụng lên Supabase Cloud ngày 26/10/2026**, sau xác nhận cụ thể của người dùng. Đã kiểm tra định nghĩa cả hai hàm đọc thu ngân và hai RPC ghi tiền; dữ liệu hiện có không bị sửa/xóa. [Bằng chứng áp dụng và SHA-256](refund-rewards-cloud-apply.txt). Frontend chưa push/deploy.

## Quy tắc đã được người dùng chọn

- Điểm thu hồi đợt này = làm tròn xuống `(điểm thưởng gốc × tổng tiền đã hoàn / tiền thu gốc)` trừ điểm đã thu hồi. Tính số nguyên chính xác, không cộng kết quả làm tròn riêng từng đợt.
- Chi tiêu đủ điều kiện xét hạng giảm theo cùng tỷ lệ cộng dồn. Không tự đổi hạng thành viên đã được gán; không tự phát sinh điểm thưởng khi thu tiền.
- Khách không đủ điểm: chặn toàn bộ giao dịch hoàn, không ghi tiền hoặc ledger dở dang. Lịch sử hoàn/điểm không khớp cũng yêu cầu đối soát; không sửa lịch sử cũ để bù sai lệch.
- Khóa payment/customer trong transaction; giữ nguyên quyền thu ngân, kiểm tra phiên bản, số tiền còn được hoàn, mã ngân hàng và audit/retry. Điểm thu hồi là bút toán âm mới gắn refund/payment, có khóa chống trùng; không sửa/xóa ledger đã ghi.
- Admin xem số điểm thu hồi, chi tiêu giảm và điểm còn lại trước khi xác nhận. Đổi số tiền bỏ xác nhận cũ. Xem trước bằng dữ liệu đã tải, không gọi RPC khi gõ, không thêm polling/channel.

## Bằng chứng

- [Đơn hàng: 17 kiểm tra, 160 SQL](refund-rewards-sales-cloud-rollback.txt): migration chạy lại an toàn; quyền ghi và quyền đọc metadata; xác nhận điểm bắt buộc; thiếu điểm không để lại refund; điểm biến động làm cũ phiên bản; vượt tiền; lịch sử cũ lệch; làm tròn về 0 không tạo bút toán 0; ba lần hoàn thu hồi đủ 7 điểm và chi tiêu; retry một lần/đổi payload bị chặn; A/B đọc snapshot đúng.
- [Dịch vụ: 14 kiểm tra, 147 SQL](refund-rewards-service-cloud-rollback.txt): cùng quy tắc quyền, xác nhận, thiếu điểm, phiên bản cũ, lịch sử lệch, hoàn nhiều phần và retry. Fixture dịch vụ được đánh dấu hoàn tất khi chuẩn bị; không coi đó là kiểm thử nghiệp vụ thực hiện dịch vụ.
- Cả hai lượt dùng fixture tổng hợp, migration DDL nằm trong transaction đã rollback; xác minh không còn fixture. JWT role mô phỏng qua SQL, chưa phải Auth/HTTP thật.
- Chrome với HTML và mã thu ngân thật, API giả lập: hai modal PASS; chọn khoản thu, xem trước không thêm RPC, bỏ xác nhận khi đổi tiền, chống bấm trùng, giữ bản nháp khi lỗi, retry, chặn nút khi thiếu điểm. [Ảnh đơn hàng](refund-rewards-sales-offline.png), [ảnh dịch vụ](refund-rewards-service-offline.png).
- 5 kiểm thử toán điểm PASS, gồm số lớn và đầu vào sai. [Hồi quy offline](offline-batch.txt): 13 bài Chrome, 84 test Node cùng Copilot/loyalty service PASS. Không có fixture Cloud trong batch này.

## Tái hiện khi cần

```text
node --test scripts/test/refund_loyalty.test.mjs
node scripts/test/admin_refund_rewards_ui.cjs
node scripts/test/sync_refund_rewards_sales_cloud_rollback.cjs --cloud
node scripts/test/sync_refund_rewards_service_cloud_rollback.cjs --cloud
```

Hai script Cloud chỉ kết nối khi có `--cloud`, statement timeout 8 giây/lock timeout 3 giây, luôn rollback; không chuyển tiền thật, không Logs/load test. Không cần chạy lại chỉ để đổi tài liệu. Lệnh áp dụng riêng đã chạy thành công theo xác nhận người dùng: `node scripts/database/v1/apply_refund_rewards_107.cjs --apply-cloud`.

Gateway thật N/A theo yêu cầu. Còn nghiệm thu Auth → HTTP → commit → Realtime → reload giữa hai portal và hai phiên thao tác đồng thời; không đánh dấu các ô toàn chuỗi từ kết quả SQL/offline. Số SQL không phải số request/egress của portal.
