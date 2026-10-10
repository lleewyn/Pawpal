# SỔ TAY VẬN HÀNH VÀ HƯỚNG DẪN LUỒNG NGHIỆP VỤ HỆ THỐNG QUẢN TRỊ PAWPAL-ER

> **Dành cho:** Ban Quản lý cửa hàng, Lễ tân ca trực, Chuyên viên Chăm sóc khách hàng, Kỹ thuật viên Grooming / Spa, Nhân viên Khách sạn thú cưng và Thủ kho Bán lẻ.  
> **Phiên bản:** 2.8 (Chuẩn hóa toàn diện Cơ chế Xác thực & Phân quyền Cách ly 2 Chiều: Cấp phát tài khoản công vụ từ phân hệ Nhân sự, Cổng Quản trị độc lập `/admin/login`, Triệt tiêu rò rỉ phiên Bi-directional Isolation, Quản lý Khóa tài khoản, Tuân thủ 100% `AGENTS.md` và Live Supabase Database).

---

## MỤC LỤC
1. [Tổng quan hệ sinh thái và Nguyên tắc cốt lõi](#1-tổng-quan-hệ-sinh-thái-và-nguyên-tắc-cốt-lõi)
2. [Sơ đồ luồng nghiệp vụ liên phân hệ (Cross-Module Workflows)](#2-sơ-đồ-luồng-nghiệp-vụ-liên-phân-hệ)
   - [Luồng 1: Tiếp nhận khách hàng và bé cưng mới tại quầy (Walk-in & Chống trùng SĐT)](#luồng-1-tiếp-nhận-khách-hàng-và-bé-cưng-mới-tại-quầy-walk-in)
   - [Luồng 2: Đặt lịch, Đo thể trạng và Thực hiện dịch vụ Spa / Hotel](#luồng-2-đặt-lịch-đo-thể-trạng-và-thực-hiện-dịch-vụ)
   - [Luồng 3: Bán hàng tại quầy (POS), Vận hành Kho 2 lớp và Xử lý Đơn hàng](#luồng-3-bán-hàng-tại-quầy-pos-vận-hành-kho-2-lớp-và-xử-lý-đơn-hàng)
   - [Luồng 4: Tiếp nhận, Phân cấp Thẩm quyền và Xử lý Khiếu nại / Đổi trả theo SLA](#luồng-4-tiếp-nhận-phân-cấp-thẩm-quyền-và-xử-lý-khiếu-nại--đổi-trả-theo-sla)
   - [Luồng 5: Tiếp nhận khiếu nại tại quầy hoặc qua Hotline (Chống trùng Ticket và Tiếp nhận chưa xác minh)](#luồng-5-tiếp-nhận-khiếu-nại-tại-quầy-hoặc-qua-hotline-ngoại-tuyến)
   - [Luồng 6: Luồng tương tác khép kín giữa Trực chat AI và Phân hệ Khiếu nại (Closed-Loop Escalation)](#luồng-6-luồng-tương-tác-khép-kín-giữa-trực-chat-ai-và-phân-hệ-khiếu-nại-closed-loop-escalation)
   - [Luồng 7: Đồng bộ Dữ liệu và Điểm thưởng 2 chiều giữa Cổng Người dùng và Admin (2-Way User-Admin Lifecycle)](#luồng-7-đồng-bộ-dữ-liệu-và-điểm-thưởng-2-chiều-giữa-cổng-người-dùng-và-admin)
   - [Luồng 8: Cấp phát tài khoản công vụ nội bộ, Quản trị phân quyền và Cách ly phiên 2 chiều (Staff Account Provisioning & Bi-directional Auth Isolation)](#luồng-8-cấp-phát-tài-khoản-công-vụ-nội-bộ-quản-trị-phân-quyền-và-cách-ly-phiên-2-chiều-staff-account-provisioning--bi-directional-auth-isolation)
3. [Hướng dẫn chi tiết từng phân hệ chức năng](#3-hướng-dẫn-chi-tiết-từng-phân-hệ-chức-năng)
   - [3.1. Phân hệ Tổng quan (Dashboard)](#31-phân-hệ-tổng-quan-dashboard)
   - [3.2. Phân hệ Khách hàng (Customers - Chuẩn 3 Subtabs)](#32-phân-hệ-khách-hàng-customers)
   - [3.3. Phân hệ Thú cưng (Pets)](#33-phân-hệ-thú-cưng-pets)
   - [3.4. Phân hệ Dịch vụ (Services)](#34-phân-hệ-dịch-vụ-services)
   - [3.5. Phân hệ Bán hàng và Kho (Orders)](#35-phân-hệ-bán-hàng-và-kho-orders)
   - [3.6. Phân hệ Nhân sự và Ca làm (Staff - Quản trị Tài khoản & Phân quyền)](#36-phân-hệ-nhân-sự-và-ca-làm-staff)
   - [3.7. Phân hệ Khiếu nại và Hỗ trợ (Complaints)](#37-phân-hệ-khiếu-nại-và-hỗ-trợ-complaints)
   - [3.8. Phân hệ Trợ lý ảo Chatbot AI (Chatbot)](#38-phân-hệ-trợ-lý-ảo-chatbot-ai-chatbot)
   - [3.9. Phân hệ Cấu hình hệ thống (Settings)](#39-phân-hệ-cấu-hình-hệ-thống-settings)
4. [Bảng tra cứu nhanh trạng thái và Quy tắc giao diện](#4-bảng-tra-cứu-nhanh-trạng-thái-và-quy-tắc-giao-diện)
5. [Cơ chế lưu và khôi phục trạng thái toàn hệ thống (State Persistence)](#5-cơ-chế-lưu-và-khôi-phục-trạng-thái-toàn-hệ-thống-state-persistence-và-f5reload)

---

## 1. TỔNG QUAN HỆ SINH THÁI VÀ NGUYÊN TẮC CỐT LÕI

### 1.1. Phạm vi dịch vụ của Pawpal
Pawpal là chuỗi tổ hợp **Chăm sóc và Khách sạn Thú cưng Cao cấp (Pet Lifestyle Care và Hospitality)**, bao gồm 4 nhóm dịch vụ cốt lõi:
1. **Dịch vụ Spa và Grooming**: Tắm sấy thư giãn, Vệ sinh tai móng, Nhổ lông tai, Cắt tỉa tạo hình phong cách, Nhuộm lông tai đuôi thảo mộc an toàn.
2. **Khách sạn thú cưng (Pet Hotel)**: Lưu trú phòng Deluxe / Suite máy lạnh, sân chơi vận động, camera giám sát 24/7, chế độ ăn hạt cao cấp hoặc pate tươi theo yêu cầu.
3. **Đưa đón thú cưng tận nhà (Pet Taxi)**: Đón trả thú cưng theo khung giờ yêu cầu bằng lồng vận chuyển chuyên dụng an toàn và tài xế riêng.
4. **Cửa hàng bán lẻ (Pet Shop)**: Thức ăn dinh dưỡng (Pate, Hạt), Phụ kiện thời trang, Sữa tắm chuyên dụng và Đồ chơi tương tác an toàn.

> [!IMPORTANT]
> **ĐỊNH VỊ BẤT BIẾN - TUYỆT ĐỐI KHÔNG CÓ THÚ Y:**  
> Hệ thống Pawpal **hoàn toàn không cung cấp dịch vụ khám chữa bệnh thú y, tiêm thuốc y tế hoặc phẫu thuật lâm sàng**. Toàn bộ giao diện, danh mục, bảng giá và hóa đơn dịch vụ phải sử dụng đúng thuật ngữ chăm sóc thẩm mỹ (Grooming / Spa / Hotel / Taxi). Tuyệt đối cấm sử dụng các từ ngữ "Bác sĩ", "Khám bệnh", "Kê đơn", "Phòng khám thú y", "Bệnh án".

### 1.2. Quy tắc giao diện vàng (`AGENTS.md`)
- **Bo góc cố định 9px**: Áp dụng chuẩn `--admin-radius: 9px;` cho toàn bộ Card, Button, Input, Modal, Popover, Badge.
- **Avatar cá nhân luôn là hình tròn (`border-radius: 50%`)**: Toàn bộ avatar hiển thị hình đại diện hoặc chữ cái viết tắt của Kỹ thuật viên, Nhân viên, Khách hàng, Quản trị viên BẮT BUỘC dùng hình tròn hoàn hảo `border-radius: 50%;`.
- **Triệt tiêu dòng phụ chú thích dài dòng (No Redundant Subtitles)**: Đưa mốc thời gian / ngày tháng trực tiếp lên dòng Tiêu đề chính (ví dụ: `Lịch trực và Điều phối Kỹ thuật viên (25/06/2026)`), không thêm dòng phụ chú thích mô tả chức năng rườm rà dưới tiêu đề.
- **100% Text-Only bên ngoài Sidebar**: Chỉ có thanh menu Sidebar bên trái được hiển thị icon nét mảnh Lucide. Toàn bộ Header Bar, Toolbar, Bảng dữ liệu, Nút bấm và Modal là **100% chữ thuần** (sử dụng text `•••` cho nút tác vụ bảng, nút hành động dạng text pill).
- **Văn phong chuẩn xác**: Tuyệt đối không dùng ký hiệu `&` để thay cho chữ "và" (luôn viết rõ: `Spa và Hotel`, `Hạng và Điểm`, `Sản phẩm và Kho`, `Lưu và Thoát`).
- **Nền kính mờ bán trong suốt (Frosted Glass)**: Các khối thẻ chính dùng `--surface-white: rgba(255, 255, 255, 0.70);` kết hợp `backdrop-filter: blur(10px);`.
- **Triệt tiêu xếp lớp nền (Anti-Opacity Stacking)**: Các thành phần bên trong bảng dữ liệu (`table`, `tbody`, `tr`, `td`) để nền trong suốt.
- **Cảnh báo khẩn cấp**: Thể hiện bằng dòng chữ đỏ thuần tự nhiên (`color: #DC2626; background: transparent; border: none;`), không vẽ khung hộp hay bôi nền đỏ.
- **Viền mép trái (`border-left`)**: Độc quyền duy nhất cho ô đầu tiên của dòng bảng cần Alert (vạch đỏ 3px cho khiếu nại, vạch cam 3px cho lưu ý).
- **Khóa cố định màn hình (Anti-Overscroll)**: Khóa cứng khung màn hình ngoài, triệt tiêu 100% hiện tượng cuộn nảy (Rubber-band bounce).

---

## 2. SƠ ĐỒ LUỒNG NGHIỆP VỤ LIÊN PHÂN HỆ

### Luồng 1: Tiếp nhận khách hàng và bé cưng mới tại quầy (Walk-in)
Dành cho tình huống khách hàng mới lần đầu đưa thú cưng đến cửa hàng.

```mermaid
sequenceDiagram
    autonumber
    actor Khach as Khách hàng
    actor Letan as Lễ tân ca trực
    participant DB as Dashboard
    participant Cust as Phân hệ Khách hàng
    participant Pet as Phân hệ Thú cưng

    Khach->>Letan: Bước vào quầy mang theo bé cưng
    Letan->>DB: Bấm nút "Tiếp nhận bé mới" (Quick Action)
    DB->>Pet: Mở trực tiếp Modal Tiếp nhận bé mới
    Note over Letan,Pet: Kiểm tra SĐT khách hàng
    alt Khách hàng chưa có trên hệ thống
        Letan->>Cust: Tạo nhanh hồ sơ Khách (Họ tên, SĐT, Địa chỉ mặc định)
    end
    Letan->>Pet: Điền thông tin bé: Tên, Loài, Giống, Cân nặng, Cảnh báo tính nết
    Pet-->>Letan: Lưu hồ sơ bé cưng thành công (Sinh mã Pet ID: PET-xxx)
    Letan->>Pet: Chọn "In thẻ đeo cổ (80mm)" gửi máy in nhãn nhiệt
    Letan->>Khach: Đeo thẻ nhãn định danh cho bé cưng an toàn
```

---

### Luồng 2: Đặt lịch, Đo thể trạng và Thực hiện dịch vụ
Quy trình từ lúc đặt hẹn đến khi bàn giao bé cưng và hoàn tất thanh toán.

```mermaid
sequenceDiagram
    autonumber
    actor Khach as Khách hàng
    actor Letan as Lễ tân ca trực
    actor Groomer as Kỹ thuật viên Grooming
    participant Srv as Phân hệ Dịch vụ
    participant Pet as Phân hệ Thú cưng
    participant Cust as Phân hệ Khách hàng

    Khach->>Letan: Đặt lịch hẹn qua Web hoặc đến quầy
    Letan->>Srv: Nhập ca hẹn (Gói dịch vụ, Khung giờ, Bé cưng)
    Letan->>Groomer: Phân công Groomer phụ trách ca
    Note over Letan,Pet: Bước kiểm tra thể trạng tại quầy Check-in
    Letan->>Pet: Đặt bé lên cân và bấm "Cân bé" (Cập nhật số kg)
    Pet-->>Srv: Tự động nhảy phân khúc giá theo kg (Dưới 5kg, 5-10kg, 10-20kg, Trên 20kg)
    Groomer->>Srv: Bấm "Bắt đầu làm ca" (Ghi chú da lông, tập tính nhút nhát nếu có)
    Groomer-->>Letan: Hoàn tất ca dịch vụ (Tắm sấy, cắt tỉa xong)
    Letan->>Khach: Bàn giao bé cưng xinh đẹp cho chủ nuôi
    Letan->>Srv: Bấm "Thanh toán và Hoàn tất ca"
    Srv->>Cust: Tự động cộng điểm thưởng Pawpoint tương ứng vào ví khách
```

---

### Luồng 3: Bán hàng tại quầy (POS), Vận hành Kho 2 lớp và Xử lý Đơn hàng
Quy trình tiếp nhận đơn hàng đa kênh, bán hàng tại quầy thông minh, kiểm soát tồn kho 2 lớp, đóng gói bưu cục hàng loạt, đối soát dòng tiền COD và xử lý đổi trả RMA.

```mermaid
flowchart TD
    A[Khách mua hàng tại quầy / Website / Hotline] --> B{Kênh đặt hàng}
    B -->|Bán tại quầy| POS[Mở Modal '+ Tạo đơn tại quầy']
    B -->|Đơn hàng trực tuyến| WEB[Đơn mới vào danh sách Chờ xác nhận]
    
    POS --> POS1[Nhập SĐT khách -> Nhận diện Hạng thẻ và Số dư Pawpoint]
    POS1 --> POS2[Chọn sản phẩm -> Kiểm tra Tồn kho 2 lớp: Tồn thực tế vs Khả dụng]
    POS2 --> POS3[Áp dụng Chiết khấu hạng + Voucher + Đổi điểm 100đ = 10k]
    POS3 --> POS4[Live Financial Breakdown -> Thanh toán Tiền mặt / Chuyển khoản QR]
    POS4 --> POS5[In hóa đơn K80 nhiệt + Trừ tồn kho thực tế + Cập nhật ví điểm]
    
    WEB --> WEB1[Quản trị viên kiểm tra SLA Chờ xử lý gấp]
    WEB1 --> WEB2[Xác nhận đơn -> Tự động Tạm giữ tồn kho Khả dụng]
    WEB2 --> WEB3[Thanh thao tác hàng loạt: In phiếu đóng gói A6/K80]
    WEB3 --> WEB4[Bàn giao vận chuyển 3PL hàng loạt + Cấp mã vận đơn]
    WEB4 --> WEB5[Xuất Bảng kê bàn giao Manifest ký nhận bưu tá]
    
    WEB5 --> DELIV{Kết quả giao hàng}
    DELIV -->|Giao thành công COD| COD[Dải đối soát COD: 1-click Chốt dòng tiền]
    DELIV -->|Khách yêu cầu đổi trả| RMA[Mở Desk Đổi trả và Hoàn tiền RMA]
    
    RMA --> RMA1{Kiểm định hàng hoàn}
    RMA1 -->|Còn nguyên tem mác| RMA2[Nhập lại kho bán tiếp -> Tăng tồn khả dụng]
    RMA1 -->|Hàng hỏng móp méo| RMA3[Xuất hủy phế phẩm -> Ghi nhận tổn thất]
```

---

### Luồng 4: Tiếp nhận, Phân cấp Thẩm quyền và Xử lý Khiếu nại / Đổi trả theo SLA
Quy trình đảm bảo khách hàng luôn được lắng nghe, phân định rõ thẩm quyền CSKH vs Quản lý, kiểm soát bồi hoàn và tự động hóa theo thời gian cam kết (SLA), không bao giờ bỏ sót ticket.

```mermaid
sequenceDiagram
    autonumber
    actor Khach as Khách hàng
    actor CSKH as Chuyên viên CSKH
    actor QL as Quản lý Cửa hàng
    participant Comp as Phân hệ Khiếu nại
    participant DB as Dashboard (Cảnh báo đỏ)
    participant Cust as Hồ sơ Khách (Ví Pawpoint)

    Khach->>Comp: Phản ánh dịch vụ hoặc gửi yêu cầu đổi trả (Trực tuyến / Ngoại tuyến)
    Comp->>DB: Xuất hiện Dòng cảnh báo khẩn cấp màu đỏ (Zero Miss Strip)
    CSKH->>Comp: Bấm "Nhận xử lý" ➔ Trạng thái: "Đang xử lý"
    CSKH->>Comp: Đối chiếu dữ liệu 360° (Ảnh check-in đón bé / Kho xuất hàng)
    
    alt Thiếu hình ảnh / Cần đối soát khách
        CSKH->>Comp: Bấm "Yêu cầu bổ sung thông tin" (Zalo/SMS) ➔ Trạng thái: "Chờ phản hồi khách hàng"
        Note over Comp: Bắt đầu Timers SLA: 48h tự động nhắc nhở lần 1; 72h tự động đóng (cho phép mở lại 7 ngày)
    else CSKH xác minh đủ thông tin và Lên phương án bồi hoàn
        alt Phương án trong thẩm quyền tự quyết (Voucher < 100k, Pawpoint ≤ 500, Redo 0đ)
            CSKH->>Comp: Xác nhận bồi hoàn ➔ Trạng thái: "Đã giải quyết"
            Comp->>Cust: Tự động cộng điểm / phát hành mã voucher
        else Phương án vượt thẩm quyền (Chi tiền mặt / CK, Voucher ≥ 100k, RMA hoàn tiền > 500k)
            CSKH->>Comp: Đề xuất phương án ➔ Trạng thái: "Chờ quản lý duyệt"
            Comp->>QL: Hiển thị Panel Quản lý phê duyệt bồi hoàn
            alt Quản lý phê duyệt
                QL->>Comp: Bấm "Phê duyệt phương án" ➔ Trạng thái: "Đã giải quyết"
                Comp->>Cust: Thực thi lệnh bồi hoàn / xuất kho RMA
            else Quản lý từ chối
                QL->>Comp: Bấm "Từ chối và Yêu cầu điều chỉnh" (Ghi lý do) ➔ Trả về "Đang xử lý"
            end
        end
    end

    Note over Khach,Comp: Khách hàng đánh giá hài lòng sau giải quyết
    alt Khách đánh giá hài lòng (≥ 3 sao) hoặc không khiếu nại thêm
        Comp->>Comp: Tự động đóng vĩnh viễn sau 03 ngày
    else Khách đánh giá không hài lòng (< 3 sao)
        Comp->>Comp: Tự động hủy đóng 3 ngày ➔ Chuyển sang "Đang xử lý lần 2"
        Comp->>QL: Đẩy cảnh báo đỏ khẩn cấp ➔ Quản lý gọi điện can thiệp trực tiếp
    end
```

---

### Luồng 5: Tiếp nhận khiếu nại tại quầy hoặc qua Hotline (Chống trùng Ticket và Tiếp nhận chưa xác minh)
Dành cho trường hợp khách hàng phản ánh trực tiếp với thu ngân/lễ tân tại quầy hoặc gọi điện đến hotline. Hệ thống tích hợp thuật toán kiểm tra trùng lặp và hỗ trợ tiếp nhận khẩn cấp khi chưa kịp tìm hóa đơn.

```mermaid
sequenceDiagram
    autonumber
    actor Khach as Khách hàng tại quầy / Hotline
    participant Letan as Lễ tân / CSKH
    participant Comp as Phân hệ Khiếu nại
    participant DB as Bảng điều khiển (Dashboard)
    participant QL as Quản lý cửa hàng

    Khach->>Letan: Phản ánh sự cố dịch vụ hoặc đơn hàng
    Letan->>Comp: Bấm nút "Tiếp nhận khiếu nại"
    Letan->>Comp: Nhập SĐT khách hàng
    Comp-->>Letan: Tự động nhận diện họ tên và lịch sử giao dịch gần nhất
    
    Note over Comp: Thuật toán quét phát hiện trùng lặp
    alt Khách đang có Ticket mở cho cùng giao dịch / SĐT
        Comp-->>Letan: Hiển thị Cảnh báo trùng lặp màu vàng (Tránh tạo vé rác)
    end

    alt Khách chưa nhớ mã đơn hoặc chưa tìm thấy hóa đơn
        Letan->>Comp: Tích chọn "Chưa xác minh giao dịch" (Cho phép tiếp nhận khẩn cấp)
        Comp-->>Comp: Gắn nhãn đỏ "Chưa xác minh giao dịch" trên hồ sơ để đối soát sau
    else Đã có mã giao dịch
        Letan->>Comp: Chọn Lịch hẹn / Đơn hàng liên quan
    end

    Letan->>Comp: Nhập nội dung chi tiết + Tải ảnh bằng chứng ➔ Bấm "Tạo khiếu nại"
    Comp->>DB: Đẩy cảnh báo lên khối "Ưu tiên xử lý" (Dòng đỏ khẩn cấp)
    Letan->>Comp: Nhận phụ trách hoặc chuyển giao cấp Quản lý thẩm định
```

---

### Luồng 6: Luồng tương tác khép kín giữa Trực chat AI và Phân hệ Khiếu nại (Closed-Loop Escalation)
*Phân định rõ ràng giữa CSKH tuyến đầu (Frontline) và Thẩm định khiếu nại tuyến sau (Back-office).*

#### 1. Ma trận phân tầng xử lý sự cố (Triage Matrix):
- **Cấp độ 1 - Xử lý ngay tại chỗ trên Chat (First-Contact Resolution)**:
  - *Dấu hiệu*: Khách thắc mắc thời gian giao hàng, giao trễ nhẹ, hỏi cách sử dụng sản phẩm, phàn nàn nhẹ về đóng gói.
  - *Hành động*: Chuyên viên CSKH sử dụng mẫu câu gợi ý từ AI để đồng cảm, bấm nút **"Tặng điểm Pawpoint"** (50 - 100 điểm) trực tiếp trong khung chat để tạ lỗi.
  - *Kết quả*: Đóng ca chat thành công, **không tạo ticket khiếu nại** để tránh làm cồng kềnh bộ máy vận hành.
- **Cấp độ 2 - Chuyển giao thành Ticket Khiếu nại chính thức (Escalate to Ticket)**:
  - *Dấu hiệu*: Bé cưng bị trầy xước/chảy máu sau dịch vụ, grooming sai kiểu nghiêm trọng, pet hotel bỏ quên bữa ăn của bé, thất lạc kiện hàng giá trị lớn, khách giận dữ mức độ 4-5 đòi gặp cấp trên hoặc hoàn tiền.
  - *Hành động*: Bắt buộc bấm menu `•••` ➔ **"Chuyển thành Ticket"**. Hệ thống tự động trích xuất biên bản hội thoại (Chat Transcript) và tóm tắt AI sang phân hệ Khiếu nại.

#### 2. Sơ đồ tương tác khép kín 2 chiều:

```mermaid
sequenceDiagram
    autonumber
    actor Khach as Khách hàng
    participant Bot as Chatbot AI và Màng lọc tâm lý
    participant CSKH as Chuyên viên CSKH Trực chat
    participant Comp as Phân hệ Khiếu nại (Quản lý)
    participant CRM as Hồ sơ 360° Khách và Thú cưng

    Khach->>Bot: Nhắn tin bức xúc (Ví dụ: Bé bị xước tai sau tắm)
    Bot->>Bot: Nhận diện cảm xúc mức 4-5 (Giận dữ) + Lọc từ thô tục
    Bot->>Bot: AI tóm tắt ngữ cảnh 3 giây: Tên khách, Mã lịch hẹn, Cốt lõi sự cố
    Bot->>CSKH: Đẩy ca chat vào Tab "Cần xử lý ngay" kèm đồng hồ đếm ngược SLA
    CSKH->>CSKH: Nhấn "Tiếp nhận" để trực tiếp trao đổi với khách
    CSKH->>Comp: Vượt thẩm quyền ➔ Bấm "Chuyển thành Ticket" (Tạo mã TK-xxxx)
    Note over CSKH,Comp: Tự động đính kèm: Chat Transcript, Mã BKG, Tóm tắt AI
    Comp->>Comp: Xuất hiện trong bảng Khiếu nại (Nguồn: Kênh Trực chat)
    Comp->>Comp: Quản lý mở chi tiết: Đọc nguyên văn đoạn chat, kiểm tra ảnh check-in, khóa an toàn KTV
    Comp->>Khach: Quản lý liên hệ giải quyết: Phê duyệt bồi hoàn (Voucher / Làm lại / Hoàn tiền)
    Comp->>Comp: Chuyển trạng thái Ticket sang "Đã giải quyết"
    Comp-->>CSKH: Bắn cờ Closed-Loop về khung chat: [TK-xxxx: Đã giải quyết ✓]
    CSKH->>Khach: Gửi tin nhắn xác nhận hoàn tất giải quyết qua chat
    Comp->>CRM: Ghi nhận vĩnh viễn tiền sử khiếu nại vào Hồ sơ 360° của bé
```

---

### Luồng 7: Đồng bộ Dữ liệu và Điểm thưởng 2 chiều giữa Cổng Người dùng và Admin (2-Way User-Admin Lifecycle)
*Quy trình đảm bảo tính toàn vẹn dữ liệu thời gian thực giữa Khách hàng cá nhân và Ban Quản trị Pawpal-er.*

```mermaid
sequenceDiagram
    autonumber
    actor Khach as Khách hàng (User Portal)
    participant UserDB as Bộ nhớ User (pawpal_current_user / db)
    participant AdminDB as Kho Dữ liệu Admin (pawpal_admin_customers_data)
    actor Admin as Lễ tân / Quản trị viên (Admin)

    Note over Khach,Admin: 1. Cập nhật hồ sơ & Sổ đa địa chỉ
    Khach->>UserDB: Sửa họ tên, ngày sinh, thêm địa chỉ nhận hàng mới
    UserDB->>AdminDB: Đồng bộ tức thì sang Database Admin
    Admin->>AdminDB: Mở Subtab 2 Hồ sơ 360° -> Thấy ngay Sổ địa chỉ mới

    Note over Khach,Admin: 2. Tích điểm, Điều chỉnh & Đổi voucher
    Admin->>AdminDB: Mở Modal Điều chỉnh điểm -> Nhập SĐT -> Cộng 200 Pawpoint
    AdminDB->>UserDB: Tự động cập nhật số dư ví điểm & thăng hạng lên Hạng Vàng
    Khach->>UserDB: Mở trang Điểm thưởng (#loyalty) -> Thấy ngay 200 pts & Thẻ Hạng Vàng
    Khach->>UserDB: Bấm "Đổi ngay" Voucher 100k (Trừ 100 pts)
    UserDB->>AdminDB: Ghi nhận giao dịch trừ điểm (SUB) vào Lịch sử Pawpoint Admin

    Note over Khach,Admin: 3. Khóa tài khoản & Xử lý Khiếu nại khẩn cấp
    Admin->>AdminDB: Bấm menu tác vụ ••• -> Chọn "Khóa tài khoản"
    AdminDB->>UserDB: Cổng Người dùng hiển thị Dải cảnh báo đỏ khóa tài khoản
    Khach->>UserDB: Gửi Ticket hỗ trợ/khiếu nại (#support)
    UserDB->>AdminDB: Đẩy cảnh báo khẩn cấp (vạch đỏ 3px, thanh alert, số đếm KPI)
    Admin->>AdminDB: CSKH tiếp nhận bồi hoàn voucher 50% + 50 Pawpoint
    AdminDB->>UserDB: Ticket chuyển trạng thái "Đã giải quyết" kèm mã voucher bồi hoàn
    Khach->>UserDB: Chấp nhận giải pháp & Đánh giá CSAT 5 sao
    UserDB->>AdminDB: Hoàn tất đóng vòng đời khiếu nại 2 chiều thành công
```

---

### Luồng 8: Cấp phát tài khoản công vụ nội bộ, Quản trị phân quyền và Cách ly phiên 2 chiều (Staff Account Provisioning & Bi-directional Auth Isolation)
*Quy trình cấp tài khoản độc quyền từ phân hệ Nhân sự, xác thực bảo mật tại Cổng Quản trị độc lập `/admin/login` và triệt tiêu 100% nguy cơ truy cập chéo giữa Cổng Quản trị và Cổng Khách hàng.*

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên Cấp cao
    actor Staff as Nhân viên / Kỹ thuật viên
    actor Khach as Khách hàng cá nhân
    participant StaffMod as Phân hệ Nhân sự (Staff Module)
    participant AuthAPI as Backend Auth API (Service Role)
    participant SupaAuth as Supabase Auth (auth.users)
    participant SupaDB as Cơ sở dữ liệu Live (public.staff / customer)
    participant AdminPortal as Cổng Quản trị (/admin/login)
    participant UserPortal as Cổng Khách hàng (/login)

    Note over Admin,SupaDB: 1. Cấp tài khoản công vụ nội bộ (Staff Provisioning)
    Admin->>StaffMod: Mở bảng Nhân sự -> Bấm '•••' -> Chọn 'Cấp tài khoản đăng nhập'
    Admin->>StaffMod: Điền Email, Mật khẩu ban đầu, Vai trò (ADMIN/STAFF), Phân quyền phân hệ
    StaffMod->>AuthAPI: Gửi POST /api/staff-auth/provision
    AuthAPI->>SupaAuth: Tạo tài khoản công vụ (auth.admin.createUser)
    SupaAuth-->>AuthAPI: Trả về auth_user_id
    AuthAPI->>SupaDB: Ghi nhận auth_user_id, system_role, permissions, account_status: 'ACTIVE' vào public.staff
    AuthAPI-->>StaffMod: Cấp tài khoản thành công -> Huy hiệu 'Đã cấp TK' (Muted Green)

    Note over Staff,AdminPortal: 2. Nhân viên đăng nhập hợp lệ vào Cổng Quản trị
    Staff->>AdminPortal: Truy cập /pages/admin/login/login.html -> Nhập Email và Mật khẩu
    AdminPortal->>SupaAuth: Xác thực credentials (signInWithPassword)
    SupaAuth-->>AdminPortal: Trả về user_id và session token
    AdminPortal->>SupaDB: Kiểm tra quyền công vụ: SELECT * FROM staff WHERE auth_user_id = user_id
    alt Hồ sơ hợp lệ & account_status == 'ACTIVE'
        AdminPortal->>AdminPortal: Khởi tạo pawpal_admin_user (Không ảnh hưởng pawpal_current_user)
        AdminPortal-->>Staff: Chuyển hướng vào Admin Dashboard (/pages/admin/admin.html)
    else Tài khoản bị khóa (account_status == 'LOCKED')
        AdminPortal->>SupaAuth: Gọi signOut() tức thì
        AdminPortal-->>Staff: Báo lỗi đỏ: 'Tài khoản công vụ đã bị khóa. Vui lòng liên hệ Quản lý.'
    end

    Note over Staff,UserPortal: 3. Chặn rò rỉ: Nhân sự cố tình đăng nhập Cổng Khách hàng (/login)
    Staff->>UserPortal: Nhập SĐT nhân viên (ví dụ: 0999999999) tại bước 1
    UserPortal->>SupaDB: Kiểm tra SĐT trong public.staff vs public.customer
    alt Phát hiện SĐT thuộc hồ sơ Nhân sự
        UserPortal-->>Staff: CHẶN ĐỨNG 100%: 'Số điện thoại này thuộc tài khoản nội bộ Pawpal-er'
        UserPortal-->>Staff: Hiển thị nút dẫn lối: 'Chuyển sang Cổng Quản trị' (Không cấp session Khách)
    end
    Note over Staff,UserPortal: Nếu nhân viên cố tình vào thẳng /user -> checkAuth() quét role, lập tức xóa sạch session và đá về /login

    Note over Khach,AdminPortal: 4. Chặn rò rỉ: Khách hàng cố tình đăng nhập Cổng Quản trị (/admin/login)
    Khach->>AdminPortal: Nhập Email và Mật khẩu tài khoản khách hàng
    AdminPortal->>SupaAuth: Xác thực mật khẩu
    AdminPortal->>SupaDB: Kiểm tra trong public.staff WHERE auth_user_id = user_id
    alt Không tìm thấy trong public.staff (Khách hàng vãng lai/thành viên)
        AdminPortal->>SupaAuth: signOut() ngay lập tức, hủy sạch token
        AdminPortal-->>Khach: CHẶN ĐỨNG: 'Tài khoản không có thẩm quyền truy cập hệ thống Quản trị Pawpal-er.'
    end
```

---

## 3. HƯỚNG DẪN CHI TIẾT TỪNG PHÂN HỆ CHỨC NĂNG

### 3.1. Phân hệ Tổng quan (Dashboard)
*Trạm chỉ huy 1 điểm chạm – Giám sát toàn bộ hoạt động trong ngày của cửa hàng.*

- **Thanh KPI trên đỉnh**:
  - `Tổng doanh thu hôm nay`: Cộng gộp từ doanh thu bán lẻ phụ kiện và doanh thu dịch vụ Spa/Hotel đã hoàn thành.
  - `Lịch hẹn mới`: Đếm tổng số ca hẹn trong ngày (Bấm vào để nhảy sang Dịch vụ).
  - `Đơn hàng mới`: Tổng số đơn mua sắm phát sinh (Bấm vào để sang Bán hàng).
  - `Khách hàng mới` và `Bé cưng mới`: Số tài khoản và Pet ID được khởi tạo trong ca.
- **Dòng cảnh báo khẩn cấp (Emergency Alert)**:
  - Tự động hiển thị khi có khiếu nại SLA khẩn cấp hoặc sản phẩm hết hàng.
  - Thiết kế thuần chữ đỏ, có nút `Xử lý ngay` để mở thẳng vị trí cần xử lý.
- **Thanh thao tác nhanh tiếp nhận tại quầy (Quick Reception Bar)**:
  - `+ Tiếp nhận bé mới`: Mở ngay form tiếp nhận của phân hệ Thú cưng.
  - `+ Đặt lịch Spa và Hotel`: Mở phiếu tạo lịch hẹn dịch vụ mới.
  - `+ Lên đơn bán lẻ`: Mở giao diện lập đơn bán hàng tại quầy.
- **Khối Ưu tiên xử lý**:
  - Nhấp vào `Khiếu nại chờ xử lý`: Mở tab Khiếu nại và lọc sẵn trạng thái `Chờ xử lý`.
  - Nhấp vào `Đơn hàng chờ duyệt`: Mở tab Bán hàng và lọc sẵn trạng thái `Chờ xác nhận`.
  - Nhấp vào mã `SKU tồn kho sắp hết`: Mở tab Kho và tự động tìm đúng sản phẩm cần nhập thêm.
- **Lịch sắp tới (Calendar / Timeline)**:
  - Cho phép xem theo chế độ `Tháng`, `Tuần`, hoặc `Ngày`.
  - Nhấp vào bất kỳ ca hẹn nào sẽ mở **Modal xem nhanh ca dịch vụ** (hiển thị tên bé, khách hàng, thợ phụ trách, lưu ý kỹ thuật) kèm nút `Chuyển sang ca Dịch vụ`.

---

### 3.2. Phân hệ Khách hàng (Customers - Chuẩn 3 Subtabs)
*Trung tâm Quản trị Dữ liệu Chủ nuôi, Hồ sơ Khách hàng 360°, Sổ Đa địa chỉ, Vận hành Tiếp nhận tại quầy và Hệ sinh thái Tích điểm Pawpoint.*

- **Cấu trúc 3 Subtab chuyên sâu trên Header Bar**:
  1. *Danh sách (`tab-list`)*:
     - **5 Thẻ thống kê KPI nhanh**: Tổng khách hàng, Khách thành viên, Khách vãng lai, Tài khoản bị khóa, Có khiếu nại (hỗ trợ bấm lọc 1 chạm tương tác trực tiếp với bảng dữ liệu).
     - **Dải cảnh báo khiếu nại khẩn cấp (`#custComplaintAlertBar`)**: Tự động nhận diện và hiển thị danh sách các khách hàng đang có Ticket khiếu nại chưa xử lý kèm mã ticket, họ tên và lý do phản ánh. Nhấp vào để lọc ngay bảng dữ liệu.
     - **Thanh công cụ và Bàn tiếp nhận tại quầy (Quick Add Desk)**:
       * *Nút `+ Thêm khách` (`#btnOpenAddCustomerModal`)*: Mở Modal tiếp nhận nhanh khách vãng lai tại quầy.
       * *Tính năng Chống trùng Số điện thoại theo thời gian thực*: Khi lễ tân nhập SĐT từ 9 số trở lên, hệ thống tự động kiểm tra kho dữ liệu. Nếu phát hiện số điện thoại đã tồn tại, hiển thị ngay thông báo cảnh báo đỏ kèm nút **`Xem hồ sơ khách hàng này` (`#btnOpenDupCustomer`)** giúp lễ tân chuyển thẳng sang hồ sơ cũ mà không tạo tài khoản rác.
       * *Nút `Xuất file` (`#btnExportCustomerReport`)*: Xuất toàn bộ danh sách khách hàng ra file CSV mã hóa chuẩn UTF-8 BOM, đảm bảo hiển thị hoàn hảo tiếng Việt có dấu trong Microsoft Excel.
     - **Bảng dữ liệu Khách hàng chuẩn `AGENTS.md`**:
       * *Cột dữ liệu*: Mã KH, Họ tên & Email (liên kết mở hồ sơ), Số điện thoại, Thú cưng đang nuôi (dạng pill xô thơm nhẹ kèm giống loài), Hạng thành viên & Điểm Pawpoint, Cảnh báo, Trạng thái tài khoản, Tác vụ `•••`.
       * *Quy chuẩn viền mép trái (`border-left`)*: Áp dụng độc quyền vạch đỏ 3px (`border-left: 3px solid #DC2626;`) cho khách hàng có khiếu nại và vạch cam 3px (`#D97706;`) cho khách có thú cưng cần lưu ý y tế/tính khí. Ô tiêu đề cột đầu tiên (`th:first-child`) có viền cùng màu nền để căn hàng thẳng tắp.
       * *Tài khoản bị khóa (`.row-locked`)*: Áp dụng `opacity: 0.52;` cho toàn bộ dòng dữ liệu để phân biệt tức thì.
     - **Menu Tác vụ thả xuống Toàn cục (Global Action Dropdown)**:
       * Nút `•••` sử dụng kiến trúc Direct Body Portal (không bao giờ bị che khuất hoặc tràn khung cuộn).
       * Chứa 4 tác vụ chuẩn: `Xem hồ sơ 360°`, `Sửa hồ sơ`, `Điều chỉnh điểm`, `Khóa / Mở khóa tài khoản`.
     - **Thanh Phân trang Căn giữa & Nằm ngoài bảng (`#customerPaginationBar`)**:
       * Nền hoàn toàn trong suốt, không viền khung, căn giữa màn hình.
       * Tiêu chuẩn hiển thị tối đa **10 dòng dữ liệu trên 1 trang**.
       * Sử dụng ký tự điều hướng `<` và `>` (không dùng chữ Trước / Sau).
  2. *Hồ sơ 360° (`tab-profile`)*:
     - **Đường dẫn cấp con (Deep Breadcrumb)**: Tự động cập nhật `/ [Tên khách hàng]` với định dạng chữ nhỏ hơn (13px), màu xanh xô thơm (`#4F7A65`), độ đậm 500 trên Header Bar.
     - **Thanh Thao tác Nhanh Một Chạm (One-Touch Action Bar)**: Gọi điện, Nhắn Zalo, Đặt lịch hẹn mới, Lên đơn POS bán lẻ, Sửa hồ sơ, Điều chỉnh điểm và Khóa tài khoản.
     - **Sổ Đa địa chỉ nhận hàng (Address Book)**:
       * Quản lý nhiều địa chỉ nhận hàng cho cùng một chủ nuôi.
       * Đánh dấu 1 "Địa chỉ mặc định" (thẻ viền xanh `#C3DEC7`, nền `#F4FAF6`) và các địa chỉ giao hàng phụ.
       * Thao tác thêm/xóa/đặt mặc định trực quan không làm gián đoạn trải nghiệm.
     - **Thẻ định danh và Thống kê chi tiêu trọn đời (LTV)**: Hạng thành viên, Tổng chi tiêu, Tổng đơn hàng, Số thú cưng đang nuôi, Tỷ lệ hủy lịch và Điểm tích lũy hiện có.
     - **Hệ thống 4 Tab dữ liệu con trong Hồ sơ**:
       * *Tổng quan và Thú cưng*: Danh sách thẻ bé cưng kèm nút chuyển nhanh sang hồ sơ thú cưng.
       * *Lịch sử Dịch vụ*: Toàn bộ ca Spa, Khách sạn, Taxi đã từng đặt kèm trạng thái và chi phí.
       * *Lịch sử Mua hàng*: Danh mục đơn hàng, phương thức thanh toán và tổng tiền.
       * *Lịch sử Pawpoint*: Bảng kê chi tiết mọi biến động cộng/trừ điểm của khách hàng.
  3. *Điểm Pawpoint (`tab-loyalty`)*:
     - **3 Thẻ KPI tổng quan**: Tổng điểm đang lưu hành, Tổng điểm đã đổi thưởng và Số lượt khách hàng thăng hạng.
     - **Modal Điều chỉnh điểm linh hoạt (`#modalAdjustPoints`)**:
       * Hỗ trợ tìm kiếm nhanh theo SĐT hoặc mã khách hàng.
       * Hỗ trợ 2 hình thức: `Cộng điểm (+)` (Thưởng sự kiện, Đền bù khiếu nại) và `Trừ điểm (-)` (Thu hồi lỗi, Đổi quà tại quầy).
       * Tự động đồng bộ số dư điểm và hạng thành viên sang Cổng Người dùng (User Portal).
     - **Bảng kê Lịch sử biến động điểm toàn hệ thống**: Phân trang chuẩn 10 dòng/trang, nhãn badge xanh/đỏ thể hiện trực quan chiều giao dịch (Cộng/Trừ).

---

### 3.3. Phân hệ Thú cưng (Pets - Chuẩn 4 Subtabs)
*Hồ sơ Sức khỏe Trọn đời, Nhật ký Chăm sóc Care-Log Thời gian thực, Lịch tiêm phòng và Tẩy giun tự động và Nhãn in Thẻ đeo cổ QR.*

- **Cấu trúc 4 Subtab chuyên sâu trên Header Bar**:
  1. *Danh sách (`tab-pet-list`)*:
     - **5 Thẻ thống kê KPI nhanh**: Tổng số bé, Đang dùng dịch vụ, Cần lưu ý đặc biệt, Đến hạn tiêm/tẩy giun và Hồ sơ đã lưu trữ.
     - **Bộ lọc và Thanh tìm kiếm đa năng**: Lọc nhanh theo loài (Chó, Mèo, Khác), mức độ cảnh báo (Bình thường, Lưu ý, Cảnh báo đỏ).
     - **Nút `+ Thêm bé mới` (`#btnOpenAddPetModal`)**: Form tiếp nhận thông tin thú cưng đầy đủ (Giống loài, giới tính, ngày sinh, cân nặng, tiền sử bệnh, tính khí, ảnh đại diện).
     - **In Thẻ đeo cổ quầy tiếp nhận (`#btnPrintPetCollarTag` / `#modalPrintPetTag`)**: Xuất nhãn in nhiệt 80mm chuẩn quầy Grooming gồm Tên bé, Mã định danh, Tên chủ, SĐT khẩn cấp và cảnh báo an toàn.
  2. *Hồ sơ 360° (`tab-pet-profile`)*:
     - Thẻ thông tin thể trạng chi tiết: Cân nặng hiện tại, biểu đồ biến động cân nặng, tiền sử phẫu thuật, dị ứng thuốc và thực phẩm.
     - Sổ tiêm chủng điện tử (Vaccination Passport): Danh sách mũi tiêm vắc xin, thuốc tẩy giun, phòng ngừa ve rận kèm ngày hẹn mũi kế tiếp.
     - Thẻ phân loại tính khí và Lưu ý an toàn thao tác cho KTV Grooming.
  3. *Nhật ký Care-Log (`tab-pet-carelog`)*:
     - **Dòng thời gian chăm sóc thời gian thực (Care-Log Live Feed)**: Toàn bộ ảnh chụp trước/sau dịch vụ, nhật ký ăn uống, vận động trong thời gian lưu trú tại Khách sạn thú cưng.
     - **Xem trước Cổng Khách hàng (`#btnPreviewCarelogCustomer` / `#modalPreviewCarelogCustomer`)**: Giúp quản trị viên kiểm tra trực quan giao diện nhật ký trước khi gửi link cho chủ nuôi.
  4. *Nhắc lịch hẹn (`tab-pet-reminders`)*:
     - Bảng tổng hợp các bé cưng đến hạn tiêm nhắc lại, tẩy giun hoặc bảo dưỡng lông định kỳ.
     - Tích hợp nút gửi thông báo tự động (Zalo ZNS / SMS Brandname) nhắc nhở chủ nuôi 1-chạm.

---

### 3.4. Phân hệ Dịch vụ (Services - Chuẩn 4 Subtabs)
*Điều phối lịch hẹn Spa và Grooming, Khách sạn thú cưng Pet Hotel 24/7, đưa đón Pet Taxi tận nơi và Quản lý Lịch trực - Công suất Kỹ thuật viên.*

- **Cấu trúc 4 Subtab chuyên sâu trên Header Bar**:
  1. *Lịch hẹn (`tab-service-bookings`)*:
     - **6 Thẻ thống kê KPI nhanh**: Tổng lịch hôm nay, Chờ xác nhận, Sắp tới trong 60 phút, Đang thực hiện, Hoàn thành, Yêu cầu đổi và Hủy.
     - **Thanh cảnh báo lịch hẹn sắp tới trong 60 phút (`#upcomingAlertBar`)**: Tự động lọc và hiển thị danh sách các ca chuẩn bị diễn ra giúp KTV chủ động đón bé.
     - **Lịch trực KTV và Điều phối ca trực quan (`#btnOpenStaffScheduleModal` / `#modalStaffSchedule`)**:
       * Theo dõi công suất tải ca toàn hệ thống (*Tổng KTV trực ca, Tổng ca dịch vụ, Công suất trung bình %, Cảnh báo KTV quá tải >=4 ca*).
       * Bộ lọc ca trực theo 3 khung giờ: Ca Sáng (08:00 - 12:00), Ca Chiều (13:00 - 17:00), Ca Tối (17:00 - 21:00) và Tất cả.
       * Thẻ trực quan từng KTV (*Avatar, Chức danh, Thanh tiến độ công suất, Badge trạng thái Khả dụng / Đang nhận ca / Tải cao / Đầy ca*).
       * Danh sách ca phụ trách hôm nay kèm link `Chi tiết` 1-chạm mở trực tiếp hồ sơ ca và nút chuyển nhanh sang phân hệ Nhân sự.
     - **Bảng dữ liệu điều phối đa dịch vụ**:
       * *Pet Hotel*: Hiển thị khoảng thời gian lưu trú (`01/07 ➔ 04/07`), badge số đêm (`3 đêm`), hạng phòng (`DLX-04`) và khẩu phần dinh dưỡng.
       * *Pet Taxi*: Hiển thị lộ trình đưa đón (`45 Lê Duẩn ➔ Q.1`), khoảng cách km, loại chuyến (`2 chiều khứ hồi`) và tài xế chuyên trách.
       * *Spa và Grooming*: Hiển thị yêu cầu tạo hình (`Mặt tròn Boo`), cấp độ thợ (`Senior / Master Groomer`) và vạch đỏ cảnh báo an toàn da lông / tính khí.
     - **Modal Tạo lịch hẹn tại quầy / Hotline (`#modalCreateBooking`)**: Tự động chuyển đổi các trường nhập liệu tương ứng theo phân nhóm (Hotel / Taxi / Spa) kèm **Cảnh báo công suất tải KTV trực quan** khi chọn nhân sự phụ trách.
  2. *Hồ sơ ca 360° (`tab-service-detail`)*:
     - **Thanh tiêu đề và Nút thao tác một chạm**: Xác nhận lịch, Tiếp nhận bé, Hoàn thành dịch vụ, Đổi KTV, Tạo khiếu nại.
     - **Điều phối Kỹ thuật viên và Cảnh báo quá tải (`#modalChangeStaff`)**: Tự động tính toán số ca KTV đã nhận hôm nay và hiển thị cảnh báo quá tải / gợi ý KTV còn trống ngay khi chọn trên dropdown.
     - **Dòng cảnh báo an toàn thú cưng (Safety Alert Banner)**: Thuần chữ đỏ cảnh báo dị ứng hương liệu, vết thương cũ hoặc tính khí nhút nhát/dữ dằn.
     - **Khối thông tin đặc thù theo dịch vụ (`#detailSpecialServiceFields`)**: Thể hiện đầy đủ phòng chuồng và camera IP (Hotel), lộ trình và SĐT tài xế (Taxi), kiểu dáng tạo hình (Spa).
     - **Biên bản tiếp nhận an toàn Zero-Claim (`#detailIntakeSafetySection`)**:
       * Đối chiếu cân nặng thực tế tại quầy, checklist 4 vùng ngoại quan (Da lông, Mắt mũi tai, Vết xước cũ, Tính khí), tư trang gửi lại và ảnh bằng chứng tiếp nhận.
       * **In biên bản tiếp nhận (`#btnPrintIntakeWaiver` / `#modalPrintIntakeWaiver`)**: Xuất phiếu in tiếp nhận khổ A4/A5 chuyên nghiệp gồm toàn bộ thông tin ngoại quan, điều khoản cam kết và miễn trừ trách nhiệm SOP PawPal và 2 ô chữ ký (KTV tiếp nhận và Khách hàng cam kết).
     - **Bảng kê chi phí 2 tầng Add-ons, Dịch vụ đi cùng và Phụ phí có Hoa hồng KTV (`#modalAddSurcharge`)**:
       * *Tầng 1 (Pre-booked Web Add-ons / Dịch vụ đi cùng)*: Gói dịch vụ ghép thêm do khách chọn trước.
       * *Tầng 2 (On-site Surcharges Desk)*: Phụ phí phát sinh tại quầy có ghi nhận lý do, hình ảnh bằng chứng, phương thức xác nhận với khách hàng (Zalo / Gọi điện / Trực tiếp), **tỷ lệ hoa hồng KTV trích từ phụ phí (0%, 10%, 15%, 20%, 30%)** và hiển thị số tiền hoa hồng KTV thực nhận.
       * **1-Click "Thanh toán tại POS" (`#btnSettleToPos`)**: Tự động đóng gói toàn bộ chi phí ca dịch vụ chuyển sang phân hệ Bán hàng (POS), mở form tạo đơn với banner liên kết dịch vụ, hỗ trợ gộp mua thêm hàng hóa và tự động cập nhật trạng thái đã thanh toán cho ca dịch vụ khi hoàn tất.
     - **Nhật ký chăm sóc thời gian thực (Care-Log Timeline)**:
       * KTV cập nhật tiến trình từng bước, đính kèm ảnh thực tế, nút chia sẻ liên kết công khai cho chủ nuôi và Photo Lightbox xem ảnh to.
       * **Báo khách đón bé qua Zalo / SMS (`#btnNotifyCustomerPickup` / `#modalNotifyPickup`)**: Soạn và gửi tin nhắn tự động (Zalo ZNS / SMS Brandname) báo hoàn tất dịch vụ, tổng chi phí, tư trang và link Care-Log kèm ghi nhận tự động vào Timeline.
  3. *Danh mục và Bảng giá (`tab-service-catalog`)*:
     - Quản lý danh mục 3 phân nhóm: Spa và Grooming, Pet Hotel, Pet Taxi.
     - Ma trận bảng giá theo 4 phân khúc cân nặng (<5kg, 5-10kg, 10-20kg, >20kg).
     - Cấu hình quy trình kỹ thuật chuẩn SOP (SOP Spa trọn gói 7 bước, Cắt tỉa tạo kiểu 6 bước, Hotel 6 bước/ngày, Taxi 4 bước).
  4. *Đánh giá và Phản hồi (`tab-service-reviews`)*:
     - **4 Thẻ KPI đánh giá**: Điểm trung bình toàn chi nhánh, Tổng lượt đánh giá, Chưa phản hồi, Cảnh báo (1-3 sao).
     - **Modal Phản hồi đánh giá chuyên nghiệp (`#modalReplyReview`)**: Cung cấp các mẫu câu trả lời lịch sự theo từng mức sao, tùy chọn gửi kèm Voucher đền bù (50k, 100k, lượt tắm miễn phí).
     - **Chuyển giao 1-chạm thành Phiếu khiếu nại CSKH (`#btnEscalateToComplaint`)**: Tự động trích xuất thông tin sang phân hệ Khiếu nại khi khách hàng không hài lòng.

- **Cơ chế Tích lũy điểm thưởng PawPoint tự động**:
  - Khi hoàn tất ca dịch vụ tại quầy (`#formCompleteBooking`), hệ thống tự động quy đổi `10.000 đ = 1 Pawpoint` dựa trên tổng tiền thanh toán thực tế và cộng thẳng vào ví điểm của khách hàng trong hệ thống CRM.
  - Hỗ trợ đổi điểm Pawpoint trừ trực tiếp vào hóa đơn thanh toán dịch vụ (*100 điểm = 10.000 đ*).

---

### 3.5. Phân hệ Bán hàng và Kho (Orders)
*Quản lý vòng đời đơn hàng đa kênh, trung tâm xử lý RMA đổi trả, đối soát dòng tiền COD bưu cục, quản trị tồn kho 2 lớp và lập đơn POS tại quầy.*

- **Cấu trúc 4 Subtab chuyên sâu trên Header Bar**:
  1. *Đơn hàng (`tab-order-list`)*:
     - **6 Thẻ thống kê KPI nhanh**: Tổng đơn hôm nay, Chờ xác nhận, Đang chuẩn bị, Đang giao hàng, Đã hoàn tất, Đổi trả và Hủy.
     - **Thanh thao tác hàng loạt (Batch Actions Toolbar)**:
       * *In hàng loạt phiếu đóng gói (`#modalPackingSlip`)*: Xem trước khổ in A6 / K80 nhiệt liên tiếp, tự động gom danh sách mặt hàng cho kho nhặt đồ.
       * *Bàn giao vận chuyển hàng loạt (`#modalBatchDispatch`)*: Chỉ định bưu cục tiếp nhận (*J và T Express, GHTK, Viettel Post, Đội giao PawPal*), tự động cấp dải mã vận đơn chuẩn.
       * *Xuất bảng kê bàn giao (`#modalDispatchManifest`)*: Xuất biên bản ký nhận bưu tá kèm tổng số kiện và số tiền thu hộ COD.
     - **Bộ lọc SLA Quá hạn và Cảnh báo nhanh**:
       * *Có khiếu nại*: Lọc nhanh các đơn có yêu cầu đổi trả RMA hoặc khiếu nại chất lượng.
       * *Chờ xử lý gấp*: Lọc các đơn mới đặt cần xác nhận ngay.
       * *Quá hạn SLA (>30p)*: Cảnh báo đơn chờ duyệt quá thời gian cam kết.
     - **Dải đối soát dòng tiền COD bưu cục (`#codReconcileSummaryStrip`)**:
       * Tự động hiển thị khi có đơn giao thành công nhưng tiền thu hộ COD đang chờ bưu cục chuyển về tài khoản (`cod_pending`).
       * Nút `Xác nhận đối soát toàn bộ` 1-chạm giúp kế toán chốt sổ dòng tiền COD tức thì.
  2. *Hồ sơ đơn (`tab-order-detail`)*:
     - **Thẻ Hồ sơ Đổi trả và Hoàn tiền (RMA)**: Hiển thị ngay đầu trang khi đơn có phát sinh khiếu nại (*Mã RMA, phương án giải quyết, lý do, kết quả kiểm định kho, số tiền bồi hoàn*) kèm nút điều hướng trực tiếp sang phân hệ Khiếu nại.
     - **Bảng danh sách sản phẩm và Bảng kê tài chính chi tiết**: Thể hiện tiền hàng tạm tính, phí vận chuyển, chiết khấu voucher, giảm trừ điểm Pawpoint và tổng thanh toán.
     - **Thông tin giao nhận và Đơn vị vận chuyển**: Tên người nhận (liên kết mở hồ sơ khách), SĐT, địa chỉ, phương thức thanh toán, hãng giao nhận, mã vận đơn bưu cục và lịch trình Timeline thời gian thực.
     - **Nút thao tác một chạm theo trạng thái**: In phiếu đóng gói, Bàn giao vận chuyển, Xác nhận thu tiền, Đối soát tiền COD, Tạo khiếu nại và Đổi trả (`#modalReturnRefund`), Hoàn tất đơn hàng.
  3. *Sản phẩm và Kho (`tab-order-products`)*:
     - **4 Thẻ chỉ số kho hàng**: Tổng mặt hàng, Đang còn hàng, Sắp hết hàng, Tạm ngưng bán.
     - **Cơ chế Tồn kho 2 lớp (2-Layer Inventory)**:
       * *Tổng tồn*: Số lượng vật lý thực tế trong kho.
       * *Tạm giữ*: Số lượng tự động khóa cho các đơn đang chờ xử lý / đóng gói (`pending`, `confirmed`) để triệt tiêu hiện tượng bán vượt tồn (*Overselling*).
       * *Khả dụng*: Số lượng thực tế sẵn sàng để bán (`Khả dụng = Tổng tồn - Tạm giữ`).
     - **Cảnh báo ngưỡng an toàn (Min Stock Alert)**:
       * `An toàn (Min+)`: Số khả dụng trên mức an toàn (*Muted Pastel xanh*).
       * `Sắp hết (<=Min)`: Số khả dụng chạm hoặc dưới ngưỡng tối thiểu (*Muted Pastel hổ phách*).
       * `Hết hàng`: Số khả dụng bằng 0 (*Muted Pastel đỏ đất*).
     - **Modal Điều chỉnh Tồn kho (`#modalAdjustStock`)**: Hỗ trợ thao tác Nhập thêm `+`, Xuất hủy `-`, Kiểm kê đặt lại `=`, cập nhật giá niêm yết mới và trạng thái kinh doanh.
     - **Modal Thêm sản phẩm mới (`#modalAddProduct`)**: Thiết lập mã SKU, danh mục, giá bán lẻ, tồn ban đầu và ngưỡng cảnh báo tối thiểu.
  4. *Khuyến mãi (`tab-order-promos`)*:
     - **3 Thẻ KPI khuyến mãi**: Voucher đang chạy, Lượt đã dùng hôm nay, Voucher sắp hết hạn.
     - **Bảng quản trị Voucher**: Quản lý mã voucher, mức giảm giá, đơn hàng tối thiểu, điểm Pawpoint cần đổi, thời hạn áp dụng, lượt đã dùng và trạng thái phát hành.
     - **Modal Tạo mã khuyến mãi (`#modalCreateVoucher`) và Quản lý / Gia hạn Voucher (`#modalVoucherAction`)**.
- **Quy trình Lập đơn POS tại quầy thông minh (`#modalCreateOrder`)**:
  - **Tra cứu khách hàng tự động**: Nhập số điện thoại khách hàng, hệ thống tự động nhận diện và hiển thị Banner Thành viên (*Hạng thẻ Kim Cương / Vàng / Bạc / Đồng và Số dư điểm Pawpoint*).
  - **Áp dụng chiết khấu tự động**: Chiết khấu hạng thành viên (*Kim Cương 10%, Vàng 5%, Bạc 3%*), áp dụng mã giảm giá Voucher hợp lệ và quy đổi trừ điểm Pawpoint (*100 điểm = 10.000 đ*).
  - **Bảng kê tính tiền thời gian thực (Live Financial Breakdown)**: Cập nhật tức thời từng dòng giảm trừ và tổng tiền cần thanh toán.
  - **Đồng bộ kho và ví điểm**: Tự động trừ tồn kho thực tế, trừ số dư ví điểm khách hàng, tăng lượt sử dụng voucher và mở màn hình xem đơn hàng.

---

### 3.6. Phân hệ Nhân sự và Ca làm (Staff - Quản trị Tài khoản & Phân quyền)
*Quản lý danh sách nhân viên, xếp lịch ca trực, cấp phát tài khoản công vụ nội bộ, phân quyền nghiệp vụ và theo dõi đánh giá CSAT.*

- **Cấu trúc 4 Subtab chuyên sâu trên Header Bar**:
  1. *Danh sách nhân sự (`tab-staff-list`)*:
     - 4 Thẻ KPI nhân sự: Tổng nhân sự, Đang làm việc, Nghỉ phép / Tạm nghỉ, Đánh giá CSAT trung bình toàn chi nhánh.
     - Bộ lọc vai trò và Trạng thái tài khoản công vụ: Lễ tân ca trực, Kỹ thuật viên Grooming / Spa, Chăm sóc Khách sạn Pet Hotel, Tài xế Pet Taxi, Quản lý chi nhánh; Lọc tài khoản: `Tất cả`, `Đã cấp TK`, `Chưa cấp TK`, `Bị khóa`.
     - Bảng danh sách chuẩn `AGENTS.md`:
       * *Cột dữ liệu*: Mã NV, Họ tên & Chức vụ, Vai trò hệ thống (`system_role`: ADMIN / STAFF), SĐT & Email công vụ, Trạng thái tài khoản (`Đã cấp TK` nền xanh nhạt, `Chưa cấp TK` nền xô thơm, `Bị khóa` nền đỏ đất), Ca làm việc hôm nay, Điểm CSAT, Tác vụ `•••`.
       * *Menu tác vụ thả xuống `•••`*: `Xem hồ sơ 360°`, `Cấp tài khoản đăng nhập` (khi chưa cấp), `Đặt lại mật khẩu` (khi đã cấp), `Khóa / Mở khóa tài khoản`.
  2. *Hồ sơ nhân sự 360° (`tab-staff-profile`)*:
     - Thông tin cá nhân, hợp đồng lao động, chứng chỉ nghề nghiệp Grooming quốc tế.
     - Khối thông tin định danh công vụ: Email đăng nhập nội bộ, `auth_user_id`, Vai trò hệ thống, Danh sách phân hệ được ủy quyền.
     - Nút thao tác một chạm: `Đặt lại mật khẩu`, `Khóa tài khoản`, `Phân ca làm việc`.
     - Lịch sử ca làm việc, tổng số ca hoàn thành và nhật ký ghi nhận khen thưởng / nhắc nhở.
  3. *Lịch phân ca trực (`tab-staff-schedule`)*:
     - Bảng lịch phân ca theo Tuần và Ngày:
       * *Ca sáng*: 08:00 - 16:00 (Lễ tân, Groomer tắm sấy, Pet Taxi).
       * *Ca chiều*: 13:00 - 21:00 (Groomer cắt tỉa tạo hình, Lễ tân chốt ca).
       * *Ca trực đêm Pet Hotel*: 20:00 - 08:00 sáng hôm sau (Giám sát phòng lưu trú, camera an ninh 24/7, cho ăn đêm).
     - Điều phối và đổi ca trực linh hoạt giữa các nhân sự cùng chuyên môn.
  4. *Đánh giá CSAT và Hiệu suất KPI (`tab-staff-assessment`)*:
     - Thống kê tỷ lệ hài lòng của khách hàng (CSAT 1-5 sao) theo từng nhân sự.
     - Đánh giá năng suất: Số thú cưng đã chăm sóc, số đơn bán lẻ phụ kiện đã lập, thời gian hoàn thành ca trung bình.

- **Quy trình Cấp phát Tài khoản và Quản trị Phân quyền Nhân sự (Staff Account Provisioning & IAM)**:
  - **Modal Cấp tài khoản công vụ (`#modalProvisionAccount`)**:
    * Nhập Email đăng nhập công vụ (khuyến nghị tên miền `@pawpal.vn`).
    * Thiết lập Mật khẩu ban đầu (yêu cầu tối thiểu 8 ký tự, có chữ hoa, số và ký tự đặc biệt).
    * Chọn Vai trò hệ thống (`system_role`): `ADMIN` (Toàn quyền quản trị) hoặc `STAFF` (Nhân viên vận hành theo ca).
    * Phân quyền nghiệp vụ (`permissions`): Tích chọn các phân hệ được phép truy cập (`dashboard`, `customers`, `pets`, `services`, `orders`, `staff`, `complaints`, `chatbot`, `settings`).
    * Tùy chọn bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên (`must_change_password`).
  - **Modal Đặt lại mật khẩu (`#modalResetStaffPassword`)**:
    * Cho phép Quản lý cấp mật khẩu mới trực tiếp khi nhân viên quên mật khẩu hoặc bàn giao ca.
  - **Cơ chế Khóa / Mở khóa tài khoản công vụ (`toggleAccountStatus`)**:
    * Khi nhân viên nghỉ việc, chuyển công tác hoặc có dấu hiệu vi phạm an toàn, Quản lý bấm "Khóa tài khoản" ➔ chuyển `account_status: 'LOCKED'`.
    * Hệ thống vô hiệu hóa ngay tức thì phiên đăng nhập của nhân viên đó. Mở khóa sẽ hoàn trả trạng thái `ACTIVE`.
  - **Bảo mật Service Role tuyệt đối (Zero-Key Leakage)**:
    * Toàn bộ thao tác tạo tài khoản (`auth.admin.createUser`), cập nhật mật khẩu (`auth.admin.updateUserById`) được xử lý an toàn tại Backend Express API ([scripts/api/staff_auth.js](file:///d:/Aboutme/MyProject/Pawpal/scripts/api/staff_auth.js)) thông qua `SUPABASE_SERVICE_ROLE_KEY`. Phía Client Admin tuyệt đối không nắm giữ hay để lộ Service Key.

---

### 3.7. Phân hệ Khiếu nại và Hỗ trợ (Complaints)
*Giải quyết sự cố dịch vụ và đổi trả hàng minh bạch, phân cấp thẩm quyền bồi hoàn chặt chẽ, bảo vệ tối đa uy tín thương hiệu.*

- **Cấu trúc 3 Subtab chuyên sâu trên Header Bar (Chuẩn `AGENTS.md`)**:
  1. *Theo Dịch vụ (`tab-complaint-services`)*: Quản lý các sự cố về Spa và Grooming, Pet Hotel, Pet Taxi (kèm nhãn mức độ, KTV thực hiện, đồng hồ đếm ngược SLA và huy hiệu số đếm màu đỏ).
  2. *Theo Đơn hàng (`tab-complaint-orders`)*: Quản lý khiếu nại về hàng lỗi, giao trễ, giao sai màu/kích thước, quy trình đổi trả hàng RMA và kiểm soát hoàn tiền.
  3. *Hồ sơ (`tab-complaint-detail`)*: Màn hình thẩm định và giải quyết 360°, tích hợp Deep Breadcrumb `/ [Mã Ticket]`.

- **Vòng đời Ticket Khiếu nại (Ticket Lifecycle - 8 trạng thái chuẩn hóa)**:
  * **Chưa xử lý (`new` / `open`)**: Tiếp nhận mới từ Web, Hotline, Quầy lễ tân hoặc Chatbot AI chuyển sang. Chưa có nhân sự CSKH tiếp nhận.
  * **Đang xử lý (`processing`)**: Chuyên viên CSKH đã bấm "Nhận xử lý" hoặc nhận bàn giao ca, đang trực tiếp thẩm định sự cố.
  * **Chờ phản hồi khách hàng (`waiting_customer`)**: CSKH đã gửi yêu cầu bổ sung thông tin/hình ảnh qua Zalo OA, SMS, Email hoặc Cuộc gọi; bắt đầu kích hoạt đồng hồ đếm ngược.
  * **Chờ nhận hàng trả (`waiting_return`)**: Áp dụng cho khiếu nại đơn hàng RMA; đã phát hành mã RMA hướng dẫn khách gửi hàng, chờ bưu tá thu hồi về kho kiểm định.
  * **Chờ quản lý duyệt (`waiting_manager_approval`)**: Phương án bồi hoàn vượt thẩm quyền CSKH (hoàn tiền mặt/chuyển khoản, voucher lớn, điểm cao), đang chờ Ban Quản lý phê duyệt.
  * **Đang xử lý lần 2 (`reprocessing`)**: Kích hoạt khi khách hàng đánh giá $< 3$ sao sau khi giải quyết; hệ thống chuyển ca lên Quản lý can thiệp trực tiếp.
  * **Đã giải quyết (`resolved`)**: Đã áp dụng xong phương án bồi thường thỏa đáng, khách hàng hài lòng hoặc hệ thống đang đếm lùi thời gian tự đóng.
  * **Đã đóng (`closed`)**: Khiếu nại hoàn tất vĩnh viễn, hoặc tự động đóng sau 72 giờ không phản hồi (cho phép mở lại trong 07 ngày).

- **Ma trận Phân cấp Thẩm quyền Bồi hoàn (Delegation of Authority)**:
  * **Cấp 1 - Chuyên viên CSKH tự quyết định (Phi tiền mặt & Hạn mức an toàn)**:
    - Phát hành Voucher giảm giá cho dịch vụ/đơn hàng kế tiếp: Giá trị $< 100.000$ VNĐ (ví dụ: `PAWPALCARE50`).
    - Bồi hoàn điểm thưởng Pawpoint: $\le 500$ điểm (tương đương $\le 50.000$ VNĐ).
    - Làm lại dịch vụ (Redo Service): Miễn phí 100% ca tắm sấy/cắt tỉa bù, chỉ định Groomer trưởng tiếp nhận.
    - Giải thích chính sách, xin lỗi khách hàng hoặc từ chối khiếu nại nếu khách hàng vi phạm quy định cửa hàng.
  * **Cấp 2 - Bắt buộc Ban Quản lý Cửa hàng phê duyệt (`waiting_manager_approval`)**:
    - **Hoàn tiền mặt / Chuyển khoản ngân hàng (`refund`)**: Bất kỳ số tiền nào (kể cả 10.000đ hay 50.000đ) đều bắt buộc Quản lý duyệt để kiểm soát chặt dòng tiền thu ngân.
    - **RMA Trả hàng hoàn tiền (`rma_refund`)**: Giá trị hoàn tiền $> 500.000$ VNĐ.
    - **Voucher giá trị lớn**: Voucher giảm giá $\ge 100.000$ VNĐ (ví dụ: `PAWPALCARE100`, `PAWPALCARE200`).
    - **Điểm thưởng lớn**: Bồi hoàn $> 500$ điểm Pawpoint.
  * **Cơ chế Khối Quản lý phê duyệt (`manager-approval-panel`)**:
    - Khi CSKH chọn phương án vượt thẩm quyền, modal bồi hoàn tự động hiển thị biểu ngữ cảnh báo và chuyển nhãn nút thành *"Gửi yêu cầu Quản lý duyệt"*.
    - Trên Hồ sơ Ticket xuất hiện khối phê duyệt với tóm tắt phương án, số tiền hoàn và 2 nút hành động:
      * **Phê duyệt phương án**: Quản lý xác nhận duyệt ➔ Trạng thái chuyển sang `Đã giải quyết` (hoặc `Chờ nhận hàng trả` nếu RMA), hệ thống tự động giải ngân / cộng điểm Pawpoint.
      * **Từ chối và Yêu cầu điều chỉnh**: Quản lý nhập lý do từ chối ➔ Trả Ticket về `Đang xử lý` để CSKH thương lượng phương án khác với khách.

- **Cơ chế Tự động hóa Thời gian theo Cam kết SLA (Automated Timers)**:
  * **Quá 48 giờ (Chờ khách phản hồi)**: Hệ thống tự động gửi nhắc nhở lần 1 (qua Zalo/SMS) và ghi nhận vào nhật ký hệ thống.
  * **Quá 72 giờ (Chờ khách phản hồi)**: Hệ thống tự động chuyển trạng thái `Đã đóng` do khách không bổ sung thông tin; cấp quyền cho phép khách hàng hoặc CSKH mở lại trong vòng **07 ngày**.
  * **Sau 03 ngày (Đã giải quyết)**: Hệ thống tự động đóng vĩnh viễn ticket nếu khách hàng không có khiếu nại phát sinh thêm.
  * **Đánh giá Khách hàng & Can thiệp Xử lý lần 2**:
    - Sau khi giải quyết, hệ thống gửi lời mời khách hàng đánh giá trải nghiệm (1 - 5 sao).
    - Nếu khách chấm **$\ge 3$ sao**: Ghi nhận hài lòng, tiếp tục bộ đếm tự đóng sau 3 ngày.
    - Nếu khách chấm **$< 3$ sao**: Hệ thống **tự động hủy bộ đếm đóng 3 ngày**, chuyển trạng thái sang `reprocessing` (*Đang xử lý lần 2*), hiển thị khối cảnh báo đỏ khẩn cấp trên màn hình (`ticketLowRatingAlertPanel`) để Quản lý gọi điện trực tiếp xoa dịu và xử lý dứt điểm.

- **Cơ chế Mở lại Khiếu nại (`Reopen Ticket`)**:
  - Dành riêng cho các Ticket ở trạng thái `Đã đóng`.
  - Khách hàng hoặc CSKH có thể bấm nút **"Mở lại khiếu nại"** trong thời hạn **07 ngày** kể từ khi đóng nếu sự cố tái phát hoặc phát sinh hậu quả mới. Ticket chuyển về `Đang xử lý` và ghi nhật ký minh bạch.
  - Quá 07 ngày, hệ thống khóa vĩnh viễn nút mở lại và yêu cầu tạo Ticket mới.

- **Xử lý Ngoại lệ và Phòng ngừa Gian lận**:
  * **Tiếp nhận khiếu nại Chưa xác minh giao dịch**: Cho phép tích chọn *"Chưa xác minh giao dịch"* khi khách hàng chưa tìm thấy hóa đơn hoặc chưa nhớ mã lịch hẹn. Ticket gắn huy hiệu đỏ `Chưa xác minh giao dịch` để CSKH tiếp nhận trước và bổ sung đối soát sau.
  * **Cảnh báo trùng lặp Ticket đang mở (Duplicate Warning)**: Khi nhập SĐT hoặc mã giao dịch trong modal tạo vé, hệ thống tự động quét kiểm tra; nếu đã có Ticket chưa đóng cho giao dịch này, hiển thị ngay hộp cảnh báo màu vàng để tránh tạo trùng lặp vé rác.
  * **Dữ liệu đối chứng 360°**:
    - *Dịch vụ*: Ảnh chụp check-in sức khỏe vành tai/da lông lúc đón bé, nhật ký KTV, nút *"Tạm khóa an toàn KTV"* để đình chỉ tiếp nhận ca mới đối với KTV có nguy cơ vi phạm quy chuẩn an toàn.
    - *Đơn hàng*: Ảnh chụp đóng gói kiểm hàng tại kho, chữ ký người nhận 3PL, Stepper RMA 4 bước dạng text phẳng (*1. Cấp mã RMA ➔ 2. Chờ nhận hàng hoàn ➔ 3. Kiểm định tại kho ➔ 4. Xuất hàng đổi mới / Hoàn tiền*).
  * **Kiểm soát giá trị bồi hoàn**: Hệ thống tự động ràng buộc số tiền bồi hoàn RMA không được vượt quá tổng giá trị đơn hàng gốc.

---

### 3.8. Phân hệ Trợ lý ảo Chatbot AI và Trực chat CSKH (Chatbot)
*Trung tâm Tiếp nhận và Điều phối CSKH thông minh kết hợp Gemini AI và Nhân viên trực tuyến.*

- **Bố cục Hộp thư 3 khu vực chuẩn quốc tế**:
  1. *Cột 1 (Trái) - Danh sách hội thoại và Bộ lọc thông minh*:
     - Tab **"Xử lý ngay"**: Chỉ hiển thị các ca chat khẩn cấp (khách bực bội cấp 4-5, sự cố thú cưng, quá hạn SLA) kèm số đếm màu đỏ.
     - Tab **"Đang chat"**: Danh sách các ca nhân viên đã bấm "Tiếp nhận" và đang trực tiếp gõ phím.
     - Tab **"Tất cả"**: Toàn bộ lịch sử ca chat của Bot và các ca đã hoàn tất.
  2. *Cột 2 (Giữa) - Khung chat trực tiếp và Điều phối nghiệp vụ*:
     - **Thẻ tóm tắt ngữ cảnh AI 3 giây**: Tự động nhận diện tên khách, số điện thoại, vấn đề cốt lõi, mã đơn/lịch hẹn và đề xuất hướng xử lý.
     - **Màng lọc bảo vệ tâm lý nhân viên**: Tự động che mờ các từ ngữ thô tục, lăng mạ thành thông báo an toàn, giúp nhân viên giữ vững bình tĩnh.
     - **Gợi ý AI và Thư viện câu mẫu**: Trợ lý AI gợi ý sẵn câu trả lời đồng cảm/xoa dịu theo ngữ cảnh, bấm "Dùng mẫu này" để đưa ngay vào ô soạn thảo.
     - **Nút 3 chấm `•••` Tác vụ một chạm**:
       * *Tặng điểm Pawpoint*: Nạp ngay 50 - 100 điểm tạ lỗi trực tiếp vào ví khách hàng.
       * *Chuyển thành Ticket*: Trích xuất toàn bộ biên bản đoạn chat chuyển sang phân hệ Khiếu nại.
       * *Chuyển cấp Quản lý*: Bàn giao ca chat cho cấp quản lý can thiệp khi khách quá căng thẳng.
  3. *Cột 3 (Phải) - Bảng thông tin khách hàng 360°*:
     - Xem ngay họ tên, số điện thoại, hạng thành viên, số dư điểm Pawpoint.
     - Danh sách thú cưng của khách và cảnh báo dị ứng/tập tính.
     - Đơn hàng gần nhất và Lịch hẹn gần nhất (có liên kết nhảy nhanh).
     - **Danh sách khiếu nại đang mở**: Tự động hiển thị trạng thái giải quyết khép kín từ phân hệ Khiếu nại (`Đã giải quyết ✓`).
     - Khung ghi chú nội bộ bí mật dành cho nhân viên ca trực.

---

### 3.9. Phân hệ Cấu hình hệ thống (Settings và System Configuration)
*Trung tâm Thiết lập và Đồng bộ Nguồn Dữ liệu Duy nhất (Single Source of Truth - SSOT) cho toàn bộ hệ sinh thái PawPal (Admin POS, User Portal, Web Store, Service Booking).*

- **Cấu trúc 4 Subtab chuyên sâu trên Header Bar (Chuẩn `AGENTS.md`)**:
  1. *Banner và Khuyến mãi (`tab-banner-promos`)*:
     - **Thanh cảnh báo Zero Miss Strip**: Tự động quét và cảnh báo các Voucher sắp cạn quota ($\le 10$ lượt) hoặc hết sạch lượt ($0$ lượt), các Banner sắp hết hạn trong vòng 24 - 48 giờ để không đứt gãy luồng tương tác khách hàng.
     - **Quản lý Banner**: Danh sách Banner hiển thị ngoài trang chủ và trang dịch vụ, hỗ trợ thao tác 1 chạm gia hạn 30 ngày (`btn-extend-banner`), bật/tắt hiển thị.
     - **Bảng Master Voucher Khuyến mãi**: Lọc theo phân hệ (Shop, Spa, Hotel, System), hiển thị tiến độ hạn ngạch phát hành (ví dụ: `86/200`, `96/100`), menu tác vụ 3 chấm text-only `•••` (Gia hạn thêm 50 lượt, Đổi trạng thái Bật/Tắt, Xóa voucher).
     - **Cấu hình Quy chế Điểm thưởng PawPoints**: Tỷ lệ tích điểm (*10.000 VNĐ = 1 điểm*), tỷ lệ quy đổi (*1 điểm = 100 VNĐ*), thưởng đăng ký mới (+50 điểm), thưởng đơn đầu (+100 điểm), thưởng sinh nhật (+200 điểm).
     - **Thông báo Website**: Quản lý dải băng thông báo Top-bar và Popup thông báo khẩn cấp cho khách hàng.
  2. *Quản lý Nội dung Website (`tab-content-management`)*:
     - **5 Thẻ KPI Thống kê Nội dung**: Tổng bài viết, Đã công khai, Bản nháp, Tạm ẩn, Tổng lượt xem tháng.
     - **Bảng Quản lý Blog và Cẩm nang**: Lọc theo danh mục (Chó, Mèo, Dinh dưỡng, Grooming, Mẹo chăm sóc) và trạng thái (Công khai, Bản nháp, Tạm ẩn).
     - **Cơ chế Nạp Tri thức AI RAG (Retrieval-Augmented Generation)**: Mỗi bài viết cẩm nang được tự động trích xuất các từ khóa cốt lõi (Entities & Keywords) và nội dung tóm lược chuẩn mực để nạp trực tiếp vào Prompt Context của Trợ lý ảo Chatbot AI PawPal, giúp Chatbot luôn tư vấn đúng kiến thức chuẩn chuyên gia.
  3. *Cấu hình Hệ thống (`tab-system-config`)*:
     - **Card 1: Thông tin Cửa hàng và Chi nhánh (Store Profile)**: Tên thương hiệu, Tên công ty pháp lý, Hotline tiếp nhận 24/7 (`1900 888 999`), Số khẩn cấp, Email CSKH (`cskh@pawpal.vn`), Mã số thuế VAT (`0316889988`), Địa chỉ trụ sở cơ sở và liên kết mạng xã hội (Zalo OA, Facebook).
     - **Card 2: Phương thức Thanh toán**: Quản lý bật/tắt 4 cổng thanh toán độc lập (COD, Chuyển khoản QR Banking Vietcombank, Ví điện tử MoMo, Cổng thanh toán VNPay) và thông tin tài khoản thụ hưởng.
     - **Card 3: Đơn vị Vận chuyển và Biểu phí**: Mức đơn miễn phí giao hàng (*Đơn từ 300.000 VNĐ*), Biểu phí giao hàng nội thành (*25.000 VNĐ*), ngoại tỉnh (*35.000 VNĐ*), giao hỏa tốc 2 giờ (*45.000 VNĐ*), và thông số kết nối API đối tác 3PL (GHN, GHTK, GrabExpress).
     - **Card 4: Chính sách Đặt lịch, Giờ mở cửa và Pet Hotel**: Khung giờ phục vụ chi nhánh (*08:00 - 20:00 ngày thường, đến 21:00 cuối tuần*), Quy định Pet Hotel (*Check-in sau 14:00, Check-out trước 12:00, Phụ phí trả trễ 100.000 VNĐ / nửa ngày*), Công suất tối đa (*4 bé / ca*), Quy tắc hủy miễn phí (*trước 4 giờ, phí trễ 50.000 VNĐ*).
     - **Card 5: Kết nối Đối tác API và Live Healthcheck**: Đo ping thời gian thực tới hạ tầng GHN Express, MoMo Merchant Gateway, VNPay Payment Engine.
  4. *Nhật ký Cấu hình (`tab-audit-logs`)*:
     - **4 Thẻ KPI Nhật ký**: Tổng lượt thay đổi, Đã đồng bộ SSOT, Phân hệ tác động gần nhất, Trạng thái Khóa an toàn.
     - **Bảng Master Nhật ký Thay đổi**: Lọc theo từ khóa, phân hệ tác động (Khách hàng, Dịch vụ, Bán hàng, Nhân sự, Cửa hàng), ghi nhận thời gian chi tiết, người thực hiện, nội dung thay đổi và trạng thái `Đã đồng bộ SSOT`.

- **Cơ chế Khóa an toàn (Safe Mode) và Xác nhận Tác động Đa phân hệ (SSOT Impact Confirmation)**:
  - **Khóa an toàn chống thao tác nhầm**: Mặc định hệ thống luôn ở trạng thái **`Khóa an toàn: Đang bật`** để bảo vệ toàn bộ tham số vận hành lõi. Quản trị viên phải bấm *"Mở khóa để sửa"* trước khi lưu bất kỳ thay đổi nào.
  - **Modal Cảnh báo Tác động Đa phân hệ (Impact Modal)**: Khi lưu thay đổi (Thanh toán, Giao hàng, Đặt lịch, Cửa hàng), hệ thống tự động mở modal cảnh báo trực quan liệt kê chính xác các phân hệ con chịu ảnh hưởng tức thì (ví dụ: User Portal, Shop Checkout, Lịch hẹn Dịch vụ, Hóa đơn VAT) trước khi bấm *"Xác nhận và Đồng bộ ngay"*.
  - **Nhật ký Thay đổi Cấu hình (Audit Trail SSOT)**: Tự động ghi nhận thời gian chi tiết, người thực hiện, phân hệ tác động và nội dung điều chỉnh kèm nhãn `Đã đồng bộ SSOT`.

- **Cơ chế Phân biệt Trạng thái Tài khoản Người dùng (User Deactivation vs Admin Lock)**:
  - **Khách hàng tự tạm dừng (`status: 'DEACTIVATED'`)**: Người dùng tự thao tác tạm dừng tài khoản trong User Portal Settings (`#btnDeactivateAccount`). Trạng thái này cho phép khách tự đăng nhập lại bất kỳ lúc nào để tái kích hoạt.
  - **Admin khóa tài khoản (`status: 'LOCKED'`)**: Quản trị viên chủ động vô hiệu hóa tài khoản vi phạm trong Admin Customers Module. Dòng khách hàng trong bảng quản trị bị làm mờ `opacity: 0.52` và khách không thể tự mở khóa trừ khi Admin phê duyệt.

---

## 4. BẢNG TRA CỨU NHANH TRẠNG THÁI VÀ QUY TẮC GIAO DIỆN

| Nhóm trạng thái | Gam màu chuẩn (`AGENTS.md`) | Màu nền | Màu chữ | Ví dụ hiển thị |
| :--- | :--- | :--- | :--- | :--- |
| **Tích cực / Hoàn thành** | Muted Forest Green | `#DCEEE2` | `#165335` | `Đang hoạt động`, `Đã cấp TK`, `Đã xác nhận`, `Đã hoàn tất`, `Đã thanh toán`, `Còn hàng`, `Đã giải quyết` |
| **Chờ duyệt / Lưu ý** | Warm Amber (Hổ phách dịu) | `#F5E8D3` | `#734718` | `Chờ xác nhận`, `Chờ xử lý`, `Đang chuẩn bị`, `Sắp hết hàng`, `Tạm dừng`, `Chờ khách phản hồi`, **`Chờ quản lý duyệt`** |
| **Khẩn cấp / Tiêu cực** | Muted Earth Red (Đỏ đất) | `#F7DCDC` | `#8F2424` | `Đã hủy`, `Bị khóa`, `Khóa công vụ`, `Hết hàng`, `Khiếu nại khẩn`, **`Đang xử lý lần 2`** |
| **Tiến trình / Thông tin** | Muted Soft Blue (Xanh phấn) | `#DCEAF2` | `#20495E` | `Đang thực hiện`, `Đang giao hàng`, `Đang lưu trú Hotel`, `Đang xử lý`, `Chờ nhận hàng trả` |
| **Trung tính / Mặc định** | Muted Sage Slate (Xám xô thơm)| `#E2ECE5` | `#2D483B` | `Chưa cấp TK`, `Bản nháp`, `Lưu trữ`, `Sắp tới`, `Đã đóng` |

### Quy tắc cảnh báo viền mép trái (`border-left`)
- **Độc quyền duy nhất cho dòng dữ liệu bảng cần Alert**: Vạch đỏ 3px (`border-left: 3px solid #DC2626;` cho dòng có khiếu nại) hoặc vạch cam 3px (`#D97706;` cho dòng có lưu ý đặc biệt).
- Tuyệt đối không dùng `border-left` để làm khung trích dẫn hay trang trí ở các khối thẻ bên ngoài.
- Dòng cảnh báo khẩn cấp ở đầu trang luôn sử dụng **chữ đỏ thuần không nền, không viền hộp**.

---

## 5. CƠ CHẾ LƯU VÀ KHÔI PHỤC TRẠNG THÁI TOÀN HỆ THỐNG (STATE PERSISTENCE VÀ F5/RELOAD)

### 5.1. Bảng điều hướng Subtabs và Trạng thái 9 Phân hệ

Toàn bộ **9 phân hệ quản trị** của Pawpal-er đã được kiểm tra và chuẩn hóa 100% cơ chế lưu trữ liên thông giữa **URL Hash**, **`sessionStorage`** và **Bộ điều hướng Sidebar**:

| Phân hệ | Khóa lưu trữ Subtab (`sessionStorage`) | Hash mặc định / Subtabs hỗ trợ | Thông tin chi tiết được giữ nguyên khi F5 / Reload |
| :--- | :--- | :--- | :--- |
| **1. Dashboard** | `pawpal_admin_active_module` | `#tab-dashboard` | Tự động giữ nguyên phân hệ Dashboard, không bị trôi sang các phân hệ khác. |
| **2. Khách hàng** | `pawpal_admin_customer_subtab` | `#tab-list`, `#tab-profile`, `#tab-pawpoint` | Giữ nguyên mã khách hàng đang mở (`pawpal_admin_customer_id`), tab con trong Drawer (`pawpal_admin_customer_drawertab`) và Deep Breadcrumb `/ [Tên khách]`. |
| **3. Thú cưng** | `pawpal_admin_pet_subtab` | `#tab-pet-list`, `#tab-pet-profile`, `#tab-pet-carelog`, `#tab-pet-reminders` | Giữ nguyên mã bé đang xem (`pawpal_admin_pet_id`), tab con Drawer (`pawpal_admin_pet_drawertab`) và Deep Breadcrumb `/ [Tên bé]`. |
| **4. Dịch vụ** | `pawpal_admin_services_active_subtab` | `#tab-service-bookings`, `#tab-service-detail`, `#tab-service-catalog`, `#tab-service-reviews` | Giữ nguyên lịch hẹn đang mở (`pawpal_admin_service_selected_id`), bảng giá, đánh giá và Deep Breadcrumb `/ [Mã BKG]`. |
| **5. Bán hàng** | `pawpal_admin_order_subtab` | `#tab-order-list`, `#tab-order-detail`, `#tab-order-products`, `#tab-order-promos` | Giữ nguyên đơn hàng đang chọn (`pawpal_admin_order_selected_id`), danh mục kho, voucher và Deep Breadcrumb `/ [Mã ORD]`. |
| **6. Nhân sự** | `pawpal_admin_staff_active_subtab` | `#tab-staff-list`, `#tab-staff-profile`, `#tab-staff-schedule`, `#tab-staff-assessment` | Giữ nguyên nhân viên đang xem (`pawpal_admin_staff_selected_id`), lịch làm việc, đánh giá KPI và Deep Breadcrumb `/ [Tên NV]`. |
| **7. Khiếu nại** | `pawpal_admin_complaint_active_subtab` | `#tab-complaint-services`, `#tab-complaint-orders`, `#tab-complaint-detail` | Giữ nguyên Ticket đang xử lý (`pawpal_admin_complaint_selected_id`), biên bản đối thoại Chat Transcript và Deep Breadcrumb `/ [Mã Ticket]`. |
| **8. Chatbot AI** | `pawpal_admin_chatbot_subtab` | `#tab-live-support`, `#tab-ai-copilot`, `#tab-chatbot-rules` | Giữ nguyên ca hội thoại đang trực tiếp trao đổi (`pawpal_admin_chatbot_conv_id`) và Deep Breadcrumb `/ [Tên khách]`. |
| **9. Cấu hình** | `pawpal_admin_settings_subtab` | `#tab-banner-promos`, `#tab-content-management`, `#tab-system-config`, `#tab-audit-logs` | Giữ nguyên phân mục đang chỉnh sửa (Banner và Vouchers, Bài viết tin tức, Cấu hình hệ thống hoặc Nhật ký cấu hình). |

### 5.2. Quản trị Phiên và Phân lập Bộ nhớ Xác thực (Bi-directional Session Isolation)

| Khóa lưu trữ | Phạm vi áp dụng | Nội dung dữ liệu | Quy tắc bảo mật |
| :--- | :--- | :--- | :--- |
| **`pawpal_admin_user`** | **Cổng Quản trị Admin** (`/admin/login`, `/pages/admin/`) | Token xác thực, `auth_user_id`, Email nhân sự, Họ tên, Vai trò (`ADMIN`/`STAFF`), Mảng phân quyền (`permissions`). | Tuyệt đối không lưu vào `pawpal_current_user`. Đăng xuất tại Admin Shell sẽ xóa sạch key này và điều hướng về `/pages/admin/login/login.html`. |
| **`pawpal_current_user`** | **Cổng Khách hàng** (`/login`, `/user/`) | Thông tin khách hàng cá nhân, SĐT chính, Hạng thành viên, Số dư điểm Pawpoint, Danh sách thú cưng. | Khách hàng không thể dùng key này để truy cập Admin Shell. Bất kỳ nỗ lực truy cập Admin nào đều bị chặn và chuyển hướng về Cổng Đăng nhập Quản trị. |

*Quy tắc điều hướng Sidebar và Browser History:*
- Khi bấm chuyển phân hệ trên Sidebar, URL Hash tự động cập nhật ngay lập tức theo phân mục đang làm việc của phân hệ đó.
- Nút bấm **Back / Forward (`<` / `>`)** của trình duyệt tự động chuyển đổi mượt mà giữa các phân hệ và subtab mà không bị giật trang hay mất dữ liệu làm việc.

---
*Tài liệu được biên soạn và cập nhật tự động theo tiêu chuẩn hệ thống quản trị Pawpal-er.*
