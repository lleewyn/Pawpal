# Chuyển dữ liệu nghiệp vụ Cloud sang V1

Trạng thái: ĐÃ NHẬP các đơn vị hợp lệ vào local. Bản nguồn đủ 80 bảng, 2167 dòng; không thiếu trang.

Nguồn SHA256: `80ae68d1b13987cd34bdbed5881953ae3e8a64c6e433abeab767082886a1ebb6`. Toàn bộ bản xuất, backup trước nhập, ánh xạ Auth, SQL và kết quả từ chối được giữ tại `D:\Aboutme\Pawpal-infra\supabase-local\imports\business-80ae68d1b139` ngoài webroot. Không ghi dữ liệu cá nhân vào báo cáo công khai này.

## Quyết định áp dụng

Đối soát sau nhập: đủ 35 customer, 76 địa chỉ, 82 pet, 17 staff/Auth (gồm Admin cũ và 16 người mới), tổng điểm 7.964, tồn kho 4.382; chỉ Admin cũ có staff_role. Đăng nhập Admin thật và các phép thử từ chối quyền qua trình duyệt đã chạy lại thành công. Cả 16 Auth mới có banned_until trong tương lai và hồ sơ bắt đổi mật khẩu. Các tài khoản/fixture thử nghiệm đã được dọn.

Full dump sau nhập đã được thử restore vào database riêng: 105 bảng/906 cột/160 FK, Auth fingerprint và chính sách RLS khớp. Bản sao nằm tại `D:\Aboutme\Pawpal-infra\supabase-local\backups\v1-verified-3ca8bcfdd781e936\v1-full.dump`; database restore thử đã được xóa. Đây vẫn là bản sao cùng máy, chưa thay cho lịch backup ngoài máy.

Nguồn chỉ có 21 customer_profile cho 35 customer; không tự tạo tên cho 14 hồ sơ thiếu. Hai thú cưng bị giữ vì ngày sinh tương lai. 111 đơn có tổng nguồn không bằng tổng dòng hàng; chúng chưa được nhập. Xử lý các nhóm này cần dữ liệu sửa/giải thích từ nguồn, không hạ ràng buộc V1 để chép qua.

- Tạo 16 tài khoản Auth local mới với email kỹ thuật riêng, mật khẩu ngẫu nhiên không phát hành, ban 100 năm, must_change_password=true; không gán vai trò. Hồ sơ giữ email liên hệ gốc. Admin local hiện có giữ nguyên.
- Hồ sơ khách không được gắn Auth ID Cloud cũ vì danh tính đó không tồn tại ở local; khách được chuyển dưới dạng hồ sơ tại quầy, việc khôi phục đăng nhập khách cần quy trình xác minh riêng.
- Điện thoại chính lấy phone_main hợp lệ; nếu thiếu chọn số hợp lệ có sẵn, không xác nhận đăng nhập. Số sai được lưu bản nguồn. Địa chỉ có nhiều/không có mặc định được chuẩn hóa bằng thứ tự nguồn ổn định, ghi nhật ký riêng.
- Loài/giống theo danh mục đã nhập; giống mơ hồ dùng giống Chưa xác định thuộc đúng loài nguồn. Không nhập lịch sử tiêm phòng vào V1 không thú y.
- Giữ số dư điểm và tồn kho nguồn bằng bút toán mở đầu ghi nguồn theo lựa chọn người dùng. Lịch sử cũ được lưu riêng để tránh cộng trùng. Không tự coi điểm xét hạng cũ là chi tiêu hợp lệ.
- Ngày vào làm chưa biết được phép NULL thay vì tạo ngày giả. Không thêm bảng/cột ngoài 105 bảng V1. Các catalog đã nhập trước không bị ghi đè.
- Đơn/lịch chuyển theo dòng và snapshot xác định được; thiếu dòng/giá/timestamp hoặc tổng không khớp thì giữ ngoài bản nhập. Không tắt trigger/FK để ép dữ liệu qua.
- Các giao dịch, đánh giá, chat hoặc bảng khác còn thiếu nguồn FK, danh tính người gửi hay thông tin bắt buộc được giữ riêng. Không tuyên bố tất cả dữ liệu đã nhập chỉ vì nguồn đã xuất đủ.

