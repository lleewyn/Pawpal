# Checkout guest: giao diện tới SQL thật

Ngày 27/10/2026, Asia/Bangkok. Bổ sung kiểm thử thành công qua SQL thật cho UI shop đã nối, thay giới hạn chỉ giả lập create/receipt của đợt trước. Không sửa mã nghiệp vụ hoặc schema trong đợt này; chưa push/deploy, chưa commit giao dịch thử.

## Môi trường và dữ liệu

Frontend local ở cổng 4001; `guest_sales_browser_bridge.cjs --bridge` ở 4003 chuyển guest API sang handler thật và RPC Cloud đã cài, dưới role service trong transaction rollback. Rate limiter được bypass trong bridge, không dùng kết quả này nghiệm thu rate limit/Vercel hoặc commit/Realtime.

Hai sản phẩm, variant, tồn ban đầu 10 và voucher giảm 10.000 đ chỉ nằm trong transaction thử. Catalog lấy từ `customer_shop_catalog` dưới role anon thật, lọc đúng hai sản phẩm thử và chuyển response đó tới frontend qua route Playwright. Không dựng JSON sản phẩm mock trong ứng dụng; không commit catalog thử, không UPDATE giá/tồn hoặc giữ khóa trên dòng sản phẩm đang bán thật. Cấu hình giao hàng/thanh toán vẫn đọc public options hiện có.

## Luồng đã kiểm tra

1. Thêm sản phẩm thứ nhất số lượng 2 và thứ hai số lượng 3. Chỉ chọn sản phẩm thứ nhất để thanh toán.
2. Mở checkout guest, nhập liên hệ; chọn giao hàng. Khi chưa điền người nhận, form không cho xác nhận. Điền người nhận/SĐT riêng với chủ hồ sơ và địa chỉ thử.
3. Nhập voucher thử. Quote SQL thật tính hàng 100.000 đ, giảm 10.000 đ; phương thức giao hàng được chọn trong cấu hình hiện tại có phí 0 đ, tổng 90.000 đ. Không dùng kết quả này làm bằng chứng cho phí giao hàng khác 0.
4. Đặt hàng: handler/SQL thật tạo customer/session/order/line/hold/voucher/payment. Chỉ sau receipt mới hiển thị mã đơn, trạng thái chờ xác nhận và **chờ thanh toán**, không báo đã trả tiền.
5. Giỏ chỉ bỏ sản phẩm đã mua; sản phẩm không chọn vẫn giữ số lượng 3. Reload đọc lại cùng đơn; không gọi create hoặc dọn giỏ thêm lần nữa.
6. Gửi lại chính xác payload/request ID ban đầu qua client: SQL trả cùng Order ID sau khi tồn/voucher đã thay đổi, không thêm order/hold/payment/redemption.

Không intercept hoặc giả lập phản hồi quote/create/receipt trong lượt này. Các tên/địa chỉ/phone đều là fixture, không đụng khách thật. Không lỗi page JavaScript. Ảnh `.playwright-mcp/guest-sales-real-sql-receipt.png` đã xem; ảnh không đưa vào git.

## Bằng chứng và dọn dữ liệu

[47 SQL và kết quả ràng buộc/rollback](guest-sales-browser-rollback.txt): hai lần gọi create gồm một tạo mới và một retry, nhưng chỉ **1 đơn, 1 line, 1 hold, 1 payment, 1 redemption**, số payment succeeded bằng 0. Chạy `SET CONSTRAINTS ALL IMMEDIATE` rồi rollback, kiểm tra còn 0 fixture order/hold/payment/customer/session/product/variant/inventory/voucher.

Bridge/server thử được dừng sau kiểm tra; cổng 4000 của người dùng giữ nguyên. Không đọc Supabase Logs, không stress test, không SMS/gateway/Storage hoặc migration. Bộ Node 77 test của đợt trước không thay đổi mã nguồn; chỉ chạy syntax/whitespace cho runner và tài liệu mới trong đợt này.

## Chưa nghiệm thu

Đây là rollback qua giao diện, chưa phải đơn committed hiển thị trên Admin hoặc Realtime hai portal. Retry tuần tự đã kiểm tra; cạnh tranh sau commit vẫn mở. Voucher sau mọi kiểu lỗi/reload, đổi tài khoản, buy-now, phí giao hàng khác 0, hướng dẫn chuyển khoản/VietQR và hồi quy member đầy đủ chưa hoàn tất. Checklist V1.14 đánh phần UI chỉ xác nhận sau server receipt và giữ gate tổng thể mở.
