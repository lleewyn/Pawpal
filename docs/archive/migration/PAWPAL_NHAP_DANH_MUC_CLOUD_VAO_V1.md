# Nhập danh mục Cloud vào V1

Trạng thái: ĐÃ NHẬP vào local. Nguồn gồm 33 nhóm xuất và bảng giá đủ 102 dòng; 100 dòng bảng giá ở lần đầu khớp nguyên dữ liệu lần bổ sung.

Backup đầy đủ trước nhập, SQL nhập và bản nguồn giữ tại `D:\Aboutme\Pawpal-infra\supabase-local\imports\catalog-570770be5f828d64` ngoài webroot. Auth/mật khẩu Admin không thay đổi. Schema vẫn 105 bảng/906 cột/160 FK.

| Bảng V1 | Số dòng nhập |
|---|---:|
| membership_tier | 4 |
| reward_rule | 3 |
| pet_species | 5 |
| pet_breed | 17 |
| staff_level | 3 |
| service_category | 3 |
| service | 22 |
| service_addon | 5 |
| care_action | 2 |
| service_price_matrix | 69 |
| taxi_price_rule | 5 |
| hotel_room_type | 5 |
| hotel_room | 3 |
| supplier | 1 |
| product_category | 4 |
| variant_color | 5 |
| variant_size | 5 |
| variant_flavor | 5 |
| product | 37 |
| product_variant | 41 |
| payment_method_config | 5 |
| delivery_option_config | 2 |
| shipping_provider | 5 |
| voucher | 20 |
| promotion | 1 |
| promotion_product | 3 |
| promotion_service | 3 |

## Quy tắc chuyển dữ liệu

Kiểm tra sau nhập: Admin thật đăng nhập qua Auth và đọc được số lượng danh mục qua REST/RLS; join nhóm dịch vụ hợp lệ, ba phòng được chuyển sang pet_hotel đúng ánh xạ. Database thử đã xóa sau kiểm tra; không còn khách, thú cưng hoặc đơn mẫu trong database chính.

- Giữ ID UUID nguồn; ID dạng bank/cod/express... được ánh xạ UUID xác định theo tên bảng và ID cũ. Không sửa schema V1 để dùng lại ID text.
- Tạo nhóm dịch vụ từ ba mã nhóm nguồn; sửa ba phòng có tên rõ nhưng nhóm sai sang pet_hotel. Chỉ tạo cấp độ Junior/Senior/Master từ cấp groomer nguồn; không biến chức danh chăm sóc/tài xế thành hạng chuyên môn.
- Slug sản phẩm thiếu được tạo từ tên và UUID nguồn; tiện ích hotel mảng được chuyển thành mô tả text. Voucher chỉ lấy scope scalar rõ ràng; scope nhiều giá trị được giữ ngoài bản nhập để xử lý sau.
- Ngày cấu hình lấy phần YYYY-MM-DD nguồn; không kéo dài hạn voucher/khuyến mãi đã hết hạn. Trạng thái chuyển mã rõ ràng; bảng giá tam_ngung thành disabled, không kích hoạt lại.
- Không nhập QA/rác và dịch vụ tên thuốc/trị liệu theo phạm vi không thú y; các dòng phụ thuộc cũng được giữ ngoài bản nhập. Tắm khô không tự bị loại chỉ vì mô tả có nhắc từ thuốc.
- Loài/giống được chuẩn hóa từ cặp nguồn, gộp một số tên đồng nghĩa rõ. Không nhập nhầm loài hoặc màu lông/tên mơ hồ làm giống; mỗi loài có giống quy ước Chưa xác định, giao diện phải lọc mục quy ước khỏi gợi ý giống thực.
- Không nhập trạng thái phòng đang ở/giữ chỗ khi không chuyển booking. Không tạo booking, tồn kho, số dư điểm, checklist áp dụng hàng loạt hoặc loài dịch vụ hỗ trợ để bù dữ liệu chưa được cung cấp.

## Bản ghi giữ ngoài bản nhập

