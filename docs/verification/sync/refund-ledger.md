# Hoàn tiền, điểm thưởng và chi tiêu xét hạng — 26/10/2026

**8 kiểm tra RPC/RLS/integrity Cloud PASS**, 82 SQL statements; một lượt fixture luôn rollback, không tiền thật, không Logs/stress-test. [Kết quả](refund-ledger-cloud-rollback.txt).

## Đã xác minh

- Một đơn tổng hợp hoàn tất, khoản thu tiền mặt giả 105.000đ qua RPC Admin; retry không tạo payment thứ hai.
- Bước chuẩn bị fixture gán 100.000đ chi tiêu đủ điều kiện cho payment: User snapshot đọc eligible_spend=100.000, points=0; không tự suy điểm từ số tiền.
- RPC hoàn nhanh từ chối nguồn có eligible spend bằng `22023 / sales_refund_ledger_review_required`, không để lại refund dở dang.
- Nhánh savepoint độc lập đặt eligible spend=0 và tạo ledger thưởng 10 điểm gắn payment: RPC vẫn từ chối vì có ledger; User giữ 10 điểm/một dòng history. Nhánh này được rollback trước bước tiếp theo.
- Kết nối kiểm thử chèn refund fixture succeeded 50.000đ, eligible_refund_amount=50.000đ: User snapshot có eligible_spend=50.000, points=0. Đây là kiểm tra phép đọc trên trạng thái fixture, không phải chứng minh workflow đối soát tự tạo refund.
- B có eligible spend=0, points=0; không kế thừa thanh toán/hoàn tiền A.
- Trigger từ chối refund tiếp theo làm tổng eligible refund vượt eligible spend (23514).
- Rollback và EXISTS xác nhận không còn order/customer/auth/staff/product/config/payment/refund fixture. Ledger thưởng ở nhánh savepoint cũng đã hoàn tác.

## Ý nghĩa và phần còn lại

Chốt chặn hoàn nhanh đang hoạt động; Admin có mapping lỗi trong `tab-order-list.js`: “Khoản thu đã liên quan đến điểm hoặc xét hạng, cần đối soát sổ điểm trước khi hoàn.” Không thay schema/RPC/policy hoặc production trong đợt này.

**Chưa nghiệm thu quy trình đối soát tự thu hồi/hoàn điểm**, xử lý khách đã tiêu điểm thưởng, tính lại hạng thành viên, hoàn nhiều phần đồng thời, gateway và hai portal qua Auth/HTTP/commit/reload. Phép tính eligible spend đúng trên fixture không đồng nghĩa đã có workflow hoàn tiền trọn vẹn cho nguồn có ledger.

Tái hiện khi cần: `node scripts/test/sync_refund_ledger_cloud_rollback.cjs --cloud`; mặc định không kết nối. Statement timeout 8 giây/lock 3 giây; không COMMIT, không chạy lại chỉ để cập nhật tài liệu. Role/JWT claims mô phỏng. Số SQL statements không phải số request portal hoặc số đo egress.
