# Đổi trả và hoàn tiền — 26/10/2026

**13 kiểm tra RPC/RLS Cloud PASS**, 112 SQL statements trong một lượt chạy. [Kết quả máy đọc](returns-cloud-rollback.txt). Một đơn, một yêu cầu trả hàng, một khoản thu và một khoản hoàn tổng hợp; transaction luôn rollback. Không chuyển tiền thật, không gọi cổng thanh toán, không sửa khách thật, không Logs/stress-test hoặc thay schema/RPC/policy.

## Kết quả

- Tạo đơn hai sản phẩm 50.000đ và phí giao 5.000đ bằng RPC User; Admin xác nhận/giao/hoàn tất. Ghi khoản thu tiền mặt giả 105.000đ qua RPC Admin, retry cùng ID chỉ có một payment thành công; User đọc tổng đã trả 105.000đ.
- User yêu cầu trả một sản phẩm; retry chỉ một request và một detail ở trạng thái pending, Admin đọc được. User không được tự xác nhận đã nhận hàng hoặc nhập kho.
- B không đọc được request A và không tạo yêu cầu trả cho đơn A. User không gọi được RPC nhận hàng/hoàn tiền của Admin; Guest không gọi được RPC tạo yêu cầu riêng.
- Admin nhận hàng phải xác nhận kiểm định. Nhận hàng còn bán được và retry chỉ tạo một biến động nhập lại kho +1; User đọc trạng thái received.
- Hoàn vượt khoản thu 105.000đ bị từ chối. Hoàn một phần 50.000đ và retry chỉ có một refund succeeded; gửi lại cùng ID với số tiền khác bị PT409.
- Cashier Admin và RPC tổng đơn của User cùng phản ánh số tiền ròng 55.000đ.
- ROLLBACK và truy vấn EXISTS xác nhận không còn return/refund/payment/order, actor/customer/auth/staff, sản phẩm và config fixture.

## Giới hạn và tái hiện

Bổ sung riêng: [9 kiểm tra nhánh từ chối/hàng không bán lại](return-branches.md), kèm sửa local hiển thị lý do từ chối và 3 test offline. Các nhánh này không còn chỉ dựa trên đọc source; chưa nghiệm thu UI hai portal.

Bổ sung riêng: [chốt chặn ledger và chi tiêu ròng](refund-ledger.md) đã kiểm tra 8 case Cloud; chưa chứng minh workflow tự thu hồi/hoàn điểm hoặc tính lại hạng.

`node scripts/test/sync_returns_cloud_rollback.cjs --cloud`; không có cờ thì không kết nối. Timeout statement 8 giây/lock 3 giây, không COMMIT. 112 là số SQL statements test, không phải request portal hoặc số đo egress. Kiểm tra cú pháp và diff đạt. Không chạy lại Cloud chỉ để cập nhật tài liệu.

Chưa kiểm tra UI/Auth/HTTP/commit/reload, Realtime/notification thật, luồng từ chối, đổi hàng/gửi bù, hàng không bán lại được, hoàn toàn bộ, gateway chuyển tiền, nhiều transaction đồng thời, hoặc hoàn/thu hồi điểm và chi tiêu xét hạng. Khoản thu fixture có eligible_spend_amount=0 và không có ledger thưởng; không suy kết quả này thành PASS cho hoàn tiền có điểm thưởng. Return received và refund là hai thao tác nghiệp vụ riêng, không tuyên bố tự nhận hàng là tự hoàn tiền. Mã production không đổi trong đợt này; chưa push/deploy thay đổi mới.
