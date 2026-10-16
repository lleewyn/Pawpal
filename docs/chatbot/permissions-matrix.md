# Ma trận phân quyền chatbot Pawpal — G0-03 (Permissions Matrix)

Ngày lập: 16/10/2026.  
Mục tiêu: Quy định thẩm quyền thao tác chi tiết, ranh giới giữa AI và con người (Bot vs Human Boundary), cùng cơ chế kiểm soát bảo mật trên 3 lớp: Frontend UI — Backend API — Database RLS.

---

## 1. Định nghĩa các vai trò trong hệ thống (System Roles)

| Mã vai trò | Tên vai trò | Mô tả phạm vi nghiệp vụ |
|---|---|---|
| `GUEST` | Khách vãng lai | Khách truy cập web chưa đăng nhập, sử dụng chat widget qua session token tạm thời. |
| `CUSTOMER` | Khách hàng thành viên | Khách hàng đã đăng nhập tài khoản qua số điện thoại/OTP trên ứng dụng hoặc web. |
| `STAFF` | Nhân viên quầy / Kỹ thuật viên | Nhân viên cửa hàng (Tiếp tân, KTV Grooming, Chăm sóc viên) tra cứu thông tin ca làm việc. |
| `CSKH` | Chuyên viên trực chat | Nhân viên chuyên trách hỗ trợ khách hàng trực tuyến, tư vấn dịch vụ, tiếp quản ca từ bot. |
| `CSKH_LEAD` | Trưởng ca CSKH / Giám sát | Quản lý ca trực, thẩm định sự cố, hỗ trợ ca căng thẳng, duyệt câu mẫu và bồi hoàn hạn mức cao. |
| `ADMIN` | Quản trị viên tối cao | Toàn quyền kiểm soát hệ thống, xem xét bằng chứng pháp lý, cấu hình quy tắc và audit log. |
| `BOT` | Trợ lý ảo AI (Gemini Agent) | Tiến trình tự động hỗ trợ giải đáp 24/7 theo chính sách đã được duyệt và khung thẩm quyền giới hạn. |

---

## 2. Bảng ma trận thẩm quyền tác vụ (Role-Based Permissions Matrix)

**Ký hiệu quy ước:**
* `✔`: Được phép thực hiện đầy đủ.
* `▲`: Được phép thực hiện có điều kiện hoặc trong hạn mức quy định.
* `✖`: Tuyệt đối không được phép thực hiện (Bị chặn ở cả Frontend và Backend).

| Nhóm chức năng | Thao tác / Quyền hạn chi tiết | GUEST | CUSTOMER | STAFF | CSKH | CSKH_LEAD | ADMIN | BOT |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Giao tiếp hội thoại** | Gửi tin nhắn từ phía khách hàng | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ |
| | Phản hồi tự động theo kịch bản và FAQ đã duyệt | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ |
| | Gửi tin nhắn chuyên viên hỗ trợ người thật | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✖ |
| | Xem nội dung an toàn đã qua kiểm duyệt (`content`) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| | Xem nội dung thô nguyên văn (`chat.raw.read`) | ✖ | ✖ | ✖ | ✖ | ✔ | ✔ | ✖ |
| | Xem và cập nhật ghi chú nội bộ (`internal_note`) | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✖ |
| | Xem bản tóm tắt ca do AI sinh ra (`ai_summary`) | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ |
| **Điều phối phiên chat** | Tiếp quản ca chat từ Bot (`Takeover`) | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✖ |
| | Yêu cầu trợ giúp / Chuyển ca sang nhân viên khác | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✖ |
| | Tiếp nhận ca được chuyển giao (`Accept Handover`) | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✖ |
| | Đóng / Hoàn tất ca hỗ trợ (`status = 'resolved'`) | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✖ |
| | Tạm khóa ca chat khi vi phạm ngôn từ (`blocked_until`) | ✖ | ✖ | ✖ | ✖ | ✔ | ✔ | ▲ |
| | Mở khóa ca chat trước thời hạn | ✖ | ✖ | ✖ | ✖ | ✔ | ✔ | ✖ |
| **Bồi hoàn và Xử lý sự cố** | Tự động cộng điểm bồi hoàn cho khách | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| | Cộng điểm bồi hoàn hạn mức nhỏ (≤ 50 điểm) | ✖ | ✖ | ✖ | ▲ | ✔ | ✔ | ✖ |
| | Cộng điểm bồi hoàn hạn mức vừa (≤ 200 điểm) | ✖ | ✖ | ✖ | ✖ | ▲ | ✔ | ✖ |
| | Duyệt bồi hoàn lớn (> 200 điểm) hoặc hoàn tiền ngân hàng | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ |
| | Trích xuất toàn bộ ca chat thành Ticket khiếu nại | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ▲ |
| | Điều hướng mở hồ sơ đơn hàng, lịch hẹn, hồ sơ khách 360° | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ |
| **Trợ lý AI và Tra cứu Copilot** | Tra cứu bối cảnh khách, đơn hàng, lịch hẹn qua Copilot | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✖ |
| | Soạn thảo câu trả lời nháp gợi ý (không tự gửi) | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ |
| | Sử dụng câu mẫu phản hồi nhanh (`canned_response`) | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ |
| | Đề xuất câu mẫu mới (ở trạng thái chờ duyệt) | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✖ |
| | Chỉnh sửa, xuất bản câu mẫu và tri thức FAQ (`is_active = true`)| ✖ | ✖ | ✖ | ✖ | ✔ | ✔ | ✖ |
| | Cấu hình màng lọc Toxic Shield, ma trận kịch bản, cấp độ cảm xúc | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ |

