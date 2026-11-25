# Báo cáo kiểm thử & đánh giá Chatbot PawPal

Ngày thực hiện: **25/11/2026**  
Môi trường kiểm thử: Máy chủ Express nội bộ kết nối **Supabase Cloud** và **Gemini API**, kết hợp kiểm thử giao diện trực tiếp trên **Playwright Chromium** và bộ test tự động Node.js (`node --test`).  
Ghi chú dữ liệu: Toàn bộ hội thoại, phiên khách, tài khoản thành viên thử nghiệm và lịch sử Copilot phát sinh trong quá trình kiểm thử đều đã được dọn dẹp khỏi CSDL sau khi chạy xong.

---

## 1. Tổng quan kết quả kiểm thử

| Hạng mục kiểm tra | Phạm vi thực hiện | Kết quả |
| :--- | :--- | :--- |
| **Khách hàng vãng lai (Guest)** | Chào hỏi, bảng giá theo cân nặng, chốt chặn đơn riêng, chốt chặn gặp nhân viên (`403 MEMBERSHIP_REQUIRED`), cảm xúc & ngoại lệ | **Đạt** (API + Trình duyệt) |
| **Thành viên (Member)** | Tra cứu điểm/hạng, lịch hẹn, hoàn tiền trung lập, chặn hỏi hồ sơ người khác, từ chối thao tác ghi, khiếu nại & chuyển CSKH (`waiting_agent`) | **Đạt** (API + Trình duyệt) |
| **Nhân viên (`STAFF`)** | Phạm vi trợ lý (`work.copilot.use`), lịch trực, bảng giá; chốt chặn RBAC `403` (doanh thu, lương/hoa hồng, duyệt hoàn tiền, API key) | **Đạt** (API + Trình duyệt) |
| **Quản lý (`ADMIN`)** | Thực thu hôm nay, SKU tồn kho thấp, từ chối thao tác ghi có số lượng (`"cộng 500 điểm"`), từ chối dự báo doanh thu tương lai | **Đạt** (Planner + Trình duyệt) |
| **Bộ test tự động** | `scripts/test/chat_*.test.cjs`, `chat_*.test.js`, `test_chat_*.test.js`, `test_chatbot_manual_qa_automated.test.js` | **427/428 đạt** *(1 bài lỗi do thiếu file `docs/chatbot/stage5-faq-review-2026-10-30/reviewed-changes.txt`)* |

---

## 2. Đánh giá theo mục tiêu, phạm vi và cảm xúc

### 2.1. Mức độ đạt mục tiêu & đúng phạm vi
- **Khách vãng lai**: Tư vấn đúng dịch vụ, giá theo cân nặng (`5 kg` → liệt kê 4 gói tắm kèm link `/booking?service=...`), không bịa giá tương lai; từ chối câu hỏi ngoài phạm vi (thời tiết, viết code); chặn xem dữ liệu cá nhân và chặn chuyển nhân viên khi chưa đăng nhập.
- **Thành viên**: Chỉ trả dữ liệu thuộc đúng tài khoản đang đăng nhập (`auth.uid()`). Khi hỏi trạng thái hoàn tiền trung lập (*"Đơn hàng của tôi đã hoàn tiền chưa?"*), hệ thống tra cứu trạng thái thanh toán/đơn hàng mà không tự tạo khiếu nại hay chuyển ca oan. Từ chối thao tác ghi trực tiếp và điều hướng về mục tương ứng (`/user#bookings`, `/user#support-create`).
- **Nhân viên & Quản lý**: Hỗ trợ tra cứu nhanh đa phân hệ, tóm tắt ca chat và soạn nháp dựa trên dữ liệu thật và FAQ đang bật; không tự ý thực hiện thao tác ghi nghiệp vụ (cộng điểm, hoàn tiền, hủy/sửa đơn, phân công ca). Nhân viên bị chặn `403` với các dữ liệu quản trị/tài chính nhạy cảm.

### 2.2. Nhận diện & đứng về cảm xúc người dùng (trực tiếp và gián tiếp)
- **Tích cực / Cảm ơn**: Phản hồi ấm áp, tự nhiên (*"PawPal rất vui vì bé đã về nhà thơm tho ạ..."*).
- **Lo lắng nhẹ (bé nhút nhát lần đầu)**: Mở đầu bằng lời trấn an nhẹ nhàng trước khi đưa hướng dẫn chuẩn bị cho bé.
- **Lo lắng sức khỏe sau dịch vụ (`special_care`, cấp 3)**: Ghi nhận lo lắng, hướng dẫn theo dõi, nêu dấu hiệu cần cấp cứu thú y và mời gửi mã lịch hẹn để kiểm tra.
- **Khẩn cấp y tế (`medical_emergency`, cấp 6)**: Không giữ khách chờ trong chat; ưu tiên tuyệt đối khuyến cáo liên hệ ngay bác sĩ thú y hoặc cơ sở cấp cứu thú y gần nhất kèm câu đồng cảm ngắn.
- **Bức xúc trực diện / Bức xúc ngầm / Thất vọng / Mất kiên nhẫn**:
  - Nhận diện cả câu viết hoa bức xúc, câu hỏi lặp chưa được giải quyết (`isImplicitlyUpset`), câu thất vọng/mỉa mai (`isDisappointed`) và câu giục giã mất kiên nhẫn (`isImpatient`).
  - **Nối tiếp ngữ cảnh 2 lượt**: Ở lượt 1 xin lỗi và hỏi ngắn sự việc; nếu lượt 2 khách vẫn tiếp tục thất vọng mà chưa nêu mã/từ khóa sự cố, bot không lặp lại câu hỏi cũ mà chuyển sang bước tiếp theo (chuyển hàng đợi CSKH với Thành viên, hoặc mời đăng nhập `/login` / `/contact` với Khách vãng lai).