| Bảng nguồn | ID/nhãn | Lý do |
|---|---|---|
| hotel_room | 61342bda-7758-4207-9dc0-0e09fb4c87ff H-STD-002 | Không nhập trạng thái đang ở/đang giữ vì không chuyển booking nguồn |
| hotel_room | f2646ce8-7524-4aba-b237-8635cfb902c2 H-DLX-001 | Không nhập trạng thái đang ở/đang giữ vì không chuyển booking nguồn |
| service | 35770d36-7552-4393-934c-95153719f089 Dịch vụ QA r87 | Tên dữ liệu QA/kiểm thử/rác |
| service | 36ab7717-80e2-4c54-ba14-66039cd26f3c Đưa đón QA r92 | Tên dữ liệu QA/kiểm thử/rác |
| service | 832f732b-f913-4b16-9c8b-ad814d6f786d Lưu trú QA r91 | Tên dữ liệu QA/kiểm thử/rác |
| service | c0000000-0000-0000-0000-000000000010 Tắm Thuốc Trị Liệu Da Liễu | Tên dịch vụ ngoài phạm vi không thú y |
| service | f050c1e9-5fda-4a86-9322-07b771993a54 sdf | Tên dữ liệu QA/kiểm thử/rác |
| service_price_matrix | 09cca145-f6a6-43d2-80b9-1de22afac438  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 1bfb468e-1df9-47f4-b2e5-3670797d18c8  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 1c355d89-9544-4329-9abf-e762858d0b7f  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 1e342aa8-56ad-4ef3-aa95-406d82756f6d  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 2351af7d-caa3-4f73-bc77-a0623e0c5dce  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 25cd5271-25d3-4913-b511-2cde06d6e255  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 26c1c625-f25a-40a9-9140-05dae8af17f1  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 2caf8348-9506-446d-9ed1-89377068fbdc  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 2cf26341-1025-4651-99c6-2c700bd6803e  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 4b432d85-b954-4730-8d5d-9915d3a001b5  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 4f57459f-38e1-4fc8-a03e-1e6e882d7826  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 5199e012-f5ab-4b44-8d61-f1f52fbaccb5  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 52ac7237-f19a-4f53-ab62-866c6ace597d  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 55318aae-6983-4213-9ac0-e0aca5fdf821  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 582d47e0-aca1-484d-b5ba-d592b2948a99  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 5c0c3178-edc4-45e7-850d-40dce85904fd  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 5cc78002-38cc-4b61-b99e-08f60cfae84d  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 76bcfb25-4c0f-457e-9e73-befa94093faf  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 8fbf20de-7fde-4b3b-b918-b9f540543d5c  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | 9a61e8ec-4fa0-4c26-98b3-63dd4552bbbb  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | a14f132f-10a8-4cf7-b7cd-26d297074004  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | a3bb5b16-c78f-436f-aad0-0708bf6607ac  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | a453cac4-7ee1-4f1c-b552-88ee2920d41b  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | abb5041c-7825-4506-9043-09ae81326d72  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | acaefdda-ef66-4c88-b405-25c7cce4b3ae  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | c1404d24-5876-4834-96d3-fc8a42e3a861  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | c5a04d39-179d-413d-898e-c87015396f38  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | c8f5df97-684d-49e7-81ec-d9dffb96c19c  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | c97b8bf2-eafe-457b-a4e4-adaf14450ec1  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | cb3cc034-64f2-47fd-8cf6-94f5f02e15c8  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | e1a918f0-b07d-4876-8443-36d45678ef38  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | ef503c81-3f80-48a0-a815-afaa66cf344d  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| service_price_matrix | f3a37062-b4bf-496c-91a2-d98ecf9e3507  | Dịch vụ cha được tạm giữ, không tạo FK treo |
| care_action | 31b6ba33-3f59-4c84-89cc-14b88946b55d QA r69 ghi nhật ký thật | Tên dữ liệu QA/kiểm thử |
| care_action | a1e99b12-b54d-4cb8-a127-90e560f8d56c QA r70 nhật ký đã chỉnh sửa | Tên dữ liệu QA/kiểm thử |
| care_action | c7416e8f-8835-489d-9300-ac06dbcbb8c8 QA r84 kiểm thử nhật ký | Tên dữ liệu QA/kiểm thử |
| voucher | 57bafa83-b126-4248-b6c7-2a4fa75ed39d PAW-2026-206 | Giá trị âm không hợp lệ theo V1: minimum_order_amount |
| voucher | 7ed2e592-3e18-4b5d-8c9c-54c39a3d36f8 WOW | Ngày hoặc mức voucher không hợp lệ |
| voucher | 9158efa4-b7db-4e2c-82d0-9cc48c47c530 PAW-2026-889 | Giá trị âm không hợp lệ theo V1: minimum_order_amount |
| voucher | a273dc44-9653-4949-85d9-a54ee54a7cc8 SUMMER50 | Scope nhiều giá trị chưa có ánh xạ scalar V1; không tự mở rộng thành all |
| legacy_pet_taxonomy | — Anh lông ngắn | Loài/giống mâu thuẫn hoặc tên màu lông/tên mơ hồ |
| legacy_pet_taxonomy | — Corgi | Loài/giống mâu thuẫn hoặc tên màu lông/tên mơ hồ |
| legacy_pet_taxonomy | — Mèo cam | Loài/giống mâu thuẫn hoặc tên màu lông/tên mơ hồ |
| legacy_pet_taxonomy | — Mèo cam | Loài/giống mâu thuẫn hoặc tên màu lông/tên mơ hồ |
| legacy_pet_taxonomy | — Mướp | Loài/giống mâu thuẫn hoặc tên màu lông/tên mơ hồ |
| legacy_pet_taxonomy | — Nhật Bản | Loài/giống mâu thuẫn hoặc tên màu lông/tên mơ hồ |

