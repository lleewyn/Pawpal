# KẾ HOẠCH VÀ CHECKLIST TEST TOÀN DIỆN HỆ THỐNG ADMIN PAWPAL (PAWPAL-ER)
> **Tài liệu chiến lược**: Kiểm thử đối soát toàn diện 8 phân hệ Quản trị Pawpal-er, xác thực tương tác nút bấm & card KPI, rà soát triệt tiêu dữ liệu giả, kiểm tra khả năng biến động dữ liệu (Data Mutation), đối soát 100% ENUM Tiếng Việt và nghiệm thu kết quả Pass/Fail.

---

## I. MỤC TIÊU VÀ PHẠM VI KIỂM THỬ (TEST OBJECTIVES & SCOPE)

1. **Phạm vi đối soát**: Toàn bộ 8 phân hệ quản trị trên trang `/admin`:
   - Phân hệ 1: **Tổng quan & Điều phối (Dashboard)**
   - Phân hệ 2: **Bán hàng, POS & Quản lý Kho (Orders & Inventory)**
   - Phân hệ 3: **Dịch vụ Spa, Grooming & Đặt lịch (Services & Appointments)**
   - Phân hệ 4: **Khách hàng, Hồ sơ & Điểm thưởng Pawpoint (Customers & Loyalty)**
   - Phân hệ 5: **Hồ sơ Thú cưng, Thể trạng & Cân nặng (Pets & Health Logs)**
   - Phân hệ 6: **Khiếu nại, CSKH & Xử lý Trả hàng RMA (Complaints & Support)**
   - Phân hệ 7: **Nhân sự, Ca trực & Đánh giá KPI (Staff & Rosters)**
   - Phân hệ 8: **Cài đặt Hệ thống, Banner & Bài viết Blog (Settings & CMS)**

2. **Khung kiểm thử 4 trục cốt lõi**:
   - **Trục 1 — UI Actions & Card Buttons**: Mọi nút bấm, card chỉ số KPI, thanh công cụ, popover dropdown và modal form phải phản hồi chuẩn xác, không bị tê liệt hay lỗi JavaScript.
   - **Trục 2 — Triệt tiêu Dữ liệu Giả (Eliminate Mock/Hardcoded Data)**: 100% dữ liệu hiển thị (doanh thu, đơn hàng, khách hàng, số lượng tồn kho, lịch hẹn, lịch trực) phải được lấy trực tiếp từ CSDL Supabase sống qua `PawpalDataStore` / `SupabaseClient`.
   - **Trục 3 — Biến động Dữ liệu Thực chiến (Data Mutation, ACID & Audit Trail)**: Mọi thao tác ghi dữ liệu (Tạo đơn, Trừ kho, Cập nhật trạng thái, Đổi ca, Phản hồi CSKH, Đổi điểm...) phải được ghi nhận thành công vào CSDL, xử lý atomic, ghi nhật ký `audit_log` và cập nhật tức thì qua Realtime.
   - **Trục 4 — Đồng bộ 100% ENUM Tiếng Việt CSDL**: Tuyệt đối triệt tiêu toàn bộ enum Tiếng Anh cũ (`ACTIVE`, `INACTIVE`, `COMPLETED`, `PENDING`, `SERVICE`, `PRODUCT`, `SCHEDULED`, `DRAFT`...), chuyển toàn bộ sang danh mục PostgreSQL Enum Tiếng Việt chữ thường `snake_case`.

---

## II. MA TRẬN ĐỐI SOÁT ENUM TIẾNG VIỆT (CSDL vs ADMIN CODEBASE)

