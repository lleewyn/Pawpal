# Xóa dữ liệu kiểm thử

Phạm vi do người dùng yêu cầu: xóa bản ghi kiểm thử, giữ nguyên danh mục sản phẩm/dịch vụ, không thêm dữ liệu nghiệp vụ.

Kế hoạch được lập từ dữ liệu thực và khóa ngoại hiện tại. Chỉ chọn các bản ghi có dấu hiệu kiểm thử rõ ràng cùng các dòng phụ thuộc; không chọn bản ghi chỉ vì đã quá hạn hoặc thiếu hồ sơ.

Đã chạy thử xóa trong giao dịch và ROLLBACK thành công. Trigger/khóa ngoại không bị tắt. Đã xác nhận dữ liệu ngoài danh sách xóa, danh mục, tồn kho, sổ điểm, sổ kho và thanh toán đã ghi sổ không đổi trong lần thử.

Các nhóm có điểm đã ghi sổ, sử dụng voucher, biên bản/tệp được bảo vệ được giữ lại cùng ngữ cảnh liên quan. Hai hồ sơ nhân viên tên Test có tài khoản đăng nhập cũng được giữ lại trong đợt này.

Trạng thái: COMMIT thành công lúc 02:59:31 UTC ngày 11/11/2026 (09:59:31 giờ Việt Nam).

Đã xóa 175 bản ghi trong 26 bảng, gồm 4 khách, 24 thú cưng, 25 lịch hẹn, 6 đơn hàng, 11 yêu cầu hỗ trợ và các bản ghi phụ thuộc. Có một thanh toán đang chờ thuộc nhóm kiểm thử được xóa; không xóa thanh toán đã thành công.

Bản sao lưu riêng ở artifacts/data-cleanup/2026-11-11T02-51-15-423Z/before-delete.private.json, kèm SHA-256; thư mục artifacts được Git bỏ qua. Không đưa bản sao lưu lên Git.

Giữ lại 6 khách, 1 thú cưng và 2 lịch thuộc danh sách nghi kiểm thử ban đầu cùng ngữ cảnh liên quan vì có bản ghi được bảo vệ. Ngoài ra giữ hai nhân viên tên Test có tài khoản đăng nhập. Đây là đợt xóa an toàn, chưa phải xóa sạch mọi dấu vết kiểm thử.

Kiểm tra sau COMMIT trên bản deploy: Dashboard tải không có lỗi tài nguyên, bộ lọc 7 ngày hoạt động, Realtime ở trạng thái live. Hiển thị 1 lịch hôm nay (khớp truy vấn độc lập), 36 lịch cần xử lý, 12 đơn cần xử lý, 2 SKU cần nhập và 21 yêu cầu hỗ trợ mở. Lỗi 404 có sẵn của RPC thông báo phản hồi khiếu nại vẫn tồn tại, không thuộc đợt dọn dữ liệu này.

## Danh sách theo bảng

- public.customer: 4
- public.pet_profile: 24
- public.appointment: 25
- public.support_ticket: 11
- public.return_request: 1
- public.review: 3
- public.cart: 1
- public.chat_conversation: 3
- public.chat_moderation_log: 1
- public.customer_address: 3
- public.customer_membership: 4
- public.customer_phone: 4
- public.customer_profile: 4
- public.notification: 1
- public.payment: 1
- public.sales_order: 6
- public.wishlist: 1
- public.pet_weight_history: 6
- public.appointment_item: 25
- public.care_log: 2
- public.support_ticket_message: 24
- public.cart_item: 2
- public.chat_message: 9
- public.sales_order_detail: 6
- public.wishlist_product: 3
- public.review_response: 1

Total rows: 175

