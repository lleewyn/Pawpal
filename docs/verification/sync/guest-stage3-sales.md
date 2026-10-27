# GĐ-03: báo giá và tạo đơn guest

Ngày 27/10/2026, Asia/Bangkok. **Migration 115 đã áp dụng Cloud; API checkout guest đã qua kiểm tra trong phạm vi dưới đây.** Backend/route còn local, chưa push/deploy hoặc nối giao diện. Không coi toàn bộ GĐ-03, mua hàng trên Vercel hoặc kiểm thử hai portal đã hoàn tất.

## Hành vi

| POST `/api/customer/guest/…` | Body | Kết quả |
| --- | --- | --- |
| `order-quote` | `{details, lines}` | Cookie ký hợp lệ, có thể chưa có hồ sơ → tính giá SKU, lượng khả dụng, phí giao và voucher công khai từ DB. Không tạo customer/pet hoặc giữ kho khi chỉ báo giá |
| `order-create` | `{requestId, expectedQuote, contact, details, lines, paymentMethodId}` | Nếu chưa có hồ sơ, tạo customer/profile/binding trong cùng transaction với đơn, chi tiết, giữ kho, voucher và khoản thanh toán chờ. Không yêu cầu tạo bé hoặc đăng nhập/OTP |
| `order-receipt` | `{requestId}` | Đúng owner và phiên tạo đơn → trạng thái/mã/tổng, dòng sản phẩm và snapshot giao nhận từ DB. Không tìm đơn bằng phone |

`contact` là name/phone tự khai của hồ sơ phiên; `details.receiver_*` là người nhận tại thời điểm đặt, có thể khác người mua. Đổi người nhận không đổi owner/phone hồ sơ. Phiên khác cùng số điện thoại tạo hồ sơ tách biệt, không đọc/gộp hồ sơ cũ. Phiên đã liên kết không được âm thầm đổi contact trong submit.

SKU/quantity là dữ liệu client được đề nghị; giá, tồn, phí, giảm giá và tổng do server tính lại. Không nhận customer ID, giá tự nhập, dòng SKU trùng, quantity lẻ/âm hoặc payload sai định dạng. Giới hạn 100 dòng cùng tổng JSON 16 KiB; create 20 lần/phút/IP, action đọc 60. Không polling hoặc tải toàn bộ khách/lịch sử/catalog để nhận diện.

Guest được dùng voucher công khai đủ điều kiện. Không dùng mode hạng/điểm hoặc voucher cần quyền sở hữu qua điểm; số phone không cấp quyền hưởng lợi ích tài khoản cũ. Giữ nguyên quy tắc hiệu lực, mức tối thiểu, giới hạn lượt dùng và khóa voucher hiện có.

Chỉ chấp nhận phương thức thủ công đang available, fee bằng 0, short name COD/cash/bank transfer/VietQR theo luồng đang có. Tạo khoản `pending`, không gọi gateway hoặc tự báo đã trả tiền. Tổng bằng 0 không tạo khoản thu giả. Receipt tính tiền đã thu ròng sau hoàn thành công; thu một phần là `partial`, chỉ đủ tiền mới `paid`. Kiểm tra vòng đời hoàn tiền thật vẫn ngoài đợt này.

## Giá, kho và retry

Hai helper private mới sinh từ định nghĩa live `quote_own_sales_core` và `create_own_sales_core`; [baseline](guest-sales-source-baseline.txt) có hash và apply kiểm tra lại. Không sửa hàm member hoặc quyền/index/bảng cũ. Thay nguồn owner bằng phiên, quote cho phép owner chưa có; loại owner ID và điểm thành viên khỏi yếu tố version để quote trước submit vẫn hợp lệ khi tạo hồ sơ mới.

Giữ cùng cách khóa product/variant, tính tồn ledger trừ giữ kho còn hiệu lực, lưu giá/SKU snapshot, giữ kho theo đơn và ghi voucher một lần. Create dùng request-lock cùng namespace với đơn member. Exact retry trả mã cũ trước khi tính lại tồn đã bị chính đơn đó giữ; đổi details/lines/quote/payment dưới cùng mã báo xung đột. Giá hoặc tồn thay đổi giữa quote/create khiến submit thất bại và transaction rollback, không để hồ sơ/giữ kho/đơn dang dở.