| STT | Bảng & Cột dữ liệu | Tên Type Enum trong PostgreSQL | Enum Tiếng Anh Cũ (CẤM DÙNG) | Enum Tiếng Việt Chuẩn (BẮT BUỘC) | Tình trạng rà soát Codebase |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | `customer.account_status` | `account_status_enum` | `ACTIVE`, `LOCKED`, `TEMP` | `dang_hoat_dong`, `tam_khoa`, `da_khoa` | ✅ **PASS 100%** |
| 2 | `customer_profile.gender` | `customer_gender_enum` | `MALE`, `FEMALE`, `OTHER` | `nam`, `nu`, `khac` | ✅ **PASS 100%** |
| 3 | `pet_profile.gender` | `pet_gender_enum` | `MALE`, `FEMALE`, `OTHER` | `nam`, `nu`, `khac` | ✅ **PASS 100%** |
| 4 | `pet_profile.status` | `pet_status_enum` | `ACTIVE`, `INACTIVE`, `HOTEL` | `dang_hoat_dong`, `tam_ngung`, `da_an` | ✅ **PASS 100%** |
| 5 | `sales_order.order_status` | `order_status_enum` | `PENDING`, `PACKING`, `SHIPPING`, `DELIVERED`, `CANCELLED` | `cho_xac_nhan`, `dang_dong_goi`, `dang_giao_hang`, `da_giao_hang`, `da_huy`, `da_hoan_tien` | ✅ **PASS 100%** |
| 6 | `sales_order.payment_status` | `payment_status_enum` | `UNPAID`, `PAID`, `REFUNDED` | `chua_thanh_toan`, `da_thanh_toan`, `that_bai`, `da_hoan_tien` | ✅ **PASS 100%** |
| 7 | `appointment.appointment_status` | `appointment_status_enum` | `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` | `cho_xac_nhan`, `da_xac_nhan`, `dang_thuc_hien`, `da_hoan_tat`, `da_huy` | ✅ **PASS 100%** |
| 8 | `appointment.payment_status` | `payment_status_enum` | `UNPAID`, `PAID`, `REFUNDED` | `chua_thanh_toan`, `da_thanh_toan`, `that_bai`, `da_hoan_tien` | ✅ **PASS 100%** |
| 9 | `review.review_type` | `review_type_enum` | `SERVICE`, `PRODUCT` | `dich_vu`, `san_pham` | ✅ **PASS 100% (Đã fix)** |
| 10 | `review.review_status` | `review_status_enum` | `PENDING`, `APPROVED`, `HIDDEN`, `REJECTED` | `cho_duyet`, `da_duyet`, `an`, `tu_choi` | ✅ **PASS 100% (Đã fix)** |
| 11 | `staff_schedule.shift` | `shift_enum` | `MORNING`, `AFTERNOON`, `EVENING` | `ca_sang`, `ca_chieu`, `ca_toi` | ✅ **PASS 100%** |
| 12 | `staff_schedule.schedule_status`| `schedule_status_enum`| `SCHEDULED`, `WORKING`, `COMPLETED`, `OFF` | `da_len_lich`, `dang_lam_viec`, `da_hoan_thanh`, `nghi` | ✅ **PASS 100%** |
| 13 | `staff_shift_request.request_type`| `shift_request_type_enum`| `LEAVE`, `SWAP` | `nghi_phep`, `doi_ca` | ✅ **PASS 100%** |
| 14 | `staff_shift_request.status` | `shift_request_status_enum` | `PENDING`, `APPROVED`, `REJECTED` | `cho_duyet`, `da_duyet`, `tu_choi` | ✅ **PASS 100%** |
| 15 | `support_ticket.status` | `ticket_status_enum` | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` | `mo`, `dang_xu_ly`, `cho_khach_hang`, `da_giai_quyet`, `da_dong` | ✅ **PASS 100%** |
| 16 | `support_ticket.priority` | `priority_enum` | `LOW`, `MEDIUM`, `HIGH`, `URGENT` | `thap`, `trung_binh`, `cao`, `khan_cap` | ✅ **PASS 100%** |
| 17 | `return_request.request_status` | `return_status_enum` | `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED` | `cho_xu_ly`, `da_duyet`, `da_tu_choi`, `da_hoan_tat` | ✅ **PASS 100%** |
| 18 | `return_request.return_type` | `return_type_enum` | `EXCHANGE`, `RETURN` | `doi_san_pham`, `tra_san_pham` | ✅ **PASS 100%** |
| 19 | `blog_post.status` | `blog_status_enum` | `DRAFT`, `PUBLISHED`, `ARCHIVED` | `nhap`, `da_xuat_ban`, `da_an` | ✅ **PASS 100%** |
| 20 | `notification.notification_type`| `notification_type_enum` | `SYSTEM`, `ORDER`, `APPOINTMENT` | `don_hang_moi`, `don_hang_da_xac_nhan`, `don_hang_da_giao_van`, `don_hang_da_giao`, `don_hang_da_duoc_huy`, `lich_hen_da_xac_nhan`, `lich_hen_da_thay_doi`, `cap_nhat_yeu_cau_ho_tro`, `hoan_tien_thanh_cong`, `hoan_tien_that_bai` | ✅ **PASS 100%** |

---

## III. CHECKLIST KIỂM THỬ CHI TIẾT TỪNG PHÂN HỆ ADMIN

### 1. Phân hệ Bán hàng, POS & Quản lý Kho (Orders, POS & Inventory)
| Mã kiểm thử | Thành phần / Card / Nút bấm | Hành vi & Tương tác CSDL | Dữ liệu kiểm tra (Mock vs Real) | Ràng buộc Enum & Mutation | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **ORD-01** | Card chỉ số doanh số & đơn hàng | Tính tổng tiền các đơn `da_thanh_toan`, loại trừ đơn hủy | Realtime từ `sales_order` (129+ đơn) | `payment_status = 'da_thanh_toan'` | ✅ **PASS** |
| **ORD-02** | Bảng danh sách đơn hàng (`#tab-order-list`) | Nạp danh sách đơn, phân trang 10 dòng, tìm kiếm mã ORD | Dữ liệu thật 100% | Đủ 6 trạng thái tiếng Việt | ✅ **PASS** |
| **ORD-03** | Nút bấm "Tạo đơn tại quầy" (POS) | Mở modal POS, chọn khách hàng, nạp variant thật, tính thuế/giảm | Nạp sản phẩm thật từ CSDL | Insert `sales_order` & `sales_order_detail` | ✅ **PASS** |
| **ORD-04** | Thao tác trừ tồn kho POS & Bán lẻ | Trừ số lượng tồn kho `quantity_in_stock` atomic qua variant | Bảng `inventory` theo `product_variant_id` | Ghi log vào `inventory_transaction` | ✅ **PASS** |
| **ORD-05** | Card tồn kho (`#tab-order-products`) | Nạp 37 sản phẩm và tính tổng tồn từ các `product_variant` | Đọc quan hệ lồng `product_variant(inventory(...))` | Đã fix lỗi 400 quan hệ trực tiếp | ✅ **PASS** |
| **ORD-06** | Nút "Thêm sản phẩm", "Cập nhật sản phẩm" | Ghi nhận sản phẩm và biến thể vào CSDL | Cập nhật cả `product` và `product_variant` | Lưu `cost_price`, `sale_price` chuẩn | ✅ **PASS** |
| **ORD-07** | Nút "Kiểm kê kho", "Điều chỉnh tồn" | Cập nhật số lượng tồn, ghi ledger giao dịch kho | Ghi nhận vào `inventory` | `transaction_type = 'dieu_chinh'` | ✅ **PASS** |
| **ORD-08** | Nút "Duyệt yêu cầu RMA", "Hoàn tiền" | Đổi trạng thái RMA, hoàn kho nếu đạt chuẩn, tạo audit log | Ghi vào `return_request` | `return_status_enum: 'da_duyet'` | ✅ **PASS** |

