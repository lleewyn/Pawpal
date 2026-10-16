# Nhật ký quyết định nghiệp vụ chatbot Pawpal — G0-03 (Decision Log)

Ngày lập: 16/10/2026.  
Người phê duyệt đề xuất: Chủ dự án + Quản lý CSKH.  
Bộ phận kiểm tra tính khả thi kỹ thuật: Backend + Database.  
Phạm vi: Chốt dứt điểm 9 quyết định nghiệp vụ cốt lõi (D01–D09) phục vụ phát triển, phân quyền và triển khai Chatbot Admin (Trực chat — Trợ lý AI — Quy định).

---

## 1. Bảng tổng hợp 9 quyết định nghiệp vụ (D01–D09)

| Mã | Tên quyết định | Giá trị chốt được duyệt | Người duyệt & Ngày duyệt | Mức ưu tiên |
|---|---|---|---|---|
| **D01** | Thang cảm xúc và phân loại cấp cứu | Giữ cảm xúc 1–5 đo tâm lý khách; sự cố cấp cứu y tế tách riêng qua cờ `is_urgent = true` và ticket `health`. | Chủ dự án, 16/10/2026 | **P0** |
| **D02** | Thẩm quyền xem nguyên văn (`raw_content`) | Chỉ `ADMIN` và `CSKH_LEAD` có quyền `chat.raw.read`; nhân viên trực chat chỉ xem bản an toàn `content`. | Chủ dự án, 16/10/2026 | **P0** |
| **D03** | Thẩm quyền và hạn mức cộng điểm bồi hoàn | Bot tuyệt đối không tự cộng điểm; CSKH tối đa 50 điểm/ca sau xác nhận; Quản lý tối đa 200 điểm/ca. | Quản lý CSKH, 16/10/2026 | **P0** |
| **D04** | Quy tắc màng lọc Toxic Shield và khóa chat | Cấp 1 che từ tục; Cấp 2 nhắc nhở; vi phạm 3 lần tạm khóa 30 phút, cung cấp Hotline Cửa hàng trưởng. | Quản lý CSKH, 16/10/2026 | **P1** |
| **D05** | SLA phản hồi và quy trình nhận/chuyển ca | SLA 5 phút ca thường, 2 phút ca khẩn; người nhận phải bấm "Tiếp nhận" thì quyền điều khiển mới chuyển giao. | Quản lý CSKH, 16/10/2026 | **P1** |
| **D06** | Ranh giới dữ liệu gửi cho mô hình AI | Chỉ gửi thông tin công khai và bối cảnh dịch vụ; cấm gửi mật khẩu, thẻ ngân hàng, số CCCD, địa chỉ chi tiết. | Backend Lead, 16/10/2026 | **P0** |
| **D07** | Thời hạn lưu trữ nguyên văn và ảnh bằng chứng | `raw_content` lưu 90 ngày rồi làm rỗng; ca sự cố nghiêm trọng lưu thành Ticket kèm ảnh trên private bucket. | Database Lead, 16/10/2026 | **P1** |
| **D08** | Chính sách bảo vệ tâm lý nhân viên trực chat | Nút bàn giao ca khẩn 1 chạm; nhân viên được nghỉ ngơi 15 phút sau ca căng thẳng, không trừ KPI tiêu cực. | Quản lý CSKH, 16/10/2026 | **P1** |
| **D09** | Thẩm quyền ban hành câu mẫu và quy tắc RAG | Câu mẫu và FAQ chỉ có hiệu lực khi `is_active = true`; chỉ `ADMIN`/`CSKH_LEAD` được duyệt và xuất bản. | Chủ dự án, 16/10/2026 | **P1** |

---

## 2. Chi tiết từng quyết định nghiệp vụ

