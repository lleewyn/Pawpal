# Kiểm tra sau phát hành guest trên production

Ngày: 27/10/2026. Website: https://pawpalgr3.vercel.app/.

## Phát hành

- Người dùng xác nhận “ok push” cho bản `a6fec053` lên `origin/main`.
- Push fast-forward từ `51548731` tới `a6fec0532ba65b455e26c0e01253fcfadf7c962a` thành công; không force-push và không có thay đổi About/Blog/chatbot chưa commit đi kèm.
- GitHub deployments xác nhận môi trường **Production**, SHA trên, trạng thái **success**, URL deployment `https://pawpalgr3-b8zi1lp5y-llwyns-projects.vercel.app`.

## Kiểm tra website chính

Kiểm tra giao diện bằng Playwright MCP thật trên URL production; catalog đọc Supabase thật. Browser context riêng cho giỏ/booking, không dùng trạng thái tài khoản hoặc giỏ của người dùng.

- Trang chủ HTTP 200, tiêu đề `PawPal — Chăm sóc bằng cả trái tim`.
- `/services` HTTP 200, tiêu đề đúng; không pageerror/console error hoặc request thất bại trong lượt kiểm tra trang dịch vụ.
- Ba file `pages/public/login/login.js`, `pages/shop/cart/guest-cart-page.mjs`, `scripts/shared/guest-cart.mjs` HTTP 200 và nội dung khớp bản local đã phát hành (chuẩn hóa CRLF/LF).
- POST `/api/customer/guest/context` không có cookie trả 401 và `success: false`: route/API guest đã hoạt động, không cấp hồ sơ cho phiên chưa xác thực.
- Trang sản phẩm thật Royal Canin Mother và Babycat HTTP 200 → thêm một sản phẩm vào giỏ guest → `/cart` → chọn phân loại `400g` sang `1kg`. Dòng giỏ đổi đúng tên `1kg`, giá `295.000 đ`, số lượng `1`; lưu đúng ID phân loại và số lượng, reload vẫn giữ đúng dòng. Không pageerror. [Ảnh kiểm tra](guest-production-cart.png).
- `/booking` HTTP 200, hiển thị nút thêm bé và mở được form tên bé cho guest. Không lưu bé/lịch; gọi endpoint kết thúc phiên thử trả 200, sau đó đóng context.
- `/login?action=register` HTTP 200 và các ô tên/phone đăng ký hiển thị. Không yêu cầu OTP hoặc tạo Auth trong lượt smoke này; không pageerror trong booking/register.

Không tạo đơn, thanh toán hay giữ kho trên production ở lượt smoke. Giỏ chỉ thay đổi localStorage trong browser context thử đã đóng. Không chạy load test, không dùng Supabase Logs hay thêm polling.

## Giới hạn nghiệm thu

Đây là kiểm tra sau phát hành các trang/API và đổi phân loại giỏ. OTP giả lập, tạo đơn/lịch đồng thời và luồng Admin xử lý đã có bằng chứng committed local → Cloud ở [lượt kiểm thử trước](guest-demo-otp.md); không gọi đó là kiểm thử trọn luồng production lần này. Các tiêu chí tổng thể còn mở trong checklist giữ nguyên.

Rollback production trước bản guest: `515487316452d2df1394984e74d45926c4f0cca9`. Không đảo dữ liệu liên kết, thu hồi phiên hoặc migration Cloud chỉ để rollback giao diện/API.