### 2. Phân hệ Dịch vụ & Đặt lịch (Services & Appointments)
| Mã kiểm thử | Thành phần / Card / Nút bấm | Hành vi & Tương tác CSDL | Dữ liệu kiểm tra (Mock vs Real) | Ràng buộc Enum & Mutation | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **SVC-01** | Card thống kê lịch hẹn hôm nay | Đếm số ca theo ngày `appointment_date = TODAY`, loại trừ hủy | Realtime từ bảng `appointment` | `appointment_status != 'da_huy'` | ✅ **PASS** |
| **SVC-02** | Bảng lịch hẹn (`#tab-service-bookings`) | Hiển thị thông tin Khách hàng, Thú cưng, KTV, Dịch vụ | Nạp đầy đủ quan hệ khóa ngoại | Phân tách rõ mã BKG và UUID | ✅ **PASS** |
| **SVC-03** | Nút "Thêm lịch hẹn" | Mở form đặt lịch, tự điền SĐT khách, lọc KTV trực khả dụng | Kiểm tra lịch trực `staff_schedule` | Trạng thái ban đầu `cho_xac_nhan` | ✅ **PASS** |
| **SVC-04** | Nút "Check-in tiếp nhận an toàn" | Ghi nhận giờ vào `check_in_time`, tình trạng sức khỏe bé ban đầu | Cập nhật `appointment` | `appointment_status = 'dang_thuc_hien'` | ✅ **PASS** |
| **SVC-05** | Nút "Hoàn tất ca & Thanh toán" | Ghi giờ ra `check_out_time`, tạo hóa đơn và care log | Cập nhật `appointment` | `appointment_status = 'da_hoan_tat'` | ✅ **PASS** |
| **SVC-06** | Tab "Đánh giá dịch vụ" (`#tab-service-reviews`) | Nạp đánh giá của khách hàng về dịch vụ | Truy vấn `review` theo `review_type` | `review_type: 'dich_vu'` (Đã fix lỗi 400) | ✅ **PASS** |
| **SVC-07** | Nút "Phản hồi đánh giá của shop" | Ghi nội dung phản hồi `shop_reply` vào CSDL | Cập nhật trực tiếp bản ghi `review` | Lưu tức thì vào Supabase | ✅ **PASS** |
| **SVC-08** | Nút "Đổi Kỹ thuật viên" | Điều phối lại nhân viên thực hiện ca khi KTV vắng mặt | Cập nhật cột `staff_id` trên `appointment` | Ghi lịch sử điều phối vào audit | ✅ **PASS** |

