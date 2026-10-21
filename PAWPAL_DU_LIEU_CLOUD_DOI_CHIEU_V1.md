# Đối chiếu dữ liệu danh mục Cloud với V1

**Mốc mới nhất:** đã nhận bảng giá đủ 102 dòng, khớp 100 dòng lần đầu; đã chuẩn hóa và nhập 283 dòng danh mục V1 vào local sau khi thử trên database riêng. Xem [báo cáo nhập và danh sách giữ ngoài bản nhập](PAWPAL_NHAP_DANH_MUC_CLOUD_VAO_V1.md). Nội dung dưới là ảnh chụp đối chiếu bản xuất đầu, khi còn thiếu hai dòng giá.

Nguồn: kết quả SQL Editor người dùng gửi. Đã đọc 33 nhóm và 335 bản ghi xuất ra; chưa ghi bất kỳ bản ghi nào vào database local.

SHA256 nguồn: `b7f081e9584dc9413056f9aee1e6e930412cc1d60f31729b6e4df1ed47c53d12`. Bản gốc lưu ngoài webroot tại `D:\Aboutme\Pawpal-infra\supabase-local\imports\cloud-reference-b7f081e9584d`.

## 1. Độ đầy đủ của dữ liệu

| Nhóm | Trạng thái | Tổng nguồn | Đã xuất |
|---|---|---:|---:|
| `care_action` | complete | 5 | 5 |
| `delivery_option_config` | complete | 2 | 2 |
| `hotel_room` | complete | 5 | 5 |
| `hotel_room_type` | complete | 5 | 5 |
| `legacy_brand` | missing_table | 0 | 0 |
| `legacy_category` | missing_table | 0 | 0 |
| `legacy_pet_taxonomy` | complete | 35 | 35 |
| `legacy_service_supported_pet_type` | missing_table | 0 | 0 |
| `membership_tier` | complete | 4 | 4 |
| `payment_method_config` | complete | 5 | 5 |
| `pet_breed` | missing_table | 0 | 0 |
| `pet_species` | missing_table | 0 | 0 |
| `product` | complete | 37 | 37 |
| `product_category` | complete | 4 | 4 |
| `product_variant` | complete | 41 | 41 |
| `promotion` | complete | 1 | 1 |
| `promotion_product` | complete | 3 | 3 |
| `promotion_service` | complete | 3 | 3 |
| `reward_rule` | complete | 3 | 3 |
| `service` | complete | 27 | 27 |
| `service_addon` | complete | 5 | 5 |
| `service_care_action` | missing_table | 0 | 0 |
| `service_category` | missing_table | 0 | 0 |
| `service_price_matrix` | more_rows | 102 | 100 |
| `service_supported_species` | missing_table | 0 | 0 |
| `shipping_provider` | complete | 5 | 5 |
| `staff_level` | missing_table | 0 | 0 |
| `supplier` | complete | 1 | 1 |
| `taxi_price_rule` | complete | 5 | 5 |
| `variant_color` | complete | 5 | 5 |
| `variant_flavor` | complete | 5 | 5 |
| `variant_size` | complete | 5 | 5 |
| `voucher` | complete | 24 | 24 |

Bản xuất có một nhóm more_rows: service_price_matrix mới có 100/102 dòng. Cần chạy export_cloud_service_prices_complete.sql trên Cloud và gửi lại đầy đủ bảng giá. Không dựa vào pg_temp ở phiên SQL trước vì kết nối SQL Editor có thể thay đổi.

Các bảng danh mục V1 chưa có ở Cloud cũ không phải lỗi mất dữ liệu; loài/giống và nhóm dịch vụ cần được tạo qua ánh xạ từ dữ liệu text cũ. Các nhóm missing_table không được tự biến thành bảng legacy mới trong V1.

## 2. Sai khác trường và quan hệ cần xử lý

| Bảng | Cột | Số dòng cần xét | Phát hiện |
|---|---|---:|---|
| hotel_room_type | amenities | 5 | Nguồn là array/object nhưng V1 dùng text; cần chuyển thành mô tả phù hợp |
| product | slug | 37 | Thiếu/rỗng trường bắt buộc V1; cần ánh xạ, không tự điền dữ liệu giả |
| service | category_id | 27 | Thiếu/rỗng trường bắt buộc V1; cần ánh xạ, không tự điền dữ liệu giả |
| voucher | applicable_for | 24 | Nguồn là array/object nhưng V1 dùng text; cần chuyển thành mô tả phù hợp |

