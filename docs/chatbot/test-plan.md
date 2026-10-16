# Kế hoạch kiểm thử và điều phối kỹ thuật chatbot Pawpal — G0-04 (Test Plan)

Ngày lập: 16/10/2026.  
Phụ trách: Chủ dự án + QA Lead; Backend Lead và Frontend Lead phối hợp.  
Mục tiêu: Thiết lập môi trường kiểm thử an toàn, phân tách dữ liệu vận hành, chuẩn bị bộ dữ liệu mẫu (fixtures), danh mục ca lỗi biên (negative test cases) và quy chế điều phối mã nguồn nhằm ngăn ngừa xung đột nhánh khi bước vào Giai đoạn 1 (G1).

---

## 1. Môi trường kiểm thử và nguyên tắc bảo vệ dữ liệu vận hành

### 1.1. Nguyên tắc phân tách môi trường
* **Tuyệt đối không dùng dữ liệu khách hàng thật để kiểm thử:** Mọi dữ liệu phát sinh trong quá trình chạy kiểm thử (phiên chat, tin nhắn, ticket, điểm bồi hoàn) bắt buộc phải gắn tiền tố định danh rõ ràng: `[QA Test]`, `[Test Runner]`, hoặc `QA_`.
* **Cơ chế tự dọn dẹp dữ liệu (Self-cleaning Teardown):** Tất cả các kịch bản kiểm thử tự động (như `scripts/test/test_chatbot_lifecycle.js`) bắt buộc phải bọc trong khối `try ... finally` để xóa sạch 100% bản ghi thử nghiệm sau khi kết thúc, không để lại rác trong CSDL.
* **Tách biệt biến môi trường:**
  - Môi trường phát triển cục bộ và kiểm thử sử dụng file cấu hình riêng.
  - Cấm commit các file chứa giá trị khóa thật (`.env`, `.env.local`) lên kho mã nguồn Git.

### 1.2. Kế hoạch sao lưu và khôi phục (Backup & Restore Strategy)
Trước khi thực hiện bất kỳ thay đổi cấu trúc bảng (DDL) hoặc chạy migration ở các giai đoạn tiếp theo:
1. Xuất bản sao lưu cấu trúc và dữ liệu hiện hành của 13 bảng chatbot qua công cụ dòng lệnh hoặc tính năng Backup Point-in-time trên Supabase Dashboard.
2. Lưu trữ bản snapshot cục bộ vào thư mục an toàn không đưa lên Git.
3. Trong trường hợp migration phát sinh lỗi, kịch bản hoàn nguyên (Rollback script) tương ứng phải được chuẩn bị sẵn và chạy ngay lập tức.

---

## 2. Danh mục tài khoản kiểm thử theo vai trò (Test Personas)

Để phục vụ việc kiểm thử phân quyền nghiêm ngặt theo Ma trận quyền `permissions-matrix.md`, nhóm QA chuẩn bị 5 tài khoản thử nghiệm tiêu chuẩn:

| Mã tài khoản | Vai trò kiểm thử | Mục đích sử dụng trong kịch bản | Quyền hạn kỳ vọng |
|---|---|---|---|
| `USR-GUEST-01` | Khách vãng lai (`GUEST`) | Kiểm thử widget chat web khi chưa đăng nhập, sử dụng `session_token` tạm thời. | Chỉ gửi/nhận tin nhắn an toàn; không gọi được công cụ Copilot nội bộ. |
| `USR-CUST-01` | Khách thành viên (`CUSTOMER`) | Khách hàng đã đăng nhập tài khoản có hồ sơ bé cưng, đơn hàng và điểm Pawpoint. | Gửi/nhận tin nhắn; xem được lịch sử ca của chính mình; không xem `raw_content`. |
| `STF-GROOM-01` | Kỹ thuật viên (`STAFF`) | Nhân viên quầy / KTV Grooming mở giao diện Admin. | Xem lịch làm việc; không có quyền tiếp quản ca chat; không có quyền cộng điểm. |
| `STF-CSKH-01` | Chuyên viên trực ca (`CSKH`) | Chuyên viên CSKH tiếp quản ca, tư vấn, sử dụng câu mẫu, trích xuất ticket. | Tiếp quản ca chat; xem `content` đã làm sạch; cộng điểm bồi hoàn tối đa 50 điểm/ca. |
| `STF-LEAD-01` | Quản lý / Admin (`ADMIN` / `CSKH_LEAD`) | Giám sát ca trực, điều tra sự cố nghiêm trọng, duyệt xuất bản Rules Hub. | Toàn quyền; có quyền `chat.raw.read` xem nguyên văn; duyệt bồi hoàn đến 200 điểm/ca. |

---

## 3. Bộ dữ liệu mẫu kiểm thử độc lập (Test Fixtures)

Toàn bộ dữ liệu giả lập được lưu trữ riêng trong thư mục kiểm thử, **tuyệt đối không đưa vào mã nguồn giao diện để làm fallback khi hệ thống gặp lỗi** (triệt tiêu dứt điểm lỗi H02):