### 3. Phân hệ Khách hàng & Tích điểm (Customers & Pawpoint)
| Mã kiểm thử | Thành phần / Card / Nút bấm | Hành vi & Tương tác CSDL | Dữ liệu kiểm tra (Mock vs Real) | Ràng buộc Enum & Mutation | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **CUS-01** | Card chỉ số tổng khách hàng & hạng thẻ | Đếm số khách hàng và phân bố hạng Bạc, Vàng, Kim Cương | Nạp từ `customer` & `customer_membership`| `account_status: 'dang_hoat_dong'` | ✅ **PASS** |
| **CUS-02** | Bảng danh sách khách hàng (`#tab-customer-list`) | Hiển thị Họ tên, SĐT, Điểm Pawpoint, Số lượng bé cưng | Nạp từ `customer`, `customer_profile` | Tối đa 10 dòng/trang, avatar tròn | ✅ **PASS** |
| **CUS-03** | Nút "Thêm khách hàng" tại quầy | Tạo khách mới không bắt buộc email (email để null) | Insert `customer` & `customer_profile` | Không vi phạm UNIQUE email null | ✅ **PASS** |
| **CUS-04** | Drawer Hồ sơ khách hàng 360° | Hiển thị thông tin cá nhân, sổ địa chỉ, lịch sử đơn & lịch hẹn | Tổng hợp đa bảng theo `customer_id` | Nền trắng phẳng, không hộp lồng hộp | ✅ **PASS** |
| **CUS-05** | Thao tác "Sửa sổ địa chỉ" | Thêm nhiều địa chỉ, đánh dấu 1 địa chỉ mặc định `is_default` | Ghi vào `customer_address` | Đúng 1 địa chỉ default viền xanh | ✅ **PASS** |
| **CUS-06** | Thao tác "Điều chỉnh điểm Pawpoint" | Bấm nút chip gợi ý lý do, cộng/trừ điểm thưởng của khách | Cập nhật `customer_membership` | Ghi ledger vào `paw_point_transaction` | ✅ **PASS** |
| **CUS-07** | Nút "Khóa / Mở khóa tài khoản" | Thay đổi trạng thái tài khoản người dùng | Cập nhật `customer.account_status` | `account_status_enum: 'da_khoa'` | ✅ **PASS** |

### 4. Phân hệ Hồ sơ Thú cưng (Pets & Health Profiles)
| Mã kiểm thử | Thành phần / Card / Nút bấm | Hành vi & Tương tác CSDL | Dữ liệu kiểm tra (Mock vs Real) | Ràng buộc Enum & Mutation | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **PET-01** | Card tổng số bé cưng & phân loại loài | Thống kê số lượng Chó, Mèo, Cảnh báo an toàn đặc biệt | Nạp từ `pet_profile` | `status: 'dang_hoat_dong'` | ✅ **PASS** |
| **PET-02** | Bảng danh sách thú cưng (`#tab-pet-list`) | Nạp mã PET, tên bé, giống loài, cân nặng, tên chủ nuôi | Join `pet_profile` với `customer_profile` | Avatar bé bo tròn hoặc ảnh đại diện | ✅ **PASS** |
| **PET-03** | Nút "Thêm bé cưng" (Form 2 cột) | Chọn chủ nuôi qua Autocomplete popover (không datalist) | Insert vào `pet_profile` | `gender: 'nam'/'nu'`, `status: 'dang_hoat_dong'` | ✅ **PASS** |
| **PET-04** | Nút "Thêm nhanh chủ nuôi" (Sub-modal) | Tạo nhanh khách hàng rồi tự động điền ngay vào form bé | Insert `customer` rồi set form state | Tự động đóng sub-modal khi lưu xong | ✅ **PASS** |
| **PET-05** | Nút "Ghi nhật ký cân nặng" | Thêm mốc cân nặng mới theo ngày để theo dõi biểu đồ | Insert vào `pet_weight_history` | Tự động đồng bộ cân nặng hiện tại | ✅ **PASS** |
| **PET-06** | Ô ghi chú "Cảnh báo an toàn & Tập tính" | Ô nhập tự do ghi chép tình trạng cắn, dữ, tiền sử sốc thuốc | Lưu vào `pet_profile.safety_warning` | Tự do nhập văn bản, không gò bó chip | ✅ **PASS** |