### Quyết định D01: Thang cảm xúc và phân loại sự cố cấp cứu
* **Bối cảnh & Chênh lệch:** Master Plan cũ quy định cảm xúc từ 1 đến 5, trong khi tài liệu nghiệp vụ đề cập thêm mức 6 dành cho cấp cứu thú cưng. Cột `chat_conversation.sentiment_level` trong CSDL Supabase có kiểu `integer` và ràng buộc CHECK giới hạn từ 1 đến 5.
* **Quyết định chốt:**
  1. Thang cảm xúc `sentiment_level` giữ nguyên **1 đến 5** để đo lường thuần túy trạng thái tâm lý của khách hàng:
     * *Level 1:* Rất hài lòng / Khen ngợi.
     * *Level 2:* Bình thường / Trung tính.
     * *Level 3:* Thất vọng nhẹ / Thắc mắc chậm trễ.
     * *Level 4:* Bức xúc / Giận dữ cao độ.
     * *Level 5:* Mất kiểm soát / Lăng mạ, xúc phạm.
  2. Các trường hợp **Cấp cứu y tế thú cưng** (chó mèo co giật, ngộ độc, khó thở, chấn thương chảy máu):
     * Không gán thành mức cảm xúc 6 (để tránh vi phạm CHECK constraint CSDL).
     * Bật cờ `chat_conversation.is_urgent = true`.
     * Gắn thẻ khẩn cấp y tế `metadata = {"emergency_type": "medical"}`.
     * Chatbot AI cung cấp ngay Hotline Bác sĩ thú y trực cấp cứu 24/7 và địa chỉ phòng khám, đồng thời đẩy chuông đỏ trên màn hình Admin.
  3. **Quy tắc chuyển đổi dữ liệu cũ:** Bất kỳ bản ghi lịch sử nào có mức 6 sẽ tự động ánh xạ thành `sentiment_level = 5` và `is_urgent = true`.

---

### Quyết định D02: Thẩm quyền xem nội dung nguyên văn (`raw_content`)
* **Bối cảnh:** Khi khách hàng tức giận chửi bới, việc hiển thị nguyên văn ngôn từ độc hại sẽ gây chấn thương tâm lý (mental distress) cho nhân viên trực ca. Tuy nhiên, nếu xóa hoàn toàn thì không có bằng chứng pháp lý khi đối soát khiếu nại.
* **Quyết định chốt:**
  1. Thiết lập quyền bảo mật hệ thống riêng biệt: `chat.raw.read`.
  2. **Đối tượng được xem nguyên văn:**
     * Chỉ vai trò Quản trị viên (`ADMIN`) và Trưởng nhóm CSKH (`CSKH_LEAD`).
     * Được xem khi mở modal điều tra sự cố hoặc xuất hồ sơ khiếu nại.
  3. **Đối với nhân viên trực chat thông thường (`CSKH`, `RECEPTIONIST`):**
     * Giao diện **100% hiển thị nội dung đã được làm sạch (`content`)**, các từ ngữ thô tục được che bằng ký tự hoa thị `***` hoặc hiển thị tóm tắt an toàn: `[Khách hàng đang bức xúc về việc giao hàng trễ 2 tiếng]`.
     * Tuyệt đối không cung cấp nút bấm bật xem nguyên văn cho nhân viên không có quyền `chat.raw.read`.

---

### Quyết định D03: Thẩm quyền và hạn mức cộng điểm bồi hoàn (Pawpoint)
* **Bối cảnh:** Đề xuất ban đầu trong tài liệu cũ cho phép Bot tự động cộng điểm hoặc nhân viên cộng tùy ý 50 điểm. Việc này tiềm ẩn nguy cơ thất thoát điểm và gian lận.
* **Quyết định chốt:**
  1. **Bot tự động:** Tuyệt đối **KHÔNG CÓ QUYỀN tự ý cộng điểm** trong bản phát hành đầu tiên (kể cả 1 điểm).
  2. **Hạn mức phân cấp theo vai trò nhân sự:**
     * *Nhân viên trực chat (`CSKH`):* Tối đa **50 điểm/ca** (tương đương 5.000 VNĐ). Bắt buộc phải chọn lý do từ danh mục đã duyệt (ví dụ: `Bù sự cố trễ hẹn giao hàng`, `Bù lỗi tư vấn sai thông tin`) và có bước bấm nút xác nhận.
     * *Trưởng ca / Quản lý (`CSKH_LEAD`, `ADMIN`):* Tối đa **200 điểm/ca** (tương đương 20.000 VNĐ).
     * *Mức bồi hoàn trên 200 điểm hoặc Hoàn tiền mặt/chuyển khoản:* Bắt buộc phải **Trích xuất thành Ticket khiếu nại** để thẩm định và phê duyệt theo quy trình tài chính, không thực hiện trực tiếp trên cửa sổ chat.
  3. **Cơ chế kỹ thuật:** Chuyển toàn bộ logic cộng điểm sang Backend RPC có transaction bảo vệ ở G1/G4, cấm client tự cập nhật bảng `customer_membership`.

---