## Số dòng trong V1 sau thử/áp dụng (gồm danh mục có trước)

| Bảng | Dòng |
|---|---:|
| permission | 210 |
| access_role | 1 |
| role_permission | 210 |
| staff_role | 1 |
| customer | 35 |
| customer_profile | 21 |
| customer_phone | 33 |
| customer_address | 76 |
| membership_tier | 4 |
| customer_membership | 22 |
| reward_rule | 3 |
| paw_point_transaction | 14 |
| voucher | 20 |
| customer_voucher | 1 |
| pet_species | 5 |
| pet_breed | 17 |
| pet_profile | 82 |
| pet_weight_history | 17 |
| staff_level | 3 |
| service_category | 3 |
| service | 22 |
| service_addon | 5 |
| care_action | 2 |
| service_price_matrix | 69 |
| taxi_price_rule | 5 |
| hotel_room_type | 5 |
| hotel_room | 3 |
| appointment | 71 |
| appointment_item | 71 |
| care_log | 7 |
| care_log_media | 5 |
| supplier | 1 |
| product_category | 4 |
| product | 37 |
| variant_color | 5 |
| variant_size | 5 |
| variant_flavor | 5 |
| product_variant | 41 |
| product_variant_media | 5 |
| purchase_order | 1 |
| purchase_order_detail | 1 |
| cart | 12 |
| cart_item | 13 |
| wishlist | 9 |
| wishlist_product | 19 |
| sales_order | 23 |
| sales_order_detail | 25 |
| inventory | 37 |
| inventory_transaction | 36 |
| payment_method_config | 5 |
| delivery_option_config | 2 |
| shipping_provider | 5 |
| payment | 2 |
| return_request | 1 |
| review | 3 |
| review_response | 2 |
| support_ticket | 25 |
| support_ticket_message | 44 |
| staff | 17 |
| staff_schedule | 26 |
| staff_shift_request | 11 |
| promotion | 1 |
| promotion_product | 3 |
| promotion_service | 3 |
| banner | 4 |
| blog_category | 3 |
| blog_post | 17 |
| notification | 6 |
| pawpal_setting | 4 |
| audit_log | 65 |
| chat_conversation | 8 |
| chat_message | 11 |
| chat_moderation_log | 5 |
| chatbot_sentiment_tier | 6 |
| chatbot_sentiment_trigger | 24 |
| chatbot_sentiment_action | 14 |
| chatbot_compensation_policy | 33 |
| chatbot_knowledge_faq | 92 |
| chatbot_system_prompt | 20 |
| chatbot_canned_response | 11 |
| chatbot_profanity_filter | 128 |
| chatbot_scenario_matrix | 24 |

## Kết quả theo đơn vị chuyển đổi

Đã thử 1170 đơn vị: 1002 hợp lệ, 168 từ chối. Một đơn vị có thể gồm header + dòng hoặc toàn bộ địa chỉ/số liên hệ của một khách.

