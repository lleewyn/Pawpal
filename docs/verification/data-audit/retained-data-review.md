# Rà sâu nhóm kiểm thử còn giữ lại

Thời điểm: 11/11/2026, khoảng 10:11 giờ Việt Nam. Lượt kiểm tra chỉ đọc, chưa sửa/xóa thêm bản ghi. Không truy vấn Supabase Logs, không đọc mật khẩu hoặc token.

## Sáu khách đang bị chặn bởi sổ điểm

Cả sáu khách đều có đúng một bút toán số dư chuyển đổi từ hệ thống cũ. Các bút toán không gắn payment_id, review_id, refund_transaction_id hoặc voucher_redemption_id. Tổng cộng 1.701 điểm:

- Khách `030b48d9-972c-4459-9dcb-61d62fbf3c64`: 100 điểm; còn một đơn dùng voucher công khai, chưa có thanh toán.
- Khách `0fc4feb3-8c6b-49f1-9c50-13457fdaf6f7`: 241 điểm; còn một thú cưng và một lịch gắn metadata tệp đã xóa.
- Khách `3527b05f-fa9f-4a54-9a8f-ca0cc2631713`: 100 điểm; không còn thú cưng, lịch, đơn hay thanh toán.
- Khách `c5ee0922-87ee-4304-8f0e-cab7e5853680`: 150 điểm; không còn thú cưng, lịch, đơn hay thanh toán.
- Khách `d0000000-0000-0000-0000-000000000002`: 1.060 điểm; còn hai thú cưng, hai lịch và một đơn đã có thanh toán thành công.
- Khách `f88a4506-d8ea-47f6-8ce3-903ccf47f730`: 50 điểm; không còn thú cưng, lịch, đơn hay thanh toán.

Trigger `immutable_event` hiện chặn sửa/xóa bút toán điểm; `protect_payment_delete` chặn xóa tiền đã ghi sổ. Các ràng buộc này là nguyên nhân thực tế khiến không thể xóa sạch sáu khách theo luồng hiện tại. Không tắt hay thay đổi trigger trong lượt kiểm tra.

## Hai lịch và ba tệp

- `BKG-E2E12-1249`: có một phiên tải tệp, không có thanh toán thành công hoặc biên bản ký trong bảng appointment_record.
- `BKG-5b927c05-5abd-482f-b96c-8385ba133d78`: có hai phiên tải tệp, không có thanh toán thành công hoặc biên bản ký trong bảng appointment_record.
- Cả ba media_upload_session đều có state=`deleted`; ba media_asset liên quan đều có status=`deleted`.
- Đã kiểm tra toàn bộ khóa ngoại tham chiếu tới ba asset: không còn bản ghi tham chiếu. Ba session chỉ còn được asset tương ứng tham chiếu.
- Như vậy rào cản ở đây là metadata còn sót, không phải tệp đang được sử dụng. Có thể lập đợt xóa riêng cho asset/session đã xóa, sau đó lịch và chi tiết liên quan, vẫn giữ nguyên dữ liệu media khác.

## Hai nhân viên tên Test

- `48f9d4a5-acd9-4711-8891-dd57bf4433f7`: trạng thái nghỉ việc; tài khoản bị khóa tới năm 2126; không có vai trò, chưa ghi nhận last_sign_in_at. Tuy nhiên tài khoản vẫn là tác giả của **26 tin nhắn hỗ trợ và 2 tin nhắn hội thoại** trong dữ liệu còn lại. Không được coi đây là tài khoản không có lịch sử.
- `490fec43-0971-46f1-a193-1420a742c1ae`: trạng thái đang làm việc nhưng tài khoản đã bị khóa tới năm 2126; không có vai trò, chưa ghi nhận last_sign_in_at. Đã rà toàn bộ khóa ngoại tới staff và auth.users: chỉ còn hồ sơ staff cùng bản ghi auth.identities, không có bản ghi nghiệp vụ tham chiếu khác hoặc session được tìm thấy.
- Hồ sơ thứ hai là ứng viên để xóa trọn tài khoản kiểm thử trong một đợt có sao lưu. Hồ sơ thứ nhất cần giữ lịch sử tác giả hoặc chốt rõ phạm vi xử lý các hội thoại liên quan trước.
- Việc không có thời điểm đăng nhập không tự chứng minh tài khoản chưa từng được dùng; kết luận dựa thêm trên các liên kết thực tế.

## Phương án cụ thể cho đợt sau

1. Nhóm có thể chuẩn bị xóa tiếp mà không sửa sổ điểm/tiền: ba asset và ba session đều đã xóa, hai lịch kiểm thử cùng dòng phụ thuộc, thú cưng nếu không còn liên kết; hồ sơ nhân viên Test thứ hai cùng danh tính đăng nhập riêng của nó.
2. Đơn `SO-0f79ee72ee124df0a9399efd8fbf1c8e` không có thanh toán, chỉ vướng một lượt dùng voucher công khai. Cần lập bản trước/sau cho lượt dùng voucher và ba giữ hàng liên quan trước khi đưa vào danh sách xóa. Không sửa định nghĩa voucher, sản phẩm hoặc số tồn.
3. Sáu bút toán chuyển đổi và thanh toán thành công phải được xử lý thành phạm vi riêng; không tự thay đổi quy tắc sổ điểm/tiền để xóa khách.
4. Tài khoản nhân viên có 28 tin nhắn không xóa hàng loạt hội thoại chỉ vì tên người gửi là Test.

Đây là phương án đã được làm rõ bằng dữ liệu thực, chưa phải xác nhận rằng tất cả các nhóm đều có thể xóa ngay. Bản đọc chi tiết được giữ riêng trong artifacts/data-cleanup/2026-11-11T02-51-15-423Z/retained-inspection.private.json (Git bỏ qua).