### Quyết định D04: Quy tắc màng lọc Toxic Shield và khóa chat
* **Bối cảnh:** Cần ngăn chặn hành vi quấy rối nhưng không được khóa nhầm những khách hàng đang có thú cưng gặp sự cố thực tế.
* **Quyết định chốt:**
  1. **Cấp độ 1 (Vi phạm lần 1–2, chửi thề nhẹ):**
     * Toxic Shield tự động che từ ngữ phản cảm trên màn hình nhân viên.
     * Bot hoặc hệ thống gửi lời nhắc nhở lịch thiệp: *"PawPal thành thật xin lỗi vì trải nghiệm chưa trọn vẹn của sen. Em nhờ sen giữ bình tĩnh và trao đổi lịch thiệp để chuyên viên hỗ trợ mình chu đáo nhất nhé ạ!"*.
  2. **Cấp độ 2 (Vi phạm liên tiếp 3 lần HOẶC đe dọa vũ lực, xúc phạm danh dự nghiêm trọng):**
     * Hệ thống tự động ngắt kết nối phiên chat hiện tại, ghi nhận `blocked_until = NOW() + INTERVAL '30 minutes'`.
     * **Không khóa vĩnh viễn tài khoản:** Nhằm đảm bảo khách vẫn có thể tra cứu hồ sơ tiêm chủng và bệnh án của bé cưng.
     * Màn hình của khách hiển thị thông báo tạm khóa kèm **Số điện thoại Hotline khẩn cấp của Cửa hàng trưởng** để liên hệ trực tiếp nếu có vấn đề sức khỏe thú cưng cấp bách.
     * Tự động tạo 1 ticket cảnh báo an ninh cho Quản trị viên theo dõi.

---

### Quyết định D05: SLA phản hồi và quy trình nhận/chuyển ca (Handover & Takeover)
* **Bối cảnh:** Tránh tình trạng chuyển ca vô trách nhiệm khiến khách hàng phải chờ đợi vô định.
* **Quyết định chốt:**
  1. **Cam kết SLA phản hồi:**
     * *Ca thông thường:* Tối đa **5 phút** kể từ khi phiên chuyển sang trạng thái `waiting_agent`.
     * *Ca khẩn cấp (`is_urgent = true` hoặc `sentiment_level >= 4`):* Tối đa **2 phút**. Hàng đợi tự động đẩy ca lên vị trí ưu tiên số 1 kèm viền cảnh báo đỏ nhấp nháy.
  2. **Quy trình tiếp quản (Takeover):**
     * Nhân viên bấm nút "Tiếp quản ca chat": Hệ thống ngắt Bot, cập nhật `assigned_staff_id = staff.id` và chuyển `status = 'agent_handling'`.
  3. **Quy trình chuyển giao trách nhiệm (Handover):**
     * Khi chuyên viên A chuyển ca cho chuyên viên B hoặc cấp quản lý: Phiên chat vào trạng thái trung gian `waiting_agent` kèm người được chỉ định `target_staff_id`.
     * **Chỉ khi người nhận bấm nút "Tiếp nhận"** thì quyền điều khiển và trách nhiệm SLA mới chuyển giao chính thức.
     * Nếu sau **3 phút** người nhận chưa tiếp nhận: Hệ thống phát tín hiệu cảnh báo chuông đỏ trên toàn bộ màn hình ca trực.

---

### Quyết định D06: Ranh giới dữ liệu gửi cho mô hình AI (Privacy Boundary)
* **Bối cảnh:** Tuân thủ quy định bảo vệ dữ liệu cá nhân, không gửi thông tin nhạy cảm của khách hàng sang API nhà cung cấp mô hình trí tuệ nhân tạo (Google Gemini API).
* **Quyết định chốt:**
  1. **Dữ liệu ĐƯỢC PHÉP gửi cho AI:**
     * Tên bé cưng, giống loài, độ tuổi, cân nặng, tiền sử dị ứng đã ghi nhận.
     * Tên dịch vụ, bảng giá, thời lượng dịch vụ, chính sách hủy lịch.
     * Mã đơn hàng, trạng thái vận chuyển, danh mục sản phẩm trong giỏ hàng.
     * Lịch sử trao đổi trong phiên hiện tại (đã lọc số thẻ và địa chỉ nhà).
     * Kho tri thức FAQ và câu mẫu đã được duyệt xuất bản.
  2. **Dữ liệu TUYỆT ĐỐI CẤM gửi cho AI:**
     * Mật khẩu tài khoản, mã xác thực OTP, token phiên đăng nhập.
     * Thông tin thanh toán: Số thẻ ngân hàng, mã CVV, biên lai giao dịch tài chính.
     * Địa chỉ nhà chi tiết (chỉ gửi Tỉnh/Thành phố hoặc Quận/Huyện nếu cần tính toán thời gian giao hàng).
     * Số định danh cá nhân (CCCD/CMND), số điện thoại cá nhân (trừ khi người dùng chủ động gửi trong ngữ cảnh đặt lịch).