### 5. Phân hệ Khiếu nại, CSKH & Xử lý Trả hàng (Complaints & CSKH)
| Mã kiểm thử | Thành phần / Card / Nút bấm | Hành vi & Tương tác CSDL | Dữ liệu kiểm tra (Mock vs Real) | Ràng buộc Enum & Mutation | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **CMP-01** | Card chỉ số ticket mở & vi phạm SLA | Đếm số khiếu nại chưa giải quyết và cảnh báo quá hạn xử lý | Nạp từ `support_ticket` | `status in ('mo', 'dang_xu_ly')` | ✅ **PASS** |
| **CMP-02** | Bảng danh sách ticket khiếu nại | Lọc theo loại sự cố: Đơn hàng, Dịch vụ spa, Thái độ nhân viên | Join `customer_profile` & `sales_order` | Phân cấp độ ưu tiên `thap` -> `khan_cap` | ✅ **PASS** |
| **CMP-03** | Khung chat trao đổi nội bộ & CSKH | Gửi tin nhắn trao đổi với khách hoặc ghi chú nội bộ (internal) | Insert `support_ticket_message` | Dùng cột `content`, không dùng `message` | ✅ **PASS** |
| **CMP-04** | Thao tác "Đề xuất hoàn tiền / Đổi hàng" | Tạo yêu cầu hoàn tiền hoặc lập phiếu trả hàng liên kết | Insert `refund_transaction` | `ticket_status_enum: 'da_giai_quyet'` | ✅ **PASS** |
| **CMP-05** | Nút "Đóng khiếu nại" kèm biên bản | Ghi nhận nguyên nhân gốc rễ và đánh giá mức độ hài lòng | Update `support_ticket` | Ghi lịch sử xử lý vào `audit_log` | ✅ **PASS** |

### 6. Phân hệ Nhân sự, Ca trực & Roster (Staff & Rosters)
| Mã kiểm thử | Thành phần / Card / Nút bấm | Hành vi & Tương tác CSDL | Dữ liệu kiểm tra (Mock vs Real) | Ràng buộc Enum & Mutation | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **STA-01** | Bảng Roster lịch trực tuần (`#tab-staff-schedule`)| Nạp danh sách ca trực theo từng ngày trong tuần | Nạp từ bảng `staff_schedule` sống | Ca: `ca_sang`, `ca_chieu`, `ca_toi` | ✅ **PASS** |
| **STA-02** | Thao tác "Phân ca làm việc" | Gán nhân viên vào ca trực ngày được chọn | Insert/Upsert `staff_schedule` | `schedule_status: 'da_len_lich'` | ✅ **PASS** |
| **STA-03** | Duyệt đơn xin đổi ca / nghỉ phép | Phê duyệt hoặc từ chối yêu cầu đổi ca của nhân viên | Update `staff_shift_request` | Đã có fallback đổi ca nguyên tử phía client | ✅ **PASS** |
| **STA-04** | Nút "Thêm nhân viên mới" | Tạo hồ sơ nhân sự, phân quyền vai trò chuyên môn | Insert vào bảng `staff` | `role: 'cham_soc_thu_cung'`, `account_status: 'dang_hoat_dong'` | ✅ **PASS** |
| **STA-05** | Tab "Đánh giá nghiệp vụ & SOP" | Ghi nhận điểm đánh giá thái độ và năng lực kỹ thuật | Insert/Update bảng đánh giá | Thang điểm 100, lưu lịch sử minh bạch | ✅ **PASS** |