| Nhóm nguồn | Đơn vị hợp lệ | Đơn vị bị từ chối |
|---|---:|---:|
| staff | 16 | 0 |
| customer | 35 | 0 |
| customer_profile | 21 | 0 |
| customer_phone_bundle | 33 | 0 |
| customer_address_bundle | 22 | 0 |
| customer_membership | 22 | 0 |
| pet_profile | 82 | 2 |
| pet_weight_history | 17 | 4 |
| opening_points | 14 | 0 |
| opening_inventory | 37 | 0 |
| purchase_order | 1 | 0 |
| sales_order | 23 | 0 |
| appointment | 71 | 0 |
| support_ticket | 25 | 0 |
| payment | 2 | 25 |
| return_request | 1 | 4 |
| return_request_detail | 0 | 3 |
| refund_transaction | 0 | 5 |
| review | 3 | 8 |
| review_response | 2 | 24 |
| cart | 12 | 0 |
| cart_item | 13 | 0 |
| wishlist | 9 | 0 |
| wishlist_item | 19 | 0 |
| customer_voucher | 1 | 0 |
| notification | 6 | 0 |
| care_log | 7 | 12 |
| care_log_media | 5 | 7 |
| staff_schedule | 26 | 0 |
| staff_shift_request | 11 | 0 |
| audit_log | 13 | 0 |
| blog_category | 3 | 0 |
| blog_post | 17 | 0 |
| banner | 4 | 0 |
| product_variant_media | 5 | 0 |
| pawpal_setting | 4 | 0 |
| chatbot_sentiment_tier | 6 | 0 |
| chatbot_canned_response | 11 | 0 |
| chatbot_compensation_policy | 33 | 0 |
| chatbot_knowledge_faq | 92 | 0 |
| chatbot_profanity_filter | 128 | 0 |
| chatbot_system_prompt | 20 | 0 |
| chatbot_scenario_matrix | 24 | 0 |
| chatbot_sentiment_trigger | 24 | 0 |
| chatbot_sentiment_action | 14 | 0 |
| chat_conversation | 8 | 0 |
| chat_message | 11 | 53 |
| support_ticket_message | 44 | 8 |
| chat_moderation_log | 5 | 13 |

## Lý do chưa chuyển (chỉ tổng hợp, không công khai bản ghi cá nhân)

- care_action: Catalog already reconciled separately; do not silently restore quarantined source rows
- delivery_option_config: Catalog already reconciled separately; do not silently restore quarantined source rows
- hotel_room: Catalog already reconciled separately; do not silently restore quarantined source rows
- payment_method_config: Catalog already reconciled separately; do not silently restore quarantined source rows
- service: Catalog already reconciled separately; do not silently restore quarantined source rows
- service_price_matrix: Catalog already reconciled separately; do not silently restore quarantined source rows
- voucher: Catalog already reconciled separately; do not silently restore quarantined source rows
- paw_point_transaction: Archived historical ledger; opening balance is authoritative per user instruction, do not double-count
- inventory_transaction: Archived historical stock ledger; not counted again with opening balance
- sales_order: Source order total differs from detail sum; missing shipping/discount breakdown
- sales_order: Order total has no source detail rows; do not invent line items
- appointment: Missing schedule/duration/price; do not invent snapshot
- appointment: Historical owner differs; requires dedicated validated historical migration
- support_ticket: Invalid UUID support_ticket.customer_id
- payment: Missing required payment.customer_id
- return_request_detail: Return cannot identify exactly one purchased line
- review: Review not tied to proven purchase/service
- notification: Read flag has no read timestamp
- chatbot_handover_rule: Source prose cannot be converted into threshold_value
- chat_conversation: Anonymous conversation requires original guest-session mapping
- chat_message: Sender Auth identity not migrated; cannot impersonate source customer
- chat_moderation_log: Missing required chat_moderation_log.conversation_id
- stock_reservation: Requires separate source-to-V1 relation mapping; source preserved, not silently dropped
- pet_profile: PostgreSQL 23514
- pet_weight_history: PostgreSQL 23503
- payment: PostgreSQL 23514
- return_request: PostgreSQL 23503
- return_request_detail: PostgreSQL P0001
- refund_transaction: PostgreSQL P0001
- review: PostgreSQL P0001
- review_response: PostgreSQL 23503
- care_log: PostgreSQL 23503
- care_log_media: PostgreSQL 23503
- chat_message: PostgreSQL 23503
- support_ticket_message: PostgreSQL 23503
- chat_moderation_log: PostgreSQL 23503

Cảnh báo chuyển đổi chi tiết, bản nguồn và dòng bị từ chối nằm trong thư mục private nêu trên. Phần chưa chuyển vẫn phải xử lý tiếp theo quan hệ V1; backup này nằm cùng máy, chưa thay bản sao ngoài máy. Các màn hình nghiệp vụ cũ vẫn cần chuyển mã và nghiệm thu riêng.
