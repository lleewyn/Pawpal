# Khôi phục voucher và kiểm tra Mua ngay

Ngày 27/10/2026, Asia/Bangkok. Bổ sung nhớ voucher đúng phạm vi checkout guest và kiểm tra nút Mua ngay thật. Không migration, commit giao dịch, push hoặc deploy.

## Thay đổi

`guest-checkout-preferences.mjs` giữ bản nhớ trong sessionStorage riêng cho guest: mode cart/buynow, variant/quantity và mã giảm giá. Không nhận/lưu tên, phone, địa chỉ, token hay giá. Sắp xếp dòng hàng để thứ tự không làm mất bản nhớ; khác mode, variant hoặc số lượng thì không tự điền mã cũ. Dữ liệu hỏng/không đọc được không được dùng và không tự xóa.

Checkout lưu mã đang nhập khi thay đổi hoặc trước khi quote. Reload chỉ điền lại mã, không khôi phục số giảm giá hoặc tự xác nhận mã còn hợp lệ: bắt buộc quote server lại. Sau receipt thành công chỉ xóa bản nhớ khớp đơn đó; không xóa mã của scope khác. Phiên không lưu được bản nhớ báo lỗi thực tế trước khi tiếp tục quote.

Nút Mua ngay hiện có được giữ, không đổi dữ liệu giỏ member. Checkout đọc đúng variant/quantity của buy-now, quote giá thật và dọn riêng snapshot buy-now sau receipt. Không trừ số lượng khỏi giỏ guest đang có.

## Bằng chứng

[83 SQL / ràng buộc / rollback](guest-sales-recovery-rollback.txt). Cùng mô hình bridge của đợt checkout trước: catalog RPC anon thật từ hai sản phẩm/stock/voucher thử chưa commit; không sửa hoặc giữ khóa sản phẩm đang bán. Guest actions đi handler thật/Cloud SQL trong một transaction rollback, rate limiter bypass trong bridge.

Playwright thực hiện:

1. Cart có sản phẩm 1 số lượng 2, sản phẩm 2 số lượng 3. Chọn chỉ sản phẩm 1, nhập contact và voucher. Quote thật xác nhận mã được áp dụng.
2. Lượt tạo đầu bị route Playwright trả **503 trước khi đến server**. Giỏ giữ nguyên; reload giữ mã voucher và request ID. Không lưu contact nên khách nhập lại contact; không giả vờ đã xác minh chủ hồ sơ bằng dữ liệu browser.
3. Quote lại, gửi có chủ đích cùng ID; create/receipt SQL thật thành công. Chỉ dọn sản phẩm đã mua và xóa preference đã dùng.
4. Bấm Tiếp tục mua sắm rồi mở product detail, bấm nút **Mua ngay thật**. Checkout không yêu cầu đăng nhập, tái sử dụng contact do context server xác nhận và không kế thừa voucher cart. Quote thật 50.000 đ, tạo đơn/receipt thật trong transaction.
5. Sau Mua ngay, giỏ sản phẩm 2 vẫn nguyên số lượng 3. Snapshot/flag buy-now được dọn; mã yêu cầu đơn mới khác đơn cart. Không lỗi page JavaScript.

Ba lần bấm tạo gồm một lỗi trước server và **hai lần create SQL thành công cho hai đơn riêng**. DB có hai line/hold/payment pending, một redemption, không payment succeeded. Chạy deferred constraints rồi rollback: còn 0 fixture order/hold/payment/customer/session/product/variant/inventory/voucher. Không giữ dữ liệu fixture hoặc xóa ledger/audit đã commit.

**81 test Node PASS**: bộ 77 cũ và bốn test cho giữ voucher không PII, phân biệt scope, thứ tự dòng/cleanup và storage hỏng/bị chặn. Syntax/whitespace PASS. Ảnh `.playwright-mcp/guest-buy-now-real-sql-receipt.png` đã xem, không đưa vào git. Bridge có cờ `--recovery-run` để giữ báo cáo đợt trước riêng. Các server thử được dừng sau kiểm tra.

## Phần còn mở

Không coi 503 giả lập là lỗi Cloud thật. Chưa nghiệm thu mọi tình huống mạng/storage, voucher hết lượt sau cạnh tranh, commit hai portal, chuyển tài khoản đầy đủ hoặc hướng dẫn thanh toán chuyển khoản/VietQR. Không có gateway/SMS/upload. Checklist V1.15 chỉ đánh các trường hợp đã kiểm chứng, giữ gate tổng thể mở.