Bảng trên là kiểm tra trường/FK của phần danh mục đã xuất, chưa thay thế thử import trong database riêng. Thời điểm tạo/cập nhật có default sẽ để database áp dụng nếu nguồn không có. Các ID hợp lệ được ưu tiên giữ để duy trì quan hệ; không đổi ID tùy tiện.

## 3. Dữ liệu cần làm sạch trước khi nhập

- Nhóm dịch vụ cũ: grooming_spa, pet_taxi, pet_hotel; cần chuyển thành service_category và category_id.
- Có 7 tên có dấu hiệu dữ liệu kiểm thử/rác trong service/product/care_action; danh sách dưới là ứng viên rà soát, chưa tự xóa hoặc nhập.
- Có 2 dịch vụ chứa nội dung thuốc/trị liệu/da liễu/thú y; cần đối chiếu phạm vi không thú y, không nhập nguyên trạng chỉ vì Cloud có sẵn.
- Có 3 dịch vụ tên phòng/suite/condo nhưng nhóm cũ không phải pet_hotel.
- Loài/giống text: 35 cặp, trong đó 9 cặp thiếu/giá trị mặc định/vô nghĩa và 2 cặp mâu thuẫn rõ giữa tên giống và loài. Cần chuẩn hóa mã dog/cat với tên Chó/Mèo, đối chiếu các tên đồng nghĩa; không tự đoán loài cho tên mơ hồ.

| Loại | Bảng/ID nguồn | Nội dung cần xét |
|---|---|---|
| Tên kiểm thử/rác | service / 35770d36-7552-4393-934c-95153719f089 | Dịch vụ QA r87 |
| Tên kiểm thử/rác | service / 36ab7717-80e2-4c54-ba14-66039cd26f3c | Đưa đón QA r92 |
| Tên kiểm thử/rác | service / 832f732b-f913-4b16-9c8b-ad814d6f786d | Lưu trú QA r91 |
| Tên kiểm thử/rác | service / f050c1e9-5fda-4a86-9322-07b771993a54 | sdf |
| Tên kiểm thử/rác | care_action / 31b6ba33-3f59-4c84-89cc-14b88946b55d | QA r69 ghi nhật ký thật |
| Tên kiểm thử/rác | care_action / a1e99b12-b54d-4cb8-a127-90e560f8d56c | QA r70 nhật ký đã chỉnh sửa |
| Tên kiểm thử/rác | care_action / c7416e8f-8835-489d-9300-ac06dbcbb8c8 | QA r84 kiểm thử nhật ký |
| Phạm vi dịch vụ | service / c0000000-0000-0000-0000-000000000006 | Tắm Khô Khử Mùi |
| Phạm vi dịch vụ | service / c0000000-0000-0000-0000-000000000010 | Tắm Thuốc Trị Liệu Da Liễu |
| Nhóm dịch vụ không khớp | service / c0000000-0000-0000-0000-000000000015 | Phòng Standard → grooming_spa |
| Nhóm dịch vụ không khớp | service / c0000000-0000-0000-0000-000000000016 | Phòng Standard Plus → grooming_spa |
| Nhóm dịch vụ không khớp | service / c0000000-0000-0000-0000-000000000017 | Phòng Deluxe → pet_taxi |
| Loài/giống mâu thuẫn | pet_profile (chỉ lấy danh mục) | Chó / Anh lông ngắn |
| Loài/giống mâu thuẫn | pet_profile (chỉ lấy danh mục) | cat / Corgi |

## 4. Thứ tự xử lý tiếp

1. Bổ sung đủ bảng giá 102 dòng; xác minh các quan hệ chưa tìm thấy trước khi nhập.
2. Lập ánh xạ danh mục loài/giống, nhóm dịch vụ và cấp độ chuyên môn. Chức danh như người chăm sóc/tài xế không được tự chuyển thành thứ hạng chuyên môn.
3. Chuẩn hóa trạng thái tiếng Việt cũ sang mã V1; chuyển tiện ích mảng thành mô tả text, giữ specs đúng jsonb theo ý nghĩa.
4. Phân loại bản ghi QA/rác, dịch vụ không đúng phạm vi và các tên/nhóm mâu thuẫn; ghi lại cách xử lý thay vì tự đoán hoặc lặng lẽ bỏ.
5. Tạo SQL import theo thứ tự FK, thử trên database riêng với constraint V1 (gồm khoảng giá chồng lấn); chỉ sau khi dữ liệu đủ và ánh xạ rõ mới áp dụng vào local.

Báo cáo này không xác nhận đã nhập dữ liệu. Không dùng file JSON/array giả trên giao diện làm cách bù các danh mục đang thiếu.