Các bản ghi trên vẫn còn trong bản nguồn, chưa bị xóa trên Cloud và chưa được tạo trong local. Không tự coi chúng là dữ liệu đã di chuyển thành công.

## Ánh xạ/hiệu chỉnh có ghi nhận

- payment_method_config: ID bank → fb5e5e6d-e6a2-8566-8688-a73fe96179ce
- payment_method_config: ID cod → 87d0c121-8d5e-8fb4-8f8e-6e5c861c7879
- payment_method_config: ID momo → 3c386c6b-f318-8d71-8bb0-54c155668cef
- payment_method_config: ID vietqr → 07f9d466-038d-8309-8135-b2c4e20d3831
- payment_method_config: ID vnpay → 41df7e42-4c82-8531-8086-7e7b4fa91a2e
- delivery_option_config: ID express → 54b23923-58e3-87ad-82c9-eb30554bca16
- delivery_option_config express: estimated_days khoảng 1,2 → 2 ngày (cận trên; mô tả khoảng nguồn được giữ)
- delivery_option_config: ID standard → 8b36f078-ac3d-8cbe-8fd1-e1086483ea2c
- delivery_option_config standard: estimated_days khoảng 3,5 → 5 ngày (cận trên; mô tả khoảng nguồn được giữ)
- service c0000000-0000-0000-0000-000000000015: Phòng Standard, grooming_spa → pet_hotel
- service c0000000-0000-0000-0000-000000000016: Phòng Standard Plus, grooming_spa → pet_hotel
- service c0000000-0000-0000-0000-000000000017: Phòng Deluxe, pet_taxi → pet_hotel
- product a0000000-0000-0000-0000-000000000001: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000002: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000003: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000004: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000005: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000006: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000007: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000008: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000009: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000010: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000011: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000012: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000013: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000014: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000015: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000016: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000017: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000018: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000019: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000020: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000021: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000022: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000023: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000024: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000025: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000026: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000027: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000028: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000029: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000030: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000031: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000032: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000033: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000034: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000035: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000036: tạo slug từ tên và ID nguồn để bảo đảm duy nhất
- product a0000000-0000-0000-0000-000000000037: tạo slug từ tên và ID nguồn để bảo đảm duy nhất

Đã thử import vào bản sao V1 rồi đối chiếu từng bảng, khóa ngoại, unique, CHECK và exclusion giá. Việc có danh mục trong database không nghiệm thu các màn hình nghiệp vụ còn dùng schema cũ. Ảnh/file, bank_info và các cột không có trong bản xuất chưa được chuyển.