## Root records
- public.customer / CUS-0e852ba0-290b-4e2d-b09b-c9c520a0905f / delete / Explicit test marker
- public.customer / CUS-28c2fcb2-ed12-4ba5-ae6c-ef4f463cc742 / delete / Explicit test marker
- public.customer / CUS-c5ee0922-87ee-4304-8f0e-cab7e5853680 / retained / Dependent protected record
- public.customer / CUS-f88a4506-d8ea-47f6-8ce3-903ccf47f730 / retained / Dependent protected record
- public.customer / CUS-0fc4feb3-8c6b-49f1-9c50-13457fdaf6f7 / retained / Dependent protected record
- public.customer / CUS-592961ad-d90e-4d19-b504-15a124df6111 / delete / Explicit test marker
- public.customer / CUS-3527b05f-fa9f-4a54-9a8f-ca0cc2631713 / retained / Dependent protected record
- public.customer / CUS-d0000000-0000-0000-0000-000000000002 / retained / Dependent protected record
- public.customer / CUS-d0000000-0000-0000-0000-000000000003 / delete / Explicit test marker
- public.customer / CUS-030b48d9-972c-4459-9dcb-61d62fbf3c64 / retained / Dependent protected record
- public.pet_profile / PET-009 / delete / Explicit test marker
- public.pet_profile / PET-TEST-A1 / delete / Explicit test marker
- public.pet_profile / PET-QA01MOCHI / delete / Explicit test marker
- public.pet_profile / PET-TEST001 / retained / Dependent protected record
- public.pet_profile / PET-QA-193040-2 / delete / Explicit test marker
- public.pet_profile / PET-GUEST-921755 / delete / Explicit test marker
- public.pet_profile / TEST-PET-2 / delete / Explicit test marker
- public.pet_profile / PET-QA-444896 / delete / Explicit test marker
- public.pet_profile / TEST-PET-3 / delete / Explicit test marker
- public.pet_profile / PET-QA-193040-1 / delete / Explicit test marker
- public.pet_profile / PET-TEST-A2 / delete / Explicit test marker
- public.pet_profile / PET-TEST-QA2782 / delete / Explicit test marker
- public.pet_profile / PET-QA-234809-1 / delete / Explicit test marker
- public.pet_profile / PET-7c69ff8fc9b948de80fc9567 / delete / Explicit test marker
- public.pet_profile / PET-66eb310e7a8c491fa3e1ae84 / delete / Explicit test marker
- public.pet_profile / PET-c1615adee38842f38b27de33 / delete / Explicit test marker
- public.pet_profile / PET-38f4281ce8584cccb5e63bea / delete / Explicit test marker
- public.pet_profile / PET-7d4c0df031c64fdfa399071d / delete / Explicit test marker
- public.pet_profile / PET-1aa8b31e8d324e1aa9f64fd5 / delete / Explicit test marker
- public.pet_profile / PET-6f23eee7142144eca7998a8b / delete / Explicit test marker
- public.pet_profile / PET-c173e03ef17c4e6c89a3b869 / delete / Explicit test marker
- public.appointment / BKG-08e4e094-a5e6-48c9-b135-ffac698f70c8 / delete / Explicit test marker
- public.appointment / APP-GEN-3-4 / delete / Explicit test marker
- public.appointment / BKG-46e6e9c7-9896-4f15-956c-5eafe0a4c7f5 / delete / Explicit test marker
- public.appointment / BKG-E2E12-5973 / delete / Explicit test marker
- public.appointment / BKG-E2E12-1249 / retained / Dependent protected record
- public.appointment / APP-GEN-2-0 / delete / Explicit test marker
- public.appointment / APP-GEN-4-4 / delete / Explicit test marker
- public.appointment / BKG-c8237798-4ead-4e89-8a5b-d6cafce481c8 / delete / Explicit test marker
- public.appointment / QA48-LIVE / delete / Explicit test marker
- public.appointment / BKG-E2E12-4053 / delete / Explicit test marker
- public.appointment / QA48-FIRST / delete / Explicit test marker
- public.appointment / QA48-EARLY / delete / Explicit test marker
- public.appointment / BKG-QA02-TEST / delete / Explicit test marker
- public.appointment / APP-GEN-6-2 / delete / Explicit test marker
- public.appointment / BKG-E2E12-1108 / delete / Explicit test marker
- public.appointment / BKG-E2E09-TIEN / delete / Explicit test marker
- public.appointment / QA48-LATE / delete / Explicit test marker
- public.appointment / APP-GEN-1-3 / delete / Explicit test marker
- public.appointment / BKG-68b6ff1f-25f3-4af5-b12b-1c8f30f9b8d9 / delete / Explicit test marker
- public.appointment / APP-GEN-5-2 / delete / Explicit test marker
- public.appointment / APP-GEN-0-3 / delete / Explicit test marker
- public.appointment / BKG-d0380934-64c7-4819-ba27-147b390b6807 / delete / Explicit test marker
- public.appointment / BKG-E2E12-5403 / delete / Explicit test marker
- public.appointment / BKG-5b927c05-5abd-482f-b96c-8385ba133d78 / retained / Dependent protected record
- public.support_ticket / LH-5EBFC214 / delete / Explicit test marker
- public.support_ticket / TICKET-24187239-7c79-4cff-a744-279ecf1ec52d / delete / Explicit test marker
- public.support_ticket / TICKET-450dc727-a5b5-460a-b365-6953c0c8700e / delete / Explicit test marker
- public.support_ticket / TICKET-687a719a-828e-49c0-b389-d8df69637a51 / delete / Explicit test marker
- public.support_ticket / TICKET-6efd4237-c29d-46fb-857a-5ce5417ab110 / delete / Explicit test marker
- public.support_ticket / TK-GO7DGH / delete / Explicit test marker
- public.support_ticket / TICKET-d77268a8-776a-4d98-89a9-eee0b65026a8 / delete / Explicit test marker
- public.support_ticket / TICKET-d7e51836-9f8e-4984-8050-59572369c2f9 / delete / Explicit test marker
- public.support_ticket / LH-F516FE18 / delete / Explicit test marker
- public.return_request / 239a34ed-0ebf-47a2-bb9d-f0459303a397 / delete / Explicit test marker
- public.review / 3e4ce750-ebba-4f55-a2bc-a8f64e47c2f6 / delete / Explicit test marker
