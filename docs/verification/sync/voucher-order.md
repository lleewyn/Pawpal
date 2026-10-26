# Áp voucher và hủy đơn — 26/10/2026

**10 kiểm tra RPC/RLS Cloud PASS**, 89 SQL statements trong lượt thành công. [Kết quả](voucher-order-cloud-rollback.txt). Đây là kiểm tra SQL với role/JWT claims mô phỏng, chưa phải UI/Auth/HTTP/commit/reload hoặc Realtime thật.

## Phạm vi và kết quả

Một đơn COD, một SKU, một voucher và một ví voucher tổng hợp; actor A/B/Admin. Fixture mở 100 điểm, đổi voucher hết 40 điểm rồi áp vào đơn. Không thu tiền/giao hàng hoặc sửa khách thật. Không thay code production, schema/RPC/policy trong đợt kiểm tra này.

- Hai sản phẩm giá server 50.000đ, phí giao 5.000đ, voucher ban đầu giảm 10.000đ: quote đúng 95.000đ, bỏ qua `unit_price`, `discount` và `total` giả từ client.
- B biết mã voucher nhưng không có voucher cá nhân vẫn bị chặn. Điều kiện đơn tối thiểu và voucher hết hạn được kiểm tra tại server.
- Fixture đổi mức giảm sang 5.000đ: quote cũ bị PT409 và không để lại đơn dở dang. Quote mới là 100.000đ.
- Tạo/retry cùng ID chỉ ghi một lượt voucher, discount snapshot 5.000đ, ví chuyển `used`; Admin đọc payment chờ thu đúng 100.000đ.
- Voucher đã dùng không áp lại được cho quote mới.
- User hủy và retry: một lượt dùng chuyển `reversed`, có thời điểm đảo; ví trở lại `available`, Admin thấy đơn `cancelled`.
- User đọc lại ví và quote được voucher sau hủy. Điểm vẫn 60 và ledger vẫn hai dòng: hoàn lượt dùng voucher không hoàn thêm 40 điểm của giao dịch đổi voucher riêng. Đây là hành vi hiện tại đã xác minh, không tự thay chính sách.
- ROLLBACK và truy vấn EXISTS xác nhận không còn fixture đơn, sản phẩm, customer/auth, voucher/ví và config giao nhận/thanh toán/nhà vận chuyển.

## Băng thông và tái hiện

`node scripts/test/sync_voucher_order_cloud_rollback.cjs --cloud`; không có cờ thì không kết nối. Transaction luôn rollback; statement timeout 8 giây, lock timeout 3 giây. Không Logs/stress-test, không tải danh sách khách/đơn thật. 89 SQL statements không phải số request portal; chưa đo egress.

Một lượt trước đã rollback do fixture tồn 3, đơn giữ 2, quote kiểm tra dùng lại cần thêm 2 nên bị chặn tồn kho 23514 trước khi tới điều kiện voucher. Đã tăng riêng tồn SKU tổng hợp lên 5 để tách kiểm tra voucher; không sửa thuật toán tồn kho. Hai lượt đều rollback. Các thay đổi điều kiện voucher chỉ là chuẩn bị fixture bằng kết nối kiểm thử; chưa xác minh đường UI/RPC Admin sửa voucher.

## Còn thiếu

Hoàn tiền sau thanh toán, đổi trả, hoàn điểm dùng trực tiếp tại checkout, cạnh tranh nhiều transaction, đường Admin hủy đơn có voucher và nghiệm thu hai portal. Không suy kết quả hủy COD thành PASS hoàn tiền; payment trong fixture chưa thu. Chưa push/deploy.