Giữ kho có thời hạn/giải phóng theo nghiệp vụ đơn hiện tại (core đang dùng hold active `infinity` tới bước xử lý đơn); không tự thêm bộ hẹn giờ hoặc thay chính sách hủy của toàn hệ thống. Chưa kiểm thử hai writer cạnh tranh, không dùng sự hiện diện của khóa để đánh PASS oversell concurrency. Khi sửa thuật toán member sau này cần cập nhật và kiểm tra helper guest; giá/tồn runtime vẫn lấy live DB.

## Bằng chứng

- [24 kiểm tra / 257 SQL](guest-sales-rollback.txt): HTTP loopback thật → RPC SQL/rate limit Cloud thật trong transaction rollback. Quote unbound không tạo hồ sơ; checkout không cần pet; người nhận khác contact; giữ kho/voucher/payment pending; exact retry; đổi payload; tách hai phiên cùng phone; receipt owner isolation; first-write lỗi không để lại customer/session; chặn gateway/điểm/voucher riêng; thiếu tồn/SKU trùng/giá cũ; đơn zero-total; thu một phần; lưu pet sau đơn dùng lại customer; thu hồi phiên; source member không đổi. Tất cả fixture, ledger/audit và DDL rollback sạch.
- [Forward/reverse và grants](guest-sales-reverse.txt): thực thi cài/gỡ sáu hàm trong transaction, giữ định nghĩa member. [Apply](guest-sales-apply.txt): ba RPC public chỉ service role có EXECUTE; ba helper private không cấp trực tiếp cho anon/customer/service. Search path cố định và SECURITY DEFINER; không có business write lúc apply.
- [Ba REST probe thật chỉ đọc](guest-sales-rest-readonly.txt): lấy đúng một SKU public có tồn, quote unbound khớp giá dòng; anon không được gọi RPC; hash chưa có binding không đọc được receipt. Không xuất ID/giá/hồ sơ khách thật vào bằng chứng.
- [Guard và constraint sau cài](guest-sales-constraints-rollback.txt): RPC chặn unit price giả; **buộc chạy toàn bộ deferred constraint bằng `SET CONSTRAINTS ALL IMMEDIATE`** sau tạo đơn/hold/payment; receipt pending/partial/paid theo tổng thu thực tế. Fixture rollback, không phải commit/Realtime hoặc thanh toán gateway thật.
- 41 test Node Auth/access/HTTP guard PASS; syntax backend/runner/generator và JSON route hợp lệ. Không dùng Logs/SMS/Storage, không sửa hồ sơ/cấu hình/product thật, không giữ lại fixture committed.

Các lượt lỗi ban đầu đã rollback và sửa trước PASS: sinh SQL phải dùng replacement callback để giữ nguyên ký tự regex; fixture hai biến thể không được vi phạm unique cấu hình; adapter SQL test phải truyền array dòng hàng dạng JSON, không phải PostgreSQL array. Không sửa ràng buộc Cloud để làm fixture chạy được. Bộ sinh booking cũng dùng callback an toàn; không đổi SQL 114 đã cài.

## Khôi phục và còn lại

`D:/Aboutme/Pawpal-infra/supabase-local/backups/guest-sales-115/` ngoài webroot chứa định nghĩa member được bảo vệ, SQL forward/reverse và metadata sau cài. `115_guest_sales_rollback.sql` chỉ gỡ sáu hàm mới; dừng guest checkout writers trước, giữ nguyên customer/order/payment/hold/audit và không CASCADE/restore đè Cloud. Không phải backup toàn database.

Chưa nối giỏ/checkout/booking/Admin contact mới; frontend đang chạy vẫn có login guard cũ. Chưa push/deploy backend, chưa kiểm tra domain Vercel với API mới, commit/Realtime hai portal, hai writer, hủy/đổi trả guest hoặc vòng đời refund. Liên kết Auth cho hồ sơ có contact tự khai và chuẩn hóa các luồng legacy còn lại vẫn cần xử lý trước khi kết luận hoàn tất GĐ-03.