* **Mẫu tin nhắn bình thường (Neutral):** Khách hỏi bảng giá vaccine cho cún 3 tháng tuổi, hỏi lịch tắm sấy vào 14:00 thứ 7, kiểm tra tình trạng đơn hàng ORD-001.
* **Mẫu tin nhắn thất vọng (Frustrated - Level 3):** Khách thắc mắc shipper giao hàng trễ 45 phút, phàn nàn nhân viên phản hồi tin nhắn chậm.
* **Mẫu tin nhắn độc hại / giận dữ (Toxic - Level 4-5):** Sử dụng các chuỗi mẫu trong kho từ cấm `chatbot_profanity_filter` để kiểm tra khả năng bắt lỗi của màng lọc Toxic Shield.
* **Mẫu tình huống cấp cứu thú cưng (Emergency Medical):** Cún bị co giật sau khi uống nhầm thuốc, mèo bị khó thở sau khi tiêm phòng.

---

## 4. Bộ kịch bản kiểm thử ca lỗi biên (Negative & Boundary Test Cases)

| Mã ca test | Tên tình huống lỗi | Hành vi thử nghiệm | Kết quả kỳ vọng đạt chuẩn |
|---|---|---|---|
| **TC-ERR-01** | Hết hạn phiên làm việc (Session Expired) | Gửi tin nhắn chat hoặc yêu cầu tiếp quản ca khi token Supabase Auth đã hết hạn. | Trả mã lỗi `401 Unauthorized`. Giao diện hiển thị thông báo phiên làm việc kết thúc và điều hướng nhẹ nhàng về trang đăng nhập. |
| **TC-ERR-02** | Vượt quyền truy cập (Permission Denied) | Nhân viên CSKH thông thường cố tình gọi API đọc `raw_content` hoặc gửi payload cộng 100 điểm. | Trả mã lỗi `403 Forbidden`. Không trả nội dung thô; không thực hiện cập nhật điểm trong database. |
| **TC-ERR-03** | Mất kết nối CSDL (Database Failure) | Ngắt kết nối mạng hoặc CSDL trả về lỗi khi đang lưu tin nhắn. | Giao diện hiển thị trạng thái mất kết nối ("Đang thử kết nối lại..."), có nút bấm "Gửi lại" (Retry), không làm crash trang web. |
| **TC-ERR-04** | Trợ lý AI Timeout (AI Service Failure) | Giả lập Google Gemini API phản hồi quá 15 giây hoặc trả về lỗi 500/503. | Hệ thống tự động kích hoạt fallback an toàn: Thông báo "Chuyên viên tư vấn sẽ hỗ trợ sen ngay ạ", chuyển ca sang hàng đợi người thật; không bịa số liệu. |
| **TC-ERR-05** | Gửi tin nhắn trùng lặp (Duplicate Submission) | Người dùng bấm nút "Gửi" hoặc "Tiếp quản" liên tiếp nhiều lần trong 1 giây. | Áp dụng cơ chế Debounce và khóa nút bấm tức thì (disabled); hệ thống chỉ ghi nhận duy nhất 1 bản ghi vào CSDL. |
| **TC-ERR-06** | Tranh chấp tiếp quản ca (Takeover Race Condition) | Hai chuyên viên CSKH cùng bấm "Tiếp quản ca chat" cho cùng một phiên hội thoại tại cùng một thời điểm. | Sử dụng cơ chế kiểm tra trạng thái Optimistic Concurrency: Người bấm trước tiếp quản thành công; người bấm sau nhận thông báo: "Ca chat đã được chuyên viên [Tên] tiếp nhận". |

---

## 5. Quy chế điều phối mã nguồn và phân công trách nhiệm

Để hạn chế tối đa nguy cơ xung đột mã nguồn (merge conflicts) trên file trung tâm `chatbot.js` và các subtab khi bước vào các giai đoạn code:

```
[Phụ trách Kiến trúc & API Contract] ──> Quản lý server.js, api/chat.js, scripts/api/chat.js
               │
   ┌───────────┼───────────┐
   ▼           ▼           ▼
[Subtab 1]  [Subtab 2]  [Subtab 3]
Trực chat   Trợ lý AI    Quy định
(Live)      (Copilot)    (Rules)
```

### Phân công vai trò điều phối:
1. **Kiến trúc trưởng & API Coordinator (Backend Lead):**
   * Độc quyền quản lý và điều phối các hợp đồng giao tiếp API (`/api/chat`), bảo vệ các hàm cốt lõi trong `chatbot.js`.
   * Mọi thay đổi về cấu trúc request/response của backend phải được thông báo trước cho nhóm frontend.
2. **Kỹ sư phụ trách Trực chat Live (`tab-chatbot-live.js`):**
   * Chịu trách nhiệm về luồng hiển thị tin nhắn, hộp thư inbox, hàng đợi SLA, modal trích xuất ticket và màng lọc Toxic Shield.
3. **Kỹ sư phụ trách Trợ lý AI (`tab-chatbot-copilot.js`):**
   * Chịu trách nhiệm về luồng truy vấn dữ liệu khách hàng/đơn hàng/lịch hẹn, hiển thị câu trả lời gợi ý và soạn nháp.
4. **Kỹ sư phụ trách Quy định (`tab-chatbot-rules.js`):**
   * Chịu trách nhiệm về giao diện quản lý Rules Hub (FAQ, từ cấm, câu mẫu, hạn mức bồi hoàn).
5. **Kỹ sư Dữ liệu & Bảo mật (Database Lead):**
   * Chịu trách nhiệm về DDL migration, cấu hình Row Level Security (RLS) và hàm RPC bảo mật trên Supabase.
6. **QA & Tự động hóa (QA Lead):**
   * Chịu trách nhiệm thực thi và mở rộng bộ test script tự động (`scripts/test/`), đối soát biên bản nghiệm thu trước khi chuyển giai đoạn.
