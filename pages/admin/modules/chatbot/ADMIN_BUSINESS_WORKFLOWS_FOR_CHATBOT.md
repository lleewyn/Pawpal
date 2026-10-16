# TÀI LIỆU TỔNG QUAN NGHIỆP VỤ 9 PHÂN HỆ ADMIN PAWPAL DÀNH CHO HUẤN LUYỆN VÀ PHÁT TRIỂN CHATBOT (AI KNOWLEDGE BASE)

> **Tài liệu tham chiếu chuẩn hóa kiến thức (Ground Truth):** Cung cấp toàn bộ bối cảnh nghiệp vụ, cấu trúc dữ liệu, thẩm quyền xử lý và kịch bản tương tác khách hàng của hệ thống quản trị Pawpal-er phục vụ việc phát triển Chatbot AI (Gemini 1.5 Pro) và Trợ lý Trực chat CSKH.
> **Phiên bản:** 2.0 (Cập nhật ngày 16/10/2026 sau khi hoàn tất kiểm thử Live CSDL 9/9 phân hệ).
> **Tuân thủ quy chuẩn:** AGENTS.md & Hệ thống Live Database Supabase.

---

## MỤC LỤC TỔNG QUAN HỆ THỐNG (9 PHÂN HỆ)

1. [Phân hệ 1: Dashboard (Bàn điều phối & Chỉ số vận hành)](#1-phân-hệ-1-dashboard-bàn-điều-phối--chỉ-số-vận-hành)
2. [Phân hệ 2: Khách hàng (Hồ sơ 360°, Phân hạng & Pawpoint)](#2-phân-hệ-2-khách-hàng-hồ-sơ-360-phân-hạng--pawpoint)
3. [Phân hệ 3: Thú cưng (Hồ sơ sức khỏe, Cảnh báo & Nhắc lịch)](#3-phân-hệ-3-thú-cưng-hồ-sơ-sức-khỏe-cảnh-báo--nhắc-lịch)
4. [Phân hệ 4: Dịch vụ (Lịch hẹn Spa/Grooming, Tiếp nhận an toàn & Pet Hotel)](#4-phân-hệ-4-dịch-vụ-lịch-hẹn-spagrooming-tiếp-nhận-an-toàn--pet-hotel)
5. [Phân hệ 5: Bán hàng & Kho (Đơn hàng POS, Tồn kho, RMA & Voucher)](#5-phân-hệ-5-bán-hàng--kho-đơn-hàng-pos-tồn-kho-rma--voucher)
6. [Phân hệ 6: Nhân sự (Kỹ thuật viên, Lịch trực Roster & Đổi ca)](#6-phân-hệ-6-nhân-sự-kỹ-thuật-viên-lịch-trực-roster--đổi-ca)
7. [Phân hệ 7: Khiếu nại (Điều tra sự cố, Phân công & Phương án bồi hoàn)](#7-phân-hệ-7-khiếu-nại-điều-tra-sự-cố-phân-công--phương-án-bồi-hoàn)
8. [Phân hệ 8: Chatbot & Trực chat CSKH (Hộp thư Live, Copilot & Màng lọc Toxic Shield)](#8-phân-hệ-8-chatbot--trực-chat-cskh-hộp-thư-live-copilot--màng-lọc-toxic-shield)
9. [Phân hệ 9: Cấu hình hệ thống (Banner, Cẩm nang Blog, Vận hành & Audit Log)](#9-phân-hệ-9-cấu-hình-hệ-thống-banner-cẩm-nang-blog-vận-hành--audit-log)
10. [Ma trận phân quyền thẩm quyền xử lý tự động của Chatbot (Bot vs Human Boundary)](#10-ma-trận-phân-quyền-thẩm-quyền-xử-lý-tự-động-của-chatbot-bot-vs-human-boundary)

---

## 1. PHÂN HỆ 1: DASHBOARD (BÀN ĐIỀU PHỐI & CHỈ SỐ VẬN HÀNH)

### 1.1. Mục tiêu & Ý nghĩa nghiệp vụ
Dashboard là "phòng điều khiển trung tâm" của cửa hàng PawPal, phản ánh tình hình hoạt động tức thời theo thời gian thực: doanh thu bán hàng trong ngày, số lượng lịch hẹn làm đẹp/khách sạn, tình trạng giao nhận đơn hàng, và các cảnh báo khẩn cấp cần nhân sự xử lý ngay lập tức (ca quá hạn SLA, ca khách giận dữ, thuốc cận date).

### 1.2. Các Subtabs & Khu vực chức năng
- **Thanh chỉ số KPI vận hành tức thời:**
  - *Doanh thu hôm nay:* Tổng hợp tiền thu từ đơn hàng POS bán lẻ tại quầy và các ca dịch vụ đã thanh toán.
  - *Lịch hẹn dịch vụ trong ngày:* Số lượng thú cưng đặt lịch hôm nay (phân định: Đã đến, Đang phục vụ, Chờ tiếp nhận).
  - *Đơn hàng mới chờ duyệt:* Đơn đặt online cần xác nhận và xuất kho đóng gói trong 30 phút.
  - *Cảnh báo khẩn cấp (SLA Alert):* Đếm số ca khiếu nại chưa xử lý hoặc ca khách chờ phản hồi chat quá 2 phút.
- **Lịch điều phối đa năng (Calendar Dispatcher):**
  - Hỗ trợ 3 chế độ xem: **Tháng** (xem mật độ đặt lịch), **Tuần** (điều phối công suất phòng và bàn cắt tỉa), **Ngày** (theo dõi tiến độ từng khung giờ 08:00–21:00).
  - Thao tác nhanh tại chỗ: Tiếp nhận thú cưng vào bàn spa, bấm xem trực tiếp hồ sơ ca 360°.
- **Phím tắt nghiệp vụ quầy tiếp tân:**
  - `Tiếp nhận bé mới`: Mở form tiếp nhận nhanh thú cưng vãng lai vào hệ thống.
  - `Lên đơn bán lẻ`: Chuyển thẳng sang giao diện máy POS quầy thu ngân.
  - `Đặt lịch Spa và Hotel`: Khởi tạo lịch hẹn mới cho khách gọi điện hoặc đến trực tiếp.

### 1.3. Ánh xạ CSDL Supabase
- Bảng liên quan: `appointment`, `sales_order`, `support_ticket`, `staff_schedule`.

### 1.4. Bối cảnh dành cho Chatbot AI
- **Khách hỏi:** *"Cửa hàng hôm nay còn chỗ tắm cho bé Corgi lúc 3h chiều không shop?"*
- **Chatbot hành động:** Kiểm tra `appointment` trong ngày, đối chiếu công suất tối đa của chi nhánh (`pawpal_setting.booking_policy`). Nếu còn bàn trống, trả lời xác nhận và gợi ý đặt lịch; nếu kín bàn, lịch sự đề xuất khung giờ trống gần nhất (ví dụ: 16:30).

---

## 2. PHÂN HỆ 2: KHÁCH HÀNG (HỒ SƠ 360°, PHÂN HẠNG & PAWPOINT)

### 2.1. Mục tiêu & Ý nghĩa nghiệp vụ
Xây dựng mối quan hệ dài hạn với chủ nuôi (Pet Parents). Khách hàng không chỉ là người mua hàng mà là đối tác chăm sóc sinh mệnh thú cưng. Quản lý toàn bộ lịch sử chi tiêu, hành vi, sở thích, phản ánh khiếu nại và cơ chế thăng hạng thành viên.

### 2.2. Chi tiết từng Subtab
1. **Subtab 1 — Danh sách khách hàng (`tab-customer-list`):**
   - Danh sách toàn bộ chủ nuôi với mã định danh (CUST-xxx), Họ tên, Số điện thoại, Hạng thành viên, Số điểm tích lũy, Trạng thái (Đang hoạt động, Bị khóa).
   - Bộ lọc phân loại nhanh: Lọc khách VIP, Thành viên, Khách vãng lai, Khách đang có khiếu nại chưa giải quyết.
   - Nút chức năng: `Thêm khách` (tạo hồ sơ thành viên mới tại quầy, bắt buộc SĐT duy nhất), `Xuất file` CSV dữ liệu.
2. **Subtab 2 — Hồ sơ khách hàng 360° (`tab-customer-detail`):**
   - *Thông tin nhân khẩu học & Liên lạc:* Họ tên, SĐT, Email, Zalo, danh bạ đa địa chỉ giao hàng (Địa chỉ mặc định có viền xanh `#C3DEC7`).
   - *Danh sách bé cưng đang nuôi:* Liên kết trực tiếp sang từng hồ sơ thú cưng của khách (chó, mèo, thỏ...).
   - *Lịch sử chi tiêu & Dịch vụ:* Toàn bộ đơn hàng đã mua, số tiền đã chi, tần suất đặt lịch Spa/Khách sạn.
   - *Nhật ký ghi chú nội bộ (Staff Notes):* Những lưu ý đặc biệt chỉ nhân viên thấy (Ví dụ: "Khách rất kỹ tính về độ dài lông mặt", "Ưu tiên sắp xếp KTV nữ làm nhẹ tay").
3. **Subtab 3 — Pawpoint & Hạng thành viên (`tab-customer-points`):**
   - *Quy chế tích điểm chuẩn:* Mỗi 10.000 VNĐ chi tiêu = Tích lũy 1 điểm Pawpoint (1 điểm = 100 VNĐ khi đổi voucher hoặc trừ trực tiếp vào hóa đơn).
   - *Bảng 4 phân hạng thành viên:*
     - **Đồng (Bronze):** Điểm tích lũy 0 - 199 điểm (Ưu đãi cơ bản).
     - **Bạc (Silver):** 200 - 499 điểm (Tích điểm nhân hệ số 1.1, giảm 5% dịch vụ Spa ngày sinh nhật bé).
     - **Vàng (Gold):** 500 - 999 điểm (Tích điểm nhân 1.25, giảm 10% phụ kiện, ưu tiên giữ phòng Pet Hotel ngày lễ).
     - **Kim Cương (Diamond):** Từ 1.000 điểm trở lên (Tích điểm nhân 1.5, miễn phí giao hàng hỏa tốc trong 5km, chuyên viên CSKH phục vụ riêng 1-1).
   - *Điều chỉnh điểm thủ công:* Cho phép CSKH cộng điểm đền bù (Bù sự cố trễ hẹn, Tặng điểm tri ân sinh nhật) hoặc trừ điểm khi hoàn tiền đơn hàng.

### 2.3. Ánh xạ CSDL Supabase
- Bảng liên quan: `customer`, `customer_profile`, `customer_address`, `customer_membership`, `membership_tier`, `paw_point_transaction`.

### 2.4. Bối cảnh dành cho Chatbot AI
- **Khách hỏi:** *"Điểm của mình hiện tại có đổi được voucher giảm giá thức ăn hạt không?"*
- **Chatbot hành động:** Tra cứu số điểm khả dụng của khách từ SĐT hội thoại. Báo chính xác số điểm hiện có, hạng thành viên và gợi ý các mã voucher phù hợp trong bảng `voucher` có thể đổi bằng Pawpoint.

---

## 3. PHÂN HỆ 3: THÚ CƯNG (HỒ SƠ SỨC KHỎE, CẢNH BÁO & NHẮC LỊCH)

### 3.1. Mục tiêu & Ý nghĩa nghiệp vụ
Lưu trữ toàn diện "bệnh án điện tử" và hồ sơ sinh trắc của từng bé cưng. Đảm bảo nhân viên Spa và Bác sĩ thú y nắm rõ thể trạng, tiền sử dị ứng và thói quen tâm lý của bé trước khi chạm vào người bé, triệt tiêu 100% tai nạn nghề nghiệp.

### 3.2. Chi tiết từng Subtab
1. **Subtab 1 — Danh sách thú cưng (`tab-pet-list`):**
   - Danh mục tất cả bé cưng đang được gửi hoặc sử dụng dịch vụ tại hệ thống.
   - Tìm kiếm linh hoạt theo Tên bé, Mã Microchip, Số điện thoại chủ nuôi hoặc Giống loài (Poodle, Corgi, Mèo Anh lông ngắn...).
   - Hiển thị nhãn cảnh báo đỏ đối với các bé có ghi chú đặc biệt: `Dữ`, `Sợ máy sấy`, `Bệnh tim`, `Viêm da`.
2. **Subtab 2 — Hồ sơ bé cưng 360° (`tab-pet-detail`):**
   - *Đặc điểm nhận dạng:* Loài (Chó/Mèo), Giống, Giới tính, Màu lông, Ngày sinh, Tình trạng triệt sản, Cân nặng hiện tại.
   - *Cảnh báo an toàn tuyệt đối (Safety Warnings):* Vùng cơ thể bé nhạy cảm không được chạm mạnh (tai, đuôi, móng chân), phản ứng khi gặp người lạ.
   - *Tiền sử dị ứng & Chế độ ăn:* Dị ứng đạm bò, dị ứng sữa tắm hương hoa cúc, thức ăn kiêng.
3. **Subtab 3 — Nhật ký chăm sóc & Y tế (`tab-pet-medical`):**
   - Ghi lại diễn biến sau mỗi lần đến tiệm: Chỉ số cân nặng theo thời gian, hình ảnh chụp thực tế trước và sau khi cắt tỉa (Before/After).
   - Tình trạng da lông ghi nhận: Da khô, có ve rận, viêm kẽ móng, độ bết lông.
4. **Subtab 4 — Nhắc lịch tiêm phòng & Tẩy giun (`tab-pet-reminders`):**
   - Lịch tiêm phòng các mũi bắt buộc:
     * *Chó:* Mũi 1 (Care, Parvo lúc 6-8 tuần), Mũi 2 & 3 (Vaccine 7 bệnh cách nhau 3-4 tuần), Mũi Dại (Rabies từ 3 tháng tuổi). Nhắc tiêm nhắc lại hàng năm.
     * *Mèo:* Vaccine 4 bệnh (Giảm bạch cầu, Viêm mũi khí quản, Calici, Chlamydia) và Vaccine Dại.
   - Lịch tẩy giun định kỳ (3 tháng/lần) và nhỏ gáy phòng trị ve rận (1 tháng/lần).

### 3.3. Ánh xạ CSDL Supabase
- Bảng liên quan: `pet_profile`, `pet_medical_record`, `pet_weight_history`, `pet_vaccination_schedule`.

### 3.4. Bối cảnh dành cho Chatbot AI
- **Khách hỏi:** *"Bé Poodle nhà mình tên Bơ, dạo này bé hay gãi tai, tiệm xem giúp bé tiêm mũi dại lần cuối là khi nào?"*
- **Chatbot hành động:** Tìm thú cưng `Bơ` thuộc `customer_id` của khách, đọc bảng `pet_vaccination_schedule`. Trả lời rõ ngày tiêm gần nhất, nếu đã quá hạn 12 tháng thì ân cần nhắc khách đặt lịch tiêm phòng kèm khám tai miễn phí.

---

## 4. PHÂN HỆ 4: DỊCH VỤ (LỊCH HẸN SPA/GROOMING, TIẾP NHẬN AN TOÀN & PET HOTEL)

### 4.1. Mục tiêu & Ý nghĩa nghiệp vụ
Trọng tâm doanh thu dịch vụ của PawPal. Quy trình phục vụ được chuẩn hóa nghiêm ngặt qua 4 bước: **Tiếp nhận kiểm tra lâm sàng -> Thực hiện quy trình dịch vụ -> Nghiệm thu chất lượng -> Bàn giao & Thu ngân**.

### 4.2. Chi tiết từng Subtab
1. **Subtab 1 — Lịch hẹn & Điều phối (`tab-service-calendar`):**
   - Theo dõi toàn bộ dòng dịch chuyển ca dịch vụ trong ngày: Khách đã đến quầy, Khách trễ hẹn quá 15 phút (bật SLA Warning), Ca đang sấy cắt, Ca đã hoàn tất chờ đón.
   - Gán Kỹ thuật viên (KTV) phụ trách trực tiếp: Kiểm tra KTV có chứng chỉ cắt tỉa phù hợp với giống chó mèo hay không.
2. **Subtab 2 — Biên bản & Hồ sơ ca 360° (`tab-service-detail`):**
   - **Biên bản tiếp nhận an toàn:** Bắt buộc chụp ảnh và kiểm tra tình trạng bé khi vừa giao nhận: có vết rách da cũ không, có bọ chét không, mắt có ghèn không. Chủ nuôi ký xác nhận trước khi đưa bé vào phòng tắm.
   - **Tính toán phụ phí minh bạch (Surcharge):**
     * Lông rối nghiêm trọng cần gỡ thủ công: Phụ phí 50.000 – 150.000 VNĐ.
     * Bé quá kích thước / Thừa cân theo bảng giá: Phụ thu theo nấc cân nặng.
     * Tắm trị liệu nấm / Khử mùi tuyến hôi chuyên sâu.
   - **Nghiệm thu hoàn tất (Quality Sign-off):** KTV trưởng tick đủ tiêu chí: Tai sạch, móng cắt mài êm, lông tơi xốp không đọng xà phòng, tinh thần bé vui vẻ.
3. **Subtab 3 — Danh mục & Bảng giá dịch vụ (`tab-service-catalog`):**
   - Cấu hình chi tiết các gói dịch vụ:
     * *Spa cơ bản:* Tắm thảo dược, sấy chải tơi lông, vệ sinh tai, cắt mài móng, vắt tuyến hôi.
     * *Grooming tạo kiểu chuyên sâu:* Cắt tỉa theo phong cách Hàn Quốc / Nhật Bản, cạo vệ sinh bụng - hậu môn, nhuộm lông tai/đuôi bằng màu thực vật an toàn.
     * *Pet Hotel (Khách sạn thú cưng):* Phòng Standard (có camera theo dõi, điều hòa 24/7, ăn hạt cao cấp), Phòng VIP Penthouse (khu vui chơi riêng, sữa dê tươi mỗi sáng).
     * *Pet Taxi đưa đón tận nhà:* Tính cước theo km, xe chuyên dụng có lồng cách ly và khử khuẩn tia cực tím.
   - Bảng giá phân theo phân khúc cân nặng: Dưới 3kg, 3–5kg, 5–10kg, 10–15kg, trên 15kg.
4. **Subtab 4 — Đánh giá dịch vụ (`tab-service-reviews`):**
   - Tổng hợp đánh giá từ 1 đến 5 sao của khách hàng gửi sau khi trải nghiệm dịch vụ.
   - Quản trị viên phản hồi trực tiếp các thắc mắc, tri ân đánh giá tốt hoặc chuyển các ca 1–2 sao sang phân hệ Khiếu nại để giải quyết bồi thường.

### 4.3. Ánh xạ CSDL Supabase
- Bảng liên quan: `service`, `service_category`, `service_price_tier`, `appointment`, `appointment_checkin_protocol`, `appointment_surcharge`, `review`.

### 4.4. Bối cảnh dành cho Chatbot AI
- **Khách hỏi:** *"Giá tắm cắt lông cho bé Corgi 9kg là bao nhiêu shop? Có cần đặt trước không?"*
- **Chatbot hành động:** Tra bảng `service_price_tier` của gói Grooming toàn diện nấc 5–10kg (ví dụ: 350.000 VNĐ). Giải thích quy trình bao gồm 8 bước vệ sinh, thời gian thực hiện khoảng 90-120 phút và khuyến khích đặt chỗ trước 2 tiếng để không phải chờ đợi.

---

## 5. PHÂN HỆ 5: BÁN HÀNG & KHO (ĐƠN HÀNG POS, TỒN KHO, RMA & VOUCHER)

### 5.1. Mục tiêu & Ý nghĩa nghiệp vụ
Vận hành hoạt động thương mại bán lẻ đa kênh (Omnichannel): bán trực tiếp tại quầy tiếp tân (POS), bán qua Website PawPal, giao hỏa tốc hoặc giao bưu cục toàn quốc. Quản lý chính xác biến động xuất nhập tồn và xử lý đổi trả bảo hành minh bạch.

### 5.2. Chi tiết từng Subtab
1. **Subtab 1 — Danh sách đơn hàng & POS tại quầy (`tab-order-list`):**
   - *Giao diện POS tạo đơn nhanh:* Tìm sản phẩm bằng mã barcode/SKU, chọn khách hàng tích điểm, áp mã giảm giá, hỗ trợ thanh toán Tiền mặt, Chuyển khoản QR, Thẻ ngân hàng, Ví điện tử MoMo/VNPay.
   - *Quản lý trạng thái đơn hàng (Chuẩn Enum Postgres):*
     * `PENDING`: Đơn mới đặt, chờ xác nhận.
     * `PACKING`: Đơn đã duyệt, nhân viên kho đang đóng gói.
     * `SHIPPING`: Đã giao cho đối tác vận chuyển (J&T Express, GHN), có mã vận đơn (Tracking number).
     * `DELIVERED`: Khách đã nhận đủ hàng thành công.
     * `CANCELLED`: Đơn bị hủy (hoàn trả số dư ví hoặc hủy thanh toán COD).
     * `RETURNED`: Đơn hàng phát sinh đổi trả hoặc bồi hoàn.
   - *In phiếu đóng gói & Bảng kê vận chuyển:* Mẫu in khổ A5/A4 có mã vạch đơn, địa chỉ giao hàng và chữ ký các bên.
2. **Subtab 2 — Hồ sơ đơn hàng 360° & Đổi trả RMA (`tab-order-detail`):**
   - Xem chi tiết từng mặt hàng trong đơn: Ảnh, SKU, Tên, Số lượng, Đơn giá, Chiết khấu, Thành tiền.
   - Quy trình đổi trả hàng RMA (`return_request`):
     * Các trường hợp chấp thuận: Hàng giao sai quy cách, bao bì móp rách hư hỏng, sản phẩm hết hạn sử dụng.
     * Phương án xử lý: Đổi sản phẩm mới (`EXCHANGE`) hoặc Hoàn lại tiền (`RETURN`).
     * Tùy chọn nhập lại kho: Nếu sản phẩm nguyên vẹn thì tự động nhập lại kho khả dụng (`inventory.quantity_in_stock`).
3. **Subtab 3 — Sản phẩm, Kho hàng & Nhập kho (`tab-order-products`):**
   - Quản lý danh mục hàng hóa: Thức ăn khô (Dry food), Pate ướt, Cát vệ sinh, Đồ chơi, Thuốc thú y, Phụ kiện dây dắt.
   - Cảnh báo tồn kho an toàn: Sản phẩm có số lượng tồn kho <= Ngưỡng tối thiểu (`minimum_stock`) sẽ được gắn nhãn đỏ `Sắp hết hàng` để thủ kho kịp đặt hàng nhà cung cấp.
   - Thao tác nghiệp vụ kho: Tạo phiếu nhập kho hàng loạt (GRN), Phiếu kiểm kê cân bằng kho định kỳ (Stocktake).
4. **Subtab 4 — Khuyến mãi & Voucher (`tab-order-promos`):**
   - Cấu hình mã voucher dùng chung hoặc voucher tặng riêng từng khách hàng.
   - Các hình thức giảm giá: Giảm theo phần trăm (Ví dụ: 10%, 15% - có giới hạn tối đa), Giảm trừ tiền mặt trực tiếp (Ví dụ: Giảm 50.000 VNĐ).
   - Điều kiện áp dụng: Giá trị đơn hàng tối thiểu, Số lượt dùng tối đa toàn hệ thống, Điểm Pawpoint yêu cầu để mở khóa, Ngày bắt đầu và Ngày hết hạn.

### 5.3. Ánh xạ CSDL Supabase
- Bảng liên quan: `sales_order`, `sales_order_detail`, `product`, `product_category`, `inventory`, `return_request`, `return_request_detail`, `voucher`.

### 5.4. Bối cảnh dành cho Chatbot AI
- **Khách hỏi:** *"Đơn hàng ORD-2026-089 của mình đặt hôm qua đã giao tới đâu rồi shop?"*
- **Chatbot hành động:** Tìm mã đơn trong bảng `sales_order`. Kiểm tra trạng thái: nếu `SHIPPING`, đọc mã vận đơn `tracking_number` và tên nhà vận chuyển, báo rõ dự kiến thời gian giao hàng đến tay khách.

---

## 6. PHÂN HỆ 6: NHÂN SỰ (KỸ THUẬT VIÊN, LỊCH TRỰC ROSTER & ĐỔI CA)

### 6.1. Mục tiêu & Ý nghĩa nghiệp vụ
Đảm bảo nhân sự phục vụ được sắp xếp đúng chuyên môn và tuân thủ Luật Lao động: Mỗi nhân viên không làm việc quá 8 giờ/ngày. Quản lý lịch trực, ngày nghỉ phép và sự công bằng trong điều phối ca trực.

### 6.2. Chi tiết từng Subtab
1. **Subtab 1 — Danh sách nhân viên (`tab-staff-list`):**
   - Danh sách toàn bộ nhân sự: Kỹ thuật viên Grooming, Nhân viên Khách sạn thú cưng, Bác sĩ thú y, Thu ngân tiếp tân, Quản lý cửa hàng.
   - Trạng thái tài khoản: Đang làm việc (`ACTIVE`), Tạm nghỉ (`ON_LEAVE`), Đã nghỉ việc (`TERMINATED`).
2. **Subtab 2 — Hồ sơ Kỹ thuật viên 360° (`tab-staff-detail`):**
   - Chuyên môn, cấp bậc tay nghề (Level 1 - Phụ tắm sấy, Level 2 - Cắt tỉa chuẩn, Level 3 - Master Stylist tạo kiểu mẫu khó).
   - Số ca đã phục vụ, chỉ số đánh giá hài lòng từ khách hàng, lịch sử khen thưởng / kỷ luật SOP.
3. **Subtab 3 — Lịch làm việc Roster & Đổi ca (`tab-staff-schedule`):**
   - *3 Khung ca chuẩn hệ thống:*
     * **Ca Sáng (MORNING):** 08:00 – 12:00 (4.0 giờ).
     * **Ca Chiều (AFTERNOON):** 13:00 – 17:00 (4.0 giờ).
     * **Ca Tối (EVENING):** 17:00 – 21:00 (4.0 giờ).
     *(Tuyệt đối không phân quá 2 ca/ngày = tối đa 8.0 giờ để đảm bảo sức khỏe KTV).*
   - *Quy trình Đơn nghỉ & Đổi ca (`staff_shift_request`):*
     * Nhân viên làm đơn xin nghỉ phép (`LEAVE`) hoặc đổi ca chéo (`SWAP`) với đồng nghiệp.
     * Quản trị viên duyệt đơn qua RPC Postgres: Hệ thống tự động chuyển trạng thái ca cũ sang `OFF` và cập nhật ca trực cho người nhận thay, đảm bảo không trùng ca và không vượt ngưỡng 8 giờ/ngày.
4. **Subtab 4 — Đánh giá & Hiệu suất KPI (`tab-staff-kpi`):**
   - Theo dõi doanh thu theo đầu KTV, số lượt đánh giá 5 sao từ khách, tỷ lệ xảy ra khiếu nại chất lượng dịch vụ.

### 6.3. Ánh xạ CSDL Supabase
- Bảng liên quan: `staff`, `staff_schedule`, `staff_shift_request`.

### 6.4. Bối cảnh dành cho Chatbot AI
- **Khách hỏi:** *"Hôm nay bạn KTV Hùng có đi làm không? Mình chỉ muốn bạn Hùng tỉa lông cho bé Poodle nhà mình thôi."*
- **Chatbot hành động:** Tra cứu bảng `staff_schedule` của nhân viên `Trần Văn Hùng` trong ngày hôm nay. Nếu có ca trực (SCHEDULED/WORKING), báo khách khung giờ KTV Hùng đang rảnh; nếu KTV Hùng nghỉ phép (OFF), lịch sự tư vấn KTV khác có tay nghề Master tương đương.

---

## 7. PHÂN HỆ 7: KHIẾU NẠI (ĐIỀU TRA SỰ CỐ, PHÂN CÔNG & PHƯƠNG ÁN BỒI HOÀN)

### 7.1. Mục tiêu & Ý nghĩa nghiệp vụ
Xoa dịu bức xúc của khách hàng khi phát sinh sự cố ngoài ý muốn. Quy trình xử lý dựa trên nguyên tắc: **Lắng nghe chân thành -> Không đổ lỗi -> Trích xuất camera điều tra -> Bồi hoàn thỏa đáng trong vòng 24 giờ**.

### 7.2. Chi tiết từng Subtab
1. **Subtab 1 — Khiếu nại Dịch vụ Spa & Hotel (`tab-complaint-services`):**
   - Quản lý các sự cố: Bé bị trầy xước nhẹ ở vành tai/móng chân sau ca cắt tỉa, bé bị dị ứng sữa tắm, thức ăn ở khách sạn làm bé đi ngoài lỏng, KTV thái độ chưa chuẩn mực.
   - Theo dõi mốc cảnh báo thời gian SLA (Quá hạn 30 phút chưa tiếp nhận là báo động đỏ).
2. **Subtab 2 — Khiếu nại Đơn hàng bán lẻ (`tab-complaint-orders`):**
   - Quản lý các phản ánh: Giao trễ giờ hẹn, giao thiếu số lượng gói pate, bao bì hạt bị bục rách do vận chuyển, giao nhầm size quần áo thú cưng.
3. **Subtab 3 — Hồ sơ khiếu nại 360° & Bồi hoàn (`tab-complaint-detail`):**
   - *Phân công người phụ trách (Assign Handler):* Chuyển vé cho KTV trưởng hoặc Trưởng ca CSKH điều tra trực tiếp.
   - *Yêu cầu gửi ảnh/video qua Zalo OA:* Tự động gửi thông điệp yêu cầu chủ nuôi cung cấp ảnh chụp cận cảnh vết thương hoặc sản phẩm lỗi để Bác sĩ thú y thẩm định từ xa.
   - *Bộ 4 giải pháp bồi hoàn linh hoạt (Resolution Matrix):*
     * **1. Đổi hàng mới / Bổ sung (RMA):** Giao bù hỏa tốc miễn phí trong 2 giờ.
     * **2. Thực hiện lại dịch vụ miễn phí:** Mời bé quay lại tiệm để chuyên viên Master chăm sóc phục hồi da lông miễn phí.
     * **3. Bồi hoàn Pawpoint / Voucher tạ lỗi:** Tặng điểm vào ví tài khoản (tương ứng 50.000 – 200.000 VNĐ) để tri ân sự thông cảm của khách.
     * **4. Hoàn tiền (Refund):** Hoàn lại 100% chi phí ca dịch vụ hoặc đơn hàng về tài khoản ngân hàng của khách.

### 7.3. Ánh xạ CSDL Supabase
- Bảng liên quan: `support_ticket`, `support_ticket_message`, `return_request`.

### 7.4. Bối cảnh dành cho Chatbot AI
- **Khách nhắn:** *"Bé mèo nhà mình đi tắm về thấy chân sau bị khập khiễng, tiệm làm ăn kiểu gì vậy hả???"*
- **Chatbot hành động (Cấp độ cảm xúc Level 4-5):**
  - **TUYỆT ĐỐI KHÔNG CÃI LẠI HOẶC ĐỔ LỖI CHO BÉ.**
  - Lập tức gửi lời xin lỗi chân thành: *"Dạ PawPal thành thật xin lỗi sen và bé vì sự cố đáng tiếc này! Em xin phép ưu tiên tiếp nhận ngay ca này."*
  - Tự động tạo vé sự cố khẩn cấp trong bảng `support_ticket` (`priority = 'Cao'`, `status = 'pending'`).
  - Đẩy thông báo chuông đỏ trên màn hình Quản trị viên để chuyên viên gọi điện hỗ trợ khách trong vòng 3 phút.

---

## 8. PHÂN HỆ 8: CHATBOT & TRỰC CHAT CSKH (HỘP THƯ LIVE, COPILOT & MÀNG LỌC TOXIC SHIELD)

### 8.1. Mục tiêu & Ý nghĩa nghiệp vụ
Kênh giao tiếp thời gian thực kết hợp giữa Trí tuệ Nhân tạo 24/7 và Chuyên viên con người. Giữ chân khách hàng, tăng tỷ lệ chuyển đổi dịch vụ và bảo vệ tâm lý nhân viên trước những ngôn từ quá khích.

### 8.2. Chi tiết từng Subtab
1. **Subtab 1 — Trực chat CSKH thời gian thực (`tab-chatbot-live`):**
   - *Bố cục 3 khu vực chuyên nghiệp:*
     * **Cột 1 (Hộp thư Inbox):** Danh sách khách đang chờ chat, phân loại theo 3 tab (*Cần xử lý gấp*, *Đang chat*, *Tất cả*), hiển thị đồng hồ đếm ngược SLA (Xanh < 60s, Vàng 60-120s, Đỏ > 120s).
     * **Cột 2 (Khung chat Live):** Luồng tin nhắn thời gian thực, hiển thị rõ bong bóng tin nhắn của Khách hàng, Bot tự động, hoặc Chuyên viên hỗ trợ. Nút `Tiếp quản ca chat (Takeover)` cho phép người thật ngắt Bot và trò chuyện trực tiếp.
     * **Cột 3 (Bối cảnh khách hàng 360°):** Tên khách, số điện thoại, hạng thành viên, hồ sơ các bé cưng đang nuôi, đơn hàng gần nhất, lịch hẹn gần nhất và thẻ gợi ý câu trả lời thông minh một chạm (Smart Suggestions).
   - *Thao tác tác vụ nâng cao:*
     * `Trích xuất vé hỗ trợ`: Chuyển toàn bộ nội dung đoạn chat thành Vé khiếu nại chính thức trong phân hệ Khiếu nại mà không bắt khách phải gõ lại từ đầu.
     * `Chuyển cấp quản lý / Bác sĩ`: Bàn giao ca trực tiếp cho Bác sĩ thú y trực ca khi khách mô tả các triệu chứng cấp cứu nguy hiểm (co giật, ngộ độc, khó thở).
2. **Subtab 2 — Trợ lý AI Copilot (`tab-chatbot-copilot`):**
   - Sử dụng mô hình Gemini 1.5 Pro kết nối cơ chế RAG (Retrieval-Augmented Generation) tra cứu trực tiếp toàn bộ kho dữ liệu Supabase của tiệm.
   - Đóng vai trò là "quân sư" ngồi cạnh nhân viên CSKH: gợi ý cách trả lời lịch thiệp, tra cứu nhanh đơn thuốc, tra cứu chính sách giá chỉ trong 1 giây.
3. **Subtab 3 — Quy định & Màng lọc Toxic Shield (`tab-chatbot-rules`):**
   - **Kho tri thức FAQ (92 câu hỏi chuẩn hóa):** Toàn bộ câu hỏi về dịch vụ spa, cách thức đặt phòng hotel, giờ mở cửa, cách thanh toán và hủy lịch.
   - **Màng lọc từ tục (Toxic Shield - 128 từ khóa):** Tự động phát hiện các từ chửi bới, xúc phạm nhân phẩm. Khi khách dùng từ quá khích:
     * *Cấp độ 1:* Che từ ngữ phản cảm bằng dấu `***` trên màn hình của nhân viên để nhân viên không bị sốc tâm lý.
     * *Cấp độ 2:* Bot gửi thông điệp nhắc nhở lịch thiệp (Gentle Reminder): *"Dạ PawPal luôn thấu hiểu sự lo lắng của sen, tuy nhiên em xin phép nhờ sen sử dụng ngôn từ lịch thiệp để chuyên viên hỗ trợ mình nhanh nhất có thể nhé ạ."*
   - **Ma trận 6 cấp độ cảm xúc (Sentiment Matrix):**
     * *Level 1 (Hài lòng):* Tự động cảm ơn và gợi ý đánh giá 5 sao.
     * *Level 2 (Trung tính):* Tư vấn thông tin bình thường.
     * *Level 3 (Thất vọng nhẹ):* Đưa ra lời đồng cảm và giải thích nhẹ nhàng.
     * *Level 4 (Tức giận cao độ):* Tự động gắn nhãn khẩn cấp, đưa lên đầu hàng đợi và chuyển cho người thật.
     * *Level 5 (Mất kiểm soát):* Tạm khóa khung chat tự động, thông báo Quản lý gọi điện trực tiếp.
     * *Level 6 (Cấp cứu y tế thú cưng):* Đưa ngay hotline Bác sĩ trực đêm và địa chỉ phòng cấp cứu 24/7.

### 8.3. Ánh xạ CSDL Supabase
- Bảng liên quan: `chat_conversation`, `chat_message`, `chatbot_knowledge_faq`, `chatbot_profanity_filter`, `chatbot_canned_response`, `chatbot_compensation_policy`, `chatbot_handover_rule`, `chatbot_scenario_matrix`.

---

## 9. PHÂN HỆ 9: CẤU HÌNH HỆ THỐNG (BANNER, CẨM NANG BLOG, VẬN HÀNH & AUDIT LOG)

### 9.1. Mục tiêu & Ý nghĩa nghiệp vụ
Quản trị toàn bộ "luật chơi" và thiết lập cốt lõi của hệ thống. Kiểm soát chính sách giá cước, thời gian vận hành cửa hàng, tích hợp các đối tác bên thứ ba và giám sát mọi hành động can thiệp của Quản trị viên để chống gian lận.

### 9.2. Chi tiết từng Subtab
1. **Subtab 1 — Banner & Khuyến mãi tiếp thị (`tab-settings-banners`):**
   - Quản lý các banner lớn trượt trên trang chủ ứng dụng dành cho khách.
   - Cài đặt hình ảnh, tiêu đề, thời gian bắt đầu và kết thúc chiến dịch, liên kết khi khách bấm vào (chuyển sang dịch vụ Spa hoặc danh mục Thức ăn mèo).
2. **Subtab 2 — Nội dung & Cẩm nang chăm sóc (`tab-settings-content`):**
   - Soạn thảo và đăng tải các bài viết chia sẻ kiến thức nuôi dưỡng thú cưng (Blog Posts): dinh dưỡng cho chó con, cách phát hiện mèo bị nấm da, bài tập huấn luyện tại nhà.
   - Phân loại theo chuyên mục, quản lý trạng thái Bản nháp (`DRAFT`) hoặc Đã công khai (`PUBLISHED`).
3. **Subtab 3 — Cấu hình vận hành hệ thống (`tab-settings-system`):**
   - *Thông tin cửa hàng:* Tên chuỗi, Địa chỉ chi nhánh, Hotline tổng đài, Giờ mở cửa - đóng cửa trong ngày (08:00 – 21:00).
   - *Quy định giờ Pet Hotel:* Giờ nhận phòng tiêu chuẩn (Check-in 14:00), Giờ trả phòng tiêu chuẩn (Check-out 12:00 trưa hôm sau).
   - *Cấu hình thanh toán:* Kích hoạt cổng thanh toán MoMo, VNPay, Chuyển khoản VietQR, Tiền mặt tại quầy (COD).
   - *Cấu hình vận chuyển:* Phí giao hàng nội thành (25.000 VNĐ), Ngoại tỉnh (35.000 VNĐ), Giao hỏa tốc trong 2 giờ (50.000 VNĐ), Miễn phí giao hàng cho đơn trên 500.000 VNĐ.
   - *Chính sách đặt lịch:* Thời gian hủy lịch miễn phí (Trước 2 tiếng), Công suất phục vụ tối đa mỗi khung giờ.
4. **Subtab 4 — Nhật ký cấu hình & Thao tác Audit (`tab-settings-audit`):**
   - Ghi nhận kiên định mọi hành động thay đổi dữ liệu trong hệ thống (`audit_log`): Ai làm, Làm vào lúc nào, Thao tác trên phân hệ nào, Giá trị cũ là gì, Giá trị mới là gì.
   - Ngăn chặn triệt để hành vi nhân viên tự ý cộng điểm Pawpoint gian lận hoặc xóa dữ liệu đơn hàng.

### 9.3. Ánh xạ CSDL Supabase
- Bảng liên quan: `banner`, `blog_post`, `pawpal_setting`, `audit_log`.

---

## 10. MA TRẬN PHÂN QUYỀN THẨM QUYỀN XỬ LÝ TỰ ĐỘNG CỦA CHATBOT (BOT VS HUMAN BOUNDARY)

Để đảm bảo an toàn tuyệt đối cho thú cưng và uy tín của thương hiệu PawPal, Chatbot AI hoạt động dưới một "khung thẩm quyền" (Action Boundary) rõ ràng:

| Tình huống / Nghiệp vụ | Thẩm quyền của Chatbot AI (Tự động) | Giới hạn & Yêu cầu Chuyển người thật (Human Handover) |
| :--- | :--- | :--- |
| **Tra cứu thông tin chung** | Trả lời 100% tự động về giá dịch vụ, giờ mở cửa, địa chỉ, hướng dẫn đặt lịch. | Không cần chuyển. |
| **Kiểm tra trạng thái đơn hàng / Lịch hẹn** | Tra cứu và báo chính xác trạng thái `PENDING`, `SHIPPING`, mã vận đơn. | Nếu đơn hàng bị giao trễ quá 24h hoặc hàng bị vỡ nát: Chuyển ngay cho CSKH. |
| **Đặt lịch làm đẹp / Khách sạn** | Hướng dẫn khách chọn gói dịch vụ, kiểm tra bàn trống và tạo lịch sơ bộ. | Nếu bé có tiền sử hung dữ hoặc bệnh lý tim mạch nặng: Chuyển Bác sĩ/Quản lý tư vấn kỹ trước. |
| **Đổi điểm Pawpoint lấy Voucher** | Kiểm tra số dư điểm, đổi mã giảm giá tự động theo hạn mức được cấu hình. | Tuyệt đối **KHÔNG ĐƯỢC PHÉP tự ý cộng thêm điểm đền bù** quá 50 điểm nếu không có sự phê duyệt của Quản lý. |
| **Khách khiếu nại mức độ nhẹ (Level 3)** | Gửi lời xin lỗi chân thành, lắng nghe và ghi nhận nội dung vào hệ thống. | Nếu khách tiếp tục không đồng ý sau 2 câu nói: Tự động bấm nút chuyển giao cho chuyên viên. |
| **Khách tức giận / Chửi bới (Level 4 - 5)** | Bật màng lọc Toxic Shield, gửi lời nhắc nhở lịch thiệp (Gentle Reminder). | **BẮT BUỘC NGẮT BOT NGAY LẬP TỨC**. Tạo vé khiếu nại khẩn và báo Quản trị viên gọi điện. |
| **Triệu chứng khẩn cấp y tế (Level 6)** | Cung cấp ngay số điện thoại cấp cứu 24/7 và địa chỉ phòng khám gần nhất. | Không đưa ra lời khuyên chữa trị thuốc lung tung. Hối thúc chủ nuôi đưa bé đi cấp cứu ngay. |
| **Yêu cầu hoàn tiền (Refund / Hủy dịch vụ)** | Tiếp nhận lý do, giải thích quy định hủy lịch theo cấu hình hệ thống. | Bot **KHÔNG CÓ QUYỀN bấm nút hoàn tiền ngân hàng**. Mọi lệnh hoàn tiền bắt buộc do Kế toán/Quản lý thực hiện ở POS. |

---

> **Ghi chú sử dụng tài liệu:** File tài liệu này được lưu trữ trực tiếp tại `pages/admin/modules/chatbot/ADMIN_BUSINESS_WORKFLOWS_FOR_CHATBOT.md` để bộ nạp dữ liệu RAG và các Prompt System của Chatbot có thể đọc và trích xuất ngữ cảnh bất cứ lúc nào.
