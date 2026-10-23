# NHẬT KÝ THAY ĐỔI — PAWPAL USER CHATBOT V2 (CHANGELOG_CHATBOT_USER.md)

Tài liệu nhật ký append-only ghi nhận toàn bộ các giai đoạn triển khai, vá lỗi bảo mật, đăng ký endpoint và kiểm thử tự động cho hệ thống Chatbot Khách hàng PawPal V2 theo tài liệu [pages/PAWPAL_CHATBOT_USER_V2_CHIEN_LUOC_KICH_BAN_CODE_E2E.md](../../acceptance/PAWPAL_CHATBOT_V1_NGHIEM_THU.md).

---

## [2026-10-21] — Hoàn thiện R0 - R5 Chatbot V2 & Extended RESTful Endpoints

### 1. Mục tiêu và Phạm vi
- Triển khai và kiểm thử tự động toàn diện 6 đợt nâng cấp (R0 đến R5) cho hệ thống Chatbot User V2.
- Triệt tiêu hoàn toàn các lỗi P0: bảo vệ dữ liệu chéo (owner isolation), chống prompt injection, xử lý sự cố cấp cứu y tế & thanh toán không hạ cờ sai, đồng bộ thang đo cảm xúc 1..5.
- Đăng ký và đưa vào hoạt động chính thức các endpoint RESTful contract theo Mục 6.4 và hoàn thiện bộ công cụ database tools cho chatbot.

### 2. Chi tiết các thay đổi mã nguồn

#### A. R0 (Nền móng bảo mật & An toàn ca khẩn cấp)
- File sửa: `scripts/api/chat.js`
- Chi tiết:
  * Khắc phục P0-03: Ngăn chặn từ khóa tiêm phòng/vắc xin thông thường (`tiêm phòng`, `vắc xin`, `sổ tiêm`) bị phân loại nhầm thành ca cấp cứu `medical_emergency` cấp 6.
  * Nhận diện chính xác tình trạng co giật, xuất huyết, khó thở, ngộ độc làm cấp cứu y tế và kích hoạt `shouldHandover = true`.
  * Tranh chấp thanh toán kích hoạt `billing_dispute` và `shouldHandover = true`.
  * Chuẩn hóa thang đo cảm xúc từ 1 đến 6 trong bộ đánh giá và kẹp dải 1 đến 5 khi ghi vào CSDL Supabase để tuân thủ `CHECK (sentiment_level BETWEEN 1 AND 5)`.

#### B. R1 (Trợ lý thông minh & Phân quyền dữ liệu)
- File sửa: `scripts/api/chat.js`
- Chi tiết:
  * Triển khai công cụ `get_services_price`: Tra cứu bảng giá dịch vụ từ Supabase theo khoảng cân nặng.
  * Triển khai công cụ `search_products_public`: Tìm kiếm sản phẩm niêm yết đang bán kèm mức giá từ biến thể.
  * Triển khai công cụ `get_public_vouchers`: Tra cứu danh sách voucher khuyến mãi còn hạn.
  * Bảo mật công cụ `get_user_orders` và `get_user_bookings`: Bắt buộc xác thực `userId` từ token máy chủ, từ chối khách vãng lai và truy vấn chéo.

#### C. R2 (Xử lý sự cố, Khiếu nại & Tra cứu khách hàng)
- File sửa: `scripts/api/chat.js`
- Chi tiết:
  * Triển khai công cụ `get_loyalty_summary_own`: Tra cứu điểm tích lũy, chi tiêu tích lũy và quyền lợi hạng thành viên.
  * Triển khai công cụ `get_user_tickets`: Tra cứu lịch sử khiếu nại và đổi trả của chính chủ tài khoản.
  * Đăng ký đầy đủ công cụ vào `toolsDeclaration` cho mô hình Gemini.

#### D. R3 (Ổn định, Khả năng phục hồi & Lá chắn độc hại)
- File sửa: `scripts/api/chat.js`
- Chi tiết:
  * Tích hợp cờ tính năng `featureFlags` từ `chat_config.js`.
  * Bộ lọc `toxicShield`: Che mờ từ ngữ thô tục, ngăn chặn chửi bới và quấy rối nhân viên.
  * Chống script injection và an toàn escape HTML.
  * Xử lý dữ liệu đầu vào rỗng, khoảng trắng và ký tự lạ.

#### E. R4 (Kiểm thử ý định người dùng Intent E2E)
- Test suite: `scripts/test/test_chat_r4_intents_e2e.test.js`
- Chi tiết:
  * Kiểm thử chống ảo giác cho ý định `QA-SERVICE_AVAIL` khi khách hỏi khung giờ còn chỗ.
  * Kiểm thử hướng dẫn đặt lịch `QA-BOOKING_GUIDE` và chuẩn bị trước hẹn `QA-BOOKING_PREP`.
  * Kiểm thử mua hàng `QA-ORDER_HOWTO` và chính sách giao vận `QA-SHIPPING_POLICY`.
  * Bảo vệ thông tin tài khoản và OTP trong `QA-ACCOUNT_HELP`.
  * Chống vượt quyền và câu hỏi ngoài phạm vi trong `QA-UNTRUSTED_PROMPT` và `QA-OTHER`.

#### F. R5 (Mở rộng RESTful API Contract & Database Tools)
- File sửa: `server.js`, `scripts/api/chat.js`
- Test suite: `scripts/test/test_chat_r5_extended_endpoints.test.js`
- Chi tiết:
  * Đăng ký route `POST /api/chat/session`: Cấp phát JWT guest session token có chữ ký bảo mật từ server (hạn dùng 7 ngày), thay thế `Math.random()`.
  * Đăng ký route `GET /api/chat/conversations`: Tra cứu danh sách hội thoại của chính actor (tối đa 20 ca).
  * Đăng ký route `GET /api/chat/conversations/:id`: Đọc lịch sử tin nhắn với phân quyền sở hữu nghiêm ngặt.
  * Đăng ký route `POST /api/chat/handover`: Chuyển ca sang nhân viên hỗ trợ với cập nhật trạng thái có DB ACK.
  * Đăng ký route `POST /api/chat/back-to-ai`: Khách quay lại tương tác với bot khi trạng thái hợp lệ.
  * Đăng ký route `POST /api/chat/csat`: Ghi nhận đánh giá CSAT 1-5 sao và phản hồi của khách hàng.
  * Bổ sung tool `get_service_availability`: Cung cấp khung giờ mở cửa, chính sách đặt hẹn trước 2 giờ và link `#booking`.
  * Bổ sung tool `check_product_stock`: Kiểm tra tồn kho sản phẩm từ bảng `product` và `product_variant` theo trạng thái `dang_ban`.
  * Bổ sung tool `create_customer_support_ticket`: Hỗ trợ tạo ticket hỗ trợ khách hàng với xác thực tài khoản nghiêm ngặt.

### 3. Kết quả kiểm thử tự động (100% PASS)
- `scripts/test/header_notifications.test.js`: **9/9 PASS**
- `scripts/test/test_chat_r0_foundation.test.js`: **5/5 PASS**
- `scripts/test/test_chat_r1_assistant.test.js`: **4/4 PASS**
- `scripts/test/test_chat_r2_incident_resolution.test.js`: **5/5 PASS**
- `scripts/test/test_chat_r3_stability_resilience.test.js`: **5/5 PASS**
- `scripts/test/test_chat_r4_intents_e2e.test.js`: **5/5 PASS**
- `scripts/test/test_chat_r5_extended_endpoints.test.js`: **7/7 PASS**
- **Tổng cộng: 40/40 tests PASS hoàn hảo.**