---

## 3. Quy chuẩn bảo vệ an toàn 3 lớp (3-Tier Security Enforcement)

Để triệt tiêu hoàn toàn các lỗ hổng bảo mật được cảnh báo trong Giai đoạn 1 (G1), ma trận phân quyền trên bắt buộc phải được thi hành đồng thời trên 3 lớp:

```
[Layer 1: Frontend Admin UI] ──> Ẩn/hiện nút bấm, mặt nạ từ thô tục, vô hiệu hóa form vượt quyền
         │
         ▼ (Gửi JWT Token / Staff Session)
[Layer 2: Backend API (/api/chat)] ──> Xác thực token server-side, kiểm tra quyền hạn mức, chặn cờ isAdmin giả
         │
         ▼ (Role: service_role hoặc authenticated)
[Layer 3: Supabase Database RLS] ──> Row Level Security trên 13 bảng, chặn đọc raw_content, bảo vệ Realtime
```

### Chi tiết thực thi trên từng lớp:

1. **Lớp 1 — Trình duyệt Frontend (UI Layer):**
   * Đối với nhân viên không có quyền `chat.raw.read`: DOM hoàn toàn không render nút "Xem nguyên văn", chỉ render văn bản an toàn `content`.
   * Đối với thao tác cộng điểm: Dropdown hạn mức trên modal tự động giới hạn tối đa 50 điểm nếu người dùng là `CSKH`.
   * Nút cấu hình Rules Hub chuyển sang chế độ chỉ đọc (`read-only`) đối với nhân viên thường.

2. **Lớp 2 — Máy chủ Backend (API Layer `/api/chat`):**
   * **Tuyệt đối không tin tưởng client:** Không sử dụng các trường do trình duyệt gửi lên như `systemPrompt`, `isAdmin`, `staff_id`, `role` làm bằng chứng cấp quyền.
   * Lấy danh tính thực tế bằng cách giải mã session token phía server (`staff_auth.js` và Supabase Auth).
   * Kiểm tra hạn mức cộng điểm nghiêm ngặt: Nếu user role là `CSKH` mà gửi payload điểm > 50, backend trả mã lỗi `403 Forbidden` ngay lập tức.
   * Chặn kênh khách (`sender_type = 'customer'`) gọi vào các công cụ nội bộ của Copilot.

3. **Lớp 3 — Cơ sở dữ liệu CSDL (Database RLS & Constraints):**
   * **Bật RLS trên toàn bộ 13 bảng chatbot** (Khắc phục hiện trạng `rls_enabled = false` đã phát hiện ở G0-01).
   * Cột `raw_content` chỉ được cấp quyền SELECT cho role quản trị hoặc thông qua hàm `SECURITY DEFINER` kiểm tra quyền `chat.raw.read`.
   * Bảng `paw_point_transaction` và `customer_membership` chỉ cho phép ghi thông qua hàm RPC nội bộ có transaction, thu hồi quyền INSERT/UPDATE trực tiếp từ client.