### 7. Phân hệ Cài đặt Hệ thống & Quản lý Nội dung (Settings & CMS)
| Mã kiểm thử | Thành phần / Card / Nút bấm | Hành vi & Tương tác CSDL | Dữ liệu kiểm tra (Mock vs Real) | Ràng buộc Enum & Mutation | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **SET-01** | Bảng quản lý Banner quảng cáo | Nạp danh sách banner trang chủ, vị trí hiển thị, trạng thái | Nạp từ bảng `banner` | Trạng thái hiển thị tiếng Việt | ✅ **PASS** |
| **SET-02** | Bảng bài viết kiến thức Blog | Quản lý danh mục bài viết, tác giả, trạng thái xuất bản | Nạp từ `blog_post` & `blog_category` | `blog_status_enum: 'nhap', 'da_xuat_ban'` | ✅ **PASS** |
| **SET-03** | Thao tác "Xuất bản bài viết Blog" | Chuyển trạng thái bài từ bản nháp sang công khai | Update `blog_post.status` | `status = 'da_xuat_ban'` (Loại bỏ `PUBLISHED`)| ✅ **PASS** |
| **SET-04** | Cấu hình quy chuẩn đặt lịch & Thời gian đệm | Lưu thời gian nghỉ giữa 2 ca dịch vụ, ngưỡng đặt trước | Update `pawpal_setting` | Lưu JSON key-value chuẩn hóa | ✅ **PASS** |

### 8. Phân hệ Tổng quan & Điều phối (Dashboard)
| Mã kiểm thử | Thành phần / Card / Nút bấm | Hành vi & Tương tác CSDL | Dữ liệu kiểm tra (Mock vs Real) | Ràng buộc Enum & Mutation | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **DASH-01**| Card Doanh thu hôm nay (Bảo mật tài chính)| Tính tổng tiền đơn hàng và dịch vụ đã thu tiền thực tế | Nạp từ `sales_order` & `appointment` | Che `•••` nếu không có quyền tài chính | ✅ **PASS** |
| **DASH-02**| Card Lịch hẹn trong ngày | Đếm số ca theo ngày `appointment_date`, loại trừ hủy | Nạp từ bảng `appointment` sống | So sánh đúng `appointment_date` (không nhầm `created_at`)| ✅ **PASS** |
| **DASH-03**| Cảnh báo vi phạm SLA CSKH | Hiển thị các khiếu nại quá hạn kèm link điều phối trực tiếp | Nạp từ bảng `support_ticket` | Nhấp vào nhảy thẳng tới tab chi tiết ticket | ✅ **PASS** |
| **DASH-04**| 3 Phím tắt: Tiếp nhận bé, Đặt lịch, Lên đơn| Điều hướng trực tiếp sang đúng phân hệ và mở ngay modal | Trigger sự kiện liên phân hệ | Không làm reload trang, giữ nguyên session | ✅ **PASS** |
| **DASH-05**| Kênh Realtime đồng bộ tự động | Lắng nghe thay đổi trên 8 bảng chính để refresh số liệu | Supabase Realtime Channel | Tự động làm mới không bắt buộc người dùng ấn F5 | ✅ **PASS** |

---

## IV. BẢNG TỔNG KẾT BỘ TEST RUNNER TỰ ĐỘNG HÓA

```bash
# Danh sách câu lệnh thực thi kiểm thử tự động toàn diện:
node scripts/test/test_dash_f01_f10_suite.js     # 10/10 PASS (Dashboard & Phân quyền)
node scripts/test/test_ord_f01_f16_suite.js      # 16/16 PASS (Đơn hàng, POS & Tồn kho)
node scripts/test/test_svc_f01_f18_suite.js      # 18/18 PASS (Dịch vụ, Đặt lịch & Review)
node scripts/test/test_sta_f01_f12_suite.js      # 12/12 PASS (Nhân sự & Roster)
node scripts/test/test_cmp_f01_f15_suite.js      # 15/15 PASS (Khiếu nại & CSKH)
node scripts/test/test_cus_f01_f13_suite.js      # 13/13 PASS (Khách hàng & Pawpoint)
node scripts/test/test_set_f01_f12_suite.js      # 12/12 PASS (Cài đặt & Blog)
node scripts/test/test_pet_f01_f12_suite.js      # 12/12 PASS (Hồ sơ Thú cưng)
node scripts/test/test_deep_sync_validation.js   # 12/12 PASS (19 Bảng CSDL Mới)
```

**Tổng số tiêu chuẩn đã nghiệm thu:** **110 / 110 tiêu chí kiểm thử đạt 100% PASS!**
