# Chặn tác vụ guest cũ khi đổi tài khoản

Ngày 27/10/2026, Asia/Bangkok. Sửa local lớp client/cart dùng chung, không sửa schema, không push/deploy hoặc ghi dữ liệu nghiệp vụ Cloud trong đợt này.

## Trường hợp phát hiện

Guard cũ chỉ kiểm tra trạng thái member ở thời điểm gửi/nhận hoặc sau khi chờ khóa. Nếu trạng thái guest→member→guest diễn ra trước lúc response/khóa hoàn tất, trạng thái cuối là guest nên tác vụ cũ có thể được dùng tiếp dù người dùng đã đổi tài khoản giữa chừng.

`guest-account-state.mjs` theo dõi thế hệ làm việc trong bộ nhớ trên `auth_state_changed` và storage thay đổi `pawpal_current_user`/clear. Không lưu identity, token hay PII. Client mặc định invalidate theo thế hệ mới, nên response cũ không được nhận làm thành công. Với thao tác ghi đã gửi, lỗi vẫn mang `uncertain=true`: không giả định server đã hủy hoặc tự tạo mã gửi mới.

Ghi giỏ chụp generation trước khi chờ Web Lock và kiểm tra lại khi nhận khóa; đã đổi tài khoản thì từ chối ghi dù cuối cùng là guest. Hành động guest mới sau đó vẫn hoạt động. Không nhập/xóa/ghi giỏ member, không đổi cookie/RPC hoặc suy quyền từ browser state.

## Kiểm tra

**83 test Node PASS**: bộ 81 trước và hai regression test cho response mutation đến muộn sau invalidate hai lần và ghi giỏ đang chờ qua vòng đổi tài khoản. Syntax/whitespace PASS.

Playwright MCP dùng hai tab mới trên origin local 4001, trang harness tối thiểu riêng:

- Session/create response được intercept; giữ response create, phát sự kiện guest→member→guest rồi trả success. Client từ chối kết quả cũ với status 401/uncertain, chỉ một request create, không tự retry. Đây là kiểm tra trạng thái browser/client, không phải Auth login hoặc giao dịch thật.
- Giữ Web Lock thật, xếp một thao tác thêm giỏ chờ, đổi localStorage member rồi guest ở tab khác, đợi hai storage event được quan sát, thả khóa. Ghi cũ bị từ chối, giỏ guest không được ghi, sentinel cache member giữ nguyên. Thao tác guest mới thêm số lượng 2 thành công.
- Trên ứng dụng cart thật, browser được đặt trạng thái member giả nhưng không có Auth token: ba request own-customer-cart thật nhận 401, UI hiển thị không tải được, không render giỏ guest hoặc sửa cache guest. Không dùng kết quả này nghiệm thu thành viên đăng nhập hợp lệ.
- Hồi quy guest bình thường: catalog thật → thêm giỏ → checkout → session/context/quote Cloud thật PASS sau thay đổi. Không bấm đặt hàng hoặc tạo profile, không phát sinh đơn/hold/payment.

Không dùng Logs/SMS/gateway/Storage, không stress test hoặc fixture committed. Context browser đã đóng và server thử đã dừng; cổng 4000 của người dùng giữ nguyên.

## Giới hạn

Cơ chế dựa trên sự kiện tài khoản hiện có của ứng dụng; không thay thế xác thực server. Chưa kiểm thử login/logout Auth thật với hai member, đổi cookie khi mất phiên, committed concurrency hoặc Realtime hai portal. Checklist V1.16 chỉ đánh mục chặn tác vụ chờ/response cũ; mục không nhầm khách toàn bộ vẫn để trống.