---

### Quyết định D07: Thời hạn lưu trữ nguyên văn (`raw_content`) và tệp bằng chứng
* **Quyết định chốt:**
  1. **Nội dung nguyên văn (`raw_content`):**
     * Lưu trữ tối đa **90 ngày** trong bảng `chat_message` phục vụ đối soát khiếu nại.
     * Sau 90 ngày, một tác vụ nền tự động làm rỗng cột `raw_content = null`, chỉ giữ lại cột `content` đã làm sạch và các trường `metadata` thống kê.
  2. **Hồ sơ khiếu nại đặc biệt:**
     * Đối với các ca phát sinh tranh chấp pháp lý hoặc tai nạn dịch vụ: Quản trị viên bấm "Lưu trữ hồ sơ sự cố" để chuyển thành Ticket lưu trữ dài hạn (tối đa 1 năm).
  3. **Hình ảnh và tệp đính kèm:**
     * Lưu trữ trong Supabase Storage private bucket có chính sách RLS nghiêm ngặt, chỉ cho phép nhân viên có thẩm quyền tải về xem bằng chứng.

---

### Quyết định D08: Chính sách bảo vệ tâm lý nhân viên trực chat (Employee Care)
* **Quyết định chốt:**
  1. Trang bị nút bấm "Yêu cầu hỗ trợ" và "Chuyển cấp quản lý" nổi bật trên thanh tác vụ trực chat để nhân viên lập tức gọi người hỗ trợ khi ca chat diễn biến căng thẳng.
  2. Nhân viên trực chat sau khi hoàn tất xử lý một ca căng thẳng (mức cảm xúc 4 hoặc 5) có quyền bấm "Nghỉ giải lao 15 phút" để ổn định tâm lý.
  3. **Không xử phạt KPI tiêu cực:** Tuyệt đối không sử dụng hành động chuyển ca hoặc yêu cầu hỗ trợ của nhân viên làm căn cứ đánh giá tiêu cực hoặc trừ điểm thi đua của nhân viên đó.
  4. **Giới hạn trách nhiệm AI:** Chatbot AI không đưa ra các phán đoán hoặc đánh giá về trạng thái tâm lý hay năng lực của nhân viên; AI chỉ thống kê số lượng ca hỗ trợ để phục vụ quản lý nhân sự.

---

### Quyết định D09: Quy trình ban hành câu mẫu và tri thức RAG (Content Governance)
* **Quyết định chốt:**
  1. Toàn bộ câu mẫu phản hồi nhanh (`chatbot_canned_response`) và tri thức câu hỏi thường gặp (`chatbot_knowledge_faq`) chỉ được phép nạp vào bộ nhớ AI và đưa vào danh sách chọn nhanh của nhân viên khi có thuộc tính `is_active = true`.
  2. **Phân quyền biên soạn & Phê duyệt:**
     * Chuyên viên CSKH: Có quyền đề xuất câu mẫu mới (ở trạng thái `is_active = false`).
     * Chỉ vai trò `ADMIN` hoặc `CSKH_LEAD`: Có thẩm quyền chỉnh sửa, kiểm duyệt nội dung, gán nhãn chính sách và bật xuất bản (`is_active = true`).
  3. Mọi hành động thêm mới, cập nhật hoặc xóa bỏ quy tắc trong Rules Hub bắt buộc phải được ghi lại trong bảng nhật ký kiểm toán hệ thống (`audit_log`).

---

## 3. Quy tắc tóm tắt ca AI (Tách bạch sự thật và phản ánh)

Trong prompt hướng dẫn tóm tắt ca chat của Copilot (`ai_summary`), AI bắt buộc phải phân tách rõ ràng 2 khối thông tin:
1. **[Khách hàng phản ánh]:** Ghi nhận nguyên vẹn những gì khách hàng mô tả theo góc nhìn của khách (ví dụ: *"Khách phản ánh bé mèo về nhà đi khập khiễng chân sau và tiệm giao thiếu 1 gói pate cá hồi"*).
2. **[Hệ thống/Nhân viên xác minh]:** Ghi nhận dữ liệu thực tế đã kiểm tra từ CSDL tiệm (ví dụ: *"KTV xác nhận bé có cựa quậy khi cắt móng lúc 14:30; camera phòng spa lưu đoạn 14:20-15:00; đơn hàng ORD-001 trên hệ thống có 2 gói pate, kho đã xác nhận giao đủ"*).

Tuyệt đối cấm AI tự ý kết luận tiệm có lỗi hoặc tự cam kết bồi hoàn/y tế khi chưa có xác nhận từ Quản lý.