---

## 3. Bảo vệ hệ thống & xử lý các tình huống ngoại lệ

| Tình huống | Cơ chế bảo vệ & kết quả kiểm chứng |
| :--- | :--- |
| **Gửi khoảng trắng rỗng (`"     "`)** | Giao diện tự chặn không gửi request. |
| **Chỉ gửi Emoji (`"🐶🐱🐾❤️❤️❤️"`)** | Bot không bịa câu trả lời, đề nghị khách mô tả thêm nhu cầu. |
| **Ngôn từ thô tục / lách từ teencode** | `chat_moderation.js` phát hiện và che mờ thành `***` trước khi lưu `content`, nâng mức cảnh báo và xử lý an toàn. |
| **XSS / HTML Injection** (`<script>...<img onerror=...>`) | Không thực thi mã JS trên trình duyệt (`dialogTriggered = false`), hiển thị an toàn. |
| **Prompt Injection** (đòi system prompt, API key, giảm 100%) | Bị chặn ngay bởi quy tắc bảo vệ bí mật tài khoản & hệ thống (`Không gửi mật khẩu, OTP hoặc khóa truy cập vào chat...`). |
| **Hỏi nối tiếp nhiều lượt (Multi-turn)** | Giữ đúng ngữ cảnh dịch vụ (ví dụ hỏi phòng Hotel → hỏi tiếp giá phòng Standard cho bé `4kg` trả đúng `180.000 đ/24 giờ`). |
| **Spam / Gửi lặp** | Giới hạn độ dài tin tối đa 2.000 ký tự, giới hạn 10 tin/phút mỗi hội thoại, 60 request/phút theo IP, chống gửi lặp bằng `requestId` UUID. |

---

## 4. Các lỗi đã phát hiện và khắc phục trong phiên

1. **Chào `"Xin chào PawPal"` không khớp intent chào hỏi** (`scripts/api/chat_moderation.js`):
   - Sửa regex `socialIntent` thành `^(?:(?:xin )?chao(?: ban| pawpal)?|hello|hi)[!.?\s]*$`.
2. **Thành viên hỏi đơn người khác bị chuyển `waiting_agent` thay vì chặn ngay** (`api/admin-chat.js`):
   - Kiểm tra từ chối quyền riêng tư từ `memberHelp.plan()` trước khi cho phép `shouldHandover` chuyển ca.
3. **Lệnh ghi có số lượng chen giữa (`"Hãy cộng 500 điểm..."`) không vào `refuse.write`** (`scripts/api/admin_copilot.js`):
   - Mở rộng regex `write` với `(?:cong|tang)(?:\s+\d+(?:[.,]\d+)?)?\s+diem`.
4. **Bỏ dấu tiếng Việt làm `"tâm sự"` khớp nhầm `/\btam\b/` và `"bạn ... giúp"` khớp nhầm `ban.*gi`** (`scripts/api/chat_public_guest.js`):
   - Loại bỏ các cụm từ không liên quan trước khi kiểm tra `/\btam\b/` và thêm ranh giới từ `\bban\b.*(?:\bgi\b|nhung gi)`.
5. **Nối tiếp cảm xúc ẩn ở lượt 2 bị lặp câu hỏi** (`api/admin-chat.js`):
   - Bổ sung kiểm tra `priorUpsetTurn` từ `recent_questions` để lượt 2 chủ động điều hướng sang CSKH / Đăng nhập / Liên hệ.

---

## 5. Các lưu ý cần theo dõi trước khi đưa lên Production

1. **Chưa commit & deploy**: Các chỉnh sửa tại `api/admin-chat.js`, `scripts/api/chat_moderation.js`, `scripts/api/chat_public_guest.js` và `scripts/api/admin_copilot.js` hiện mới ở local; cần commit đúng các file liên quan và deploy lên Vercel để áp dụng trên Production.
2. **Rate limit theo tiến trình**: `limits = new Map()` trong `api/admin-chat.js` lưu trên RAM từng instance serverless, chưa đồng bộ toàn cục giữa nhiều instance.
3. **Kiểm tra ma trận sau khi sửa rule Admin**: Khi thêm từ khóa vào `chatbot_sentiment_trigger` trên giao diện Admin, nên chạy kiểm thử ma trận kịch bản (`benchmark`) để tránh trigger quá rộng gây chuyển ca oan.
4. **Giới hạn phạm vi media & kênh ngoài**: Gửi ảnh/tệp hiện chuyển nhân viên xem (AI chưa phân tích nội dung ảnh); các kênh Zalo/SMS/Email vẫn ở mức giả lập theo phạm vi V1.
