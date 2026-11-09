# Giai đoạn 1 — Kiểm kê ảnh và video PawPal

Ngày thực hiện: 06/11/2026. Phạm vi: mã nguồn hiện tại và Supabase Cloud, chỉ đọc.

> Cập nhật 07/11/2026: phương án hiện hành là [MongoDB Atlas lưu file, Supabase giữ nghiệp vụ](PAWPAL_THIET_KE_MEDIA_MONGODB.md), không dùng Cloudinary hoặc R2. Người dùng đã tạo tài khoản Cloudflare nhưng chưa có xác nhận đã kích hoạt R2. Kết quả Cloud bên dưới giữ nguyên như lịch sử; chưa kiểm kê lại Supabase hoặc kết nối Atlas trong lần điều chỉnh tài liệu này.

## 1. Kết quả và phạm vi xác minh

- Đã truy vấn Cloud trong giao dịch `BEGIN READ ONLY`, giới hạn mỗi câu lệnh 10 giây; kết thúc bằng `ROLLBACK`.
- Đối chiếu 14 bảng thực tế: 136 cột, 84 chính sách RLS và định nghĩa 8 hàm nghiệp vụ có liên quan. Không gọi hàm ghi nghiệp vụ.
- Có 0 bucket trong `storage.buckets`. Đây là Supabase Storage, không phải kiểm tra tài khoản R2.
- Chỉ thống kê loại địa chỉ và số lượng; không xuất URL, tên khách, tên thú cưng, nội dung chat hoặc khóa truy cập.
- Không đọc Supabase Logs, không sửa CSDL, không thay đổi chức năng website.
- Chưa kiểm thử trực quan từng modal hoặc upload trên production; các kết luận luồng hiện tại dưới đây đến từ mã nguồn, chưa phải kết quả E2E.

Bằng chứng: [Kết quả Cloud](phase1-cloud-readonly.txt), [script chỉ đọc](../../scripts/test/media_phase1_readonly.cjs). File kết quả chứa metadata và số đếm, không phải dữ liệu cho giao diện sử dụng.

## 2. Phân bố địa chỉ ảnh trong Cloud

| Bảng / cột | Tổng bản ghi | Trống | `assets` | HTTPS | `data:` | `blob:` |
|---|---:|---:|---:|---:|---:|---:|
| `product_media.image_url` | 83 | 0 | 83 | 0 | 0 | 0 |
| `product_variant_media.image_url` | 134 | 0 | 125 | 9 | 0 | 0 |
| `service_image.image_url` | 23 | 0 | 23 | 0 | 0 | 0 |
| `care_log_media.media_url` | 5 | 0 | 5 | 0 | 0 | 0 |
| `pet_profile.avatar_url` | 92 | 74 | 12 | 3 | 3 | 0 |
| `banner.image_url` | 4 | 0 | 0 | 4 | 0 | 0 |
| `blog_post.thumbnail_url` | 18 | 1 | 17 | 0 | 0 | 0 |
| `return_request_evidence.image_url` | 0 | 0 | 0 | 0 | 0 | 0 |
| `review_media.image_url` | 0 | 0 | 0 | 0 | 0 | 0 |
| `support_ticket_message_attachment.file_url` | 0 | 0 | 0 | 0 | 0 | 0 |

Không thấy địa chỉ HTTP hoặc kiểu khác trong các cột đã thống kê. Số đếm không chứng minh tất cả file còn tồn tại hoặc URL ngoài còn tải được; cần kiểm tra tham chiếu trong giai đoạn chuyển đổi, không tự xóa dữ liệu theo số đếm này.

Ba avatar `data:` là ảnh được nhúng trong CSDL, có thể tồn tại sau tải lại; không được gọi chúng là URL tạm hết hạn. Khác với `blob:`, vấn đề của chúng là dung lượng và cách quản lý file. Cần chuyển nội dung ra R2 có đối chiếu trước khi thay liên kết; chưa thực hiện chuyển trong giai đoạn này.

## 3. Kiểm kê ô tải lên và đường dẫn

Quét `pages`, `components`, `scripts/shared` phát hiện 11 ô chọn file trong HTML và HTML sinh bằng JavaScript. Các ô đường dẫn và các nơi chỉ đọc ảnh được liệt kê thêm để không bỏ sót khi chuyển đổi.

| Mã | Khu vực / ô hiện tại | Luồng lưu hiện tại | Bảng / điểm tích hợp đích | Nguồn và quyền thiết kế |
|---|---|---|---|---|
| M01 | Sản phẩm: `newProdImages` | Danh sách URL phân tách dấu phẩy; xem trước; `save_admin_sales_product` ghi dữ liệu | `product_media` | Upload hoặc URL, công khai; Quản lý sửa |
| M02 | Biến thể: `.variant-img-input` | URL theo biến thể gửi trong RPC sản phẩm | `product_variant_media` | Upload hoặc URL, công khai; Quản lý sửa |
| M03 | Biến thể: `bulkImage` | Điền URL chung vào các dòng nháp; chỉ lưu khi lưu sản phẩm | Cùng M02 | Chọn nguồn chung rồi áp dụng cho dòng nháp, không tạo nhiều bản sao vật lý |
| M04 | Danh mục dịch vụ | Đọc `service_image`; chưa thấy ô upload ảnh trong modal danh mục hiện tại | `service_image` và RPC danh mục cần mở rộng | Upload hoặc URL, công khai; Quản lý sửa |
| M05 | Tạo nhật ký: `carelogImageFileInput` | Nút báo chưa cấu hình kho; khi có file thì chặn lưu | `care_log_media`, `save_admin_service_care_log` | Chỉ upload, riêng tư; người có quyền trên ca |
| M06 | Sửa nhật ký: `editCarelogFileInput` | Có mã tạo `blob:` xem trước; chặn lưu ảnh tạm | Cùng M05 | Chỉ upload, riêng tư; giữ ảnh cũ tới khi lưu thành công |
| M07 | Tiếp nhận: `intakeProofFileInput` | Tạo `blob:`; chặn lưu khi có ảnh | `appointment_record`, quan hệ media mới | Chỉ upload, riêng tư, theo ca |
| M08 | Bàn giao: `completeProofFileInput` | Tạo `blob:`; chặn lưu khi có ảnh | `appointment_record`, quan hệ media mới | Chỉ upload, riêng tư, theo ca |
| M09 | Phụ phí: `surchargeProofFileInput` | Xem trước; chặn lưu khi có ảnh | `appointment_adjustment`, quan hệ media mới | Chỉ upload; quyền đề nghị/duyệt phụ phí giữ nguyên |
| M10 | Admin thú cưng: `petPhotoFileInput` | Có modal/nút/ô file trong HTML; không tìm thấy handler sử dụng các ID upload này trong JS Admin hiện tại | `pet_profile.avatar_url`, FK media mới | Chỉ upload, riêng tư; quyền sửa hồ sơ hiện có |
| M11 | Khách: `avatar-input` | FileReader tạo `data:`; `petService.mapToSupabaseRow` loại `data:` khỏi payload avatar | `pet_profile`, `save_own_pet` | Upload ảnh thật rồi gắn; chủ hồ sơ |
| M12 | Khách: `vaccine-card-input` | Có xem trước, giá trị xuất hiện trong đối tượng form; `petService` không ánh xạ thành cột lưu | Chưa có chỗ lưu trong hợp đồng hiện tại | Hoãn; xác nhận chức năng hồ sơ còn được hỗ trợ, không tự tạo phân hệ tiêm phòng |
| M13 | Đổi trả: `rma-file-input` | Cho chọn ảnh/video và xem trước; biến `file` không được gửi trong `request_own_sales_return` | `return_request_evidence` | Chỉ upload, riêng tư, đúng đơn và chủ yêu cầu |
| M14 | Chat Admin: `adminChatFileInput` | Giữ `pendingAdminAttachment` để xem trước; `sendLiveMsg` chỉ gửi text vào `act_admin_chat` | `support_ticket_message_attachment` | Chỉ upload; theo đúng hội thoại được tiếp nhận |
| M15 | Chat nổi: `fabChatFileInput` | HTML có input; `components/fab/fab.js` hiện gửi câu hỏi dạng text, chưa xử lý input này | Cùng M14 nếu bật chức năng | Thành viên theo sở hữu; vãng lai theo token hội thoại, không dùng endpoint ẩn danh chung |
| M16 | Banner: `inputBannerImage` | URL được kiểm tra và gửi `save_admin_setting_record` | `banner.image_url` | Upload hoặc URL; công khai, Quản lý sửa |
| M17 | Bài viết | Lưu lại `thumbnail_url` cũ khi sửa; chưa có ô chọn ảnh bìa hoạt động trong mã đã rà soát | `blog_post.thumbnail_url` | Thêm chọn nguồn trong modal được nghiệm thu riêng, Quản lý sửa |
| M18 | Đánh giá sản phẩm/dịch vụ | Có nơi đọc ảnh; form `review-handler.js` gửi mức điểm và nội dung, chưa gửi media | `review_media`, RPC gửi/duyệt đánh giá | Upload riêng tư trước duyệt; chỉ bản được duyệt mới công khai |
| M19 | Hỗ trợ khách / khiếu nại Admin | Admin đọc tệp đính kèm; không thấy input upload hoạt động ở form khách hiện hành. `ticketFile` là tham chiếu cũ trong `support.js` | `support_ticket_message_attachment` | Upload riêng tư, theo phiếu và người tham gia |
| M20 | Tra cứu khách vãng lai | Đọc nhật ký `care_log_media` trong `return-guest.js`; không thấy ô upload ở trang này | Bộ cấp URL theo token tra cứu hiện hành | Không mở rộng quyền chỉ dựa vào mã đơn/số điện thoại do client gửi |

Avatar khách hàng/nhân sự đang dùng chữ viết tắt hoặc tài nguyên hiển thị; không tìm thấy ô upload trong các form hiện tại đã quét. Không thêm tính năng ảnh cá nhân mới ngoài phạm vi chỉ vì có khung avatar.

Các nơi đọc cần chuyển cùng bộ phân giải: cửa hàng/chi tiết sản phẩm, landing banner, blog, bảng và hồ sơ Admin, nhật ký khách, lịch hẹn, tra cứu vãng lai, đánh giá, khiếu nại và chat. Cần loại bỏ giả định mọi media đều có thể đưa vào thẻ `img` khi bắt đầu hỗ trợ video.

### Dẫn chứng mã nguồn chính

- Sản phẩm: `pages/admin/modules/orders/subtabs/tab-order-products.js`: `updateProductImagePreview`, `.variant-img-input`, `save_admin_sales_product`.
- Nhật ký: `pages/admin/modules/services/subtabs/tab-service-detail.js`: nút upload và kiểm tra file chưa lưu.
- Biên bản/phụ phí: `pages/admin/modules/services/subtabs/tab-service-bookings.js`: các mảng `*ProofImagesTemp` và nhánh chặn lưu.
- Avatar khách: `pages/user/modules/pets/pets.js`, `scripts/api/petService.js`: FileReader, `mapToSupabaseRow`, `save_own_pet`.
- Đổi trả: `pages/user/modules/orders/return-handler.js`: nhánh `change` và payload `request_own_sales_return`.
- Chat: `pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js`: `pendingAdminAttachment`, `sendLiveMsg`; `components/fab/fab.js`: `public_send`.
- Nội dung: `pages/admin/modules/settings/subtabs/tab-settings-banners.js`, `tab-settings-content.js`.

## 4. Sai khác schema và rủi ro cần xử lý

1. **Chưa có kho file hoạt động được xác nhận.** Cloud không có bucket Supabase, người dùng xác nhận chưa có tài khoản Cloudflare/chưa bật R2. Không dùng script cũ chứa mock URL làm bằng chứng đã có upload.
2. **Có trường chọn file nhưng file không được lưu.** M11, M13, M14 là các luồng có nguy cơ khiến người dùng hiểu rằng ảnh đi cùng lần lưu/gửi thành công. Cần nối giao dịch file đúng nghiệp vụ, không chỉ bỏ điều kiện chặn.
3. **Ảnh chăm sóc hiện trỏ tới `assets`.** RLS có thể bảo vệ hàng dữ liệu nhưng không bảo vệ file được phục vụ công khai trong bản triển khai. Khi chuyển sang riêng tư phải rà soát tham chiếu, bản triển khai cũ và khả năng ảnh đã được chia sẻ; đổi cột DB không thu hồi được mọi bản sao cũ.
4. **Ảnh đánh giá chưa có chính sách chờ duyệt phù hợp.** `review_media.anon_read` và `public_read` là PERMISSIVE với điều kiện `true`; cần thay bằng điều kiện nối tới đánh giá đã duyệt trước khi nhận media mới. Hiện bảng có 0 dòng nên chưa kết luận có ảnh chờ duyệt đã bị lộ. Chưa thử truy cập bằng vai trò thực tế trong giai đoạn này.
5. **Nhân viên không mặc nhiên ghi trực tiếp bảng media.** Các bảng có chính sách restrictive `v165_staff_boundary`; quyền ghi cũ yêu cầu `*.write`. Luồng mới phải đi qua kiểm tra quyền/RPC có phạm vi, không dùng service role bỏ qua ranh giới công việc.
6. **Khách có SELECT ảnh nhật ký theo sở hữu ca.** `own_customer_care_media` nối `care_log` → `appointment` → `owns_customer`. Tệp đính kèm khiếu nại chưa có chính sách khách tương đương trong phạm vi kiểm kê; cần thiết kế cấp URL/đọc metadata qua gateway.
7. **Biên bản dùng bảng thật `appointment_record`.** Không có lý do tạo lại `intake_record` hoặc `service_completion_record`. Phụ phí dùng `appointment_adjustment`. Hai bảng chưa có quan hệ media riêng trong các cột đã kiểm tra.
8. **`care_log_media` cần đủ metadata.** Các cột `media_type`, `media_url`, `file_name`, `file_size` đều NOT NULL. Không thể chỉ insert một URL mà bỏ các trường còn lại.
9. **Cột URL hiện có thường NOT NULL.** Migration phải nới điều kiện khi thêm FK media và đặt CHECK nguồn độc quyền; không đưa signed URL vào cột cũ để lách ràng buộc.
10. **Sổ tiêm là phần giao diện chưa có lưu trữ tương ứng.** Chỉ ghi nhận tồn tại; không tự tạo bảng tiêm phòng trái quyết định phạm vi của dự án.

## 5. Kiểm kê tài nguyên cố định

| Định dạng | Số file | Dung lượng gần đúng |
|---|---:|---:|
| PNG | 126 | 87,24 MiB |
| SVG | 23 | 40,71 MiB |
| JPG/JPEG | 178 | 19,67 MiB |
| WebP | 57 | 11,94 MiB |
| AVIF | 3 | 0,10 MiB |

Tổng 387 file khoảng 160 MiB; chưa thấy MP4/WebM/MOV trong `assets` theo đợt rà soát này. Một số ảnh danh mục 4–5 MiB; `dog6.svg`, `paw.svg`, `blog_dog_care.webp` thuộc nhóm lớn cần xem xét. Chưa nén/xóa file hoặc xác minh toàn bộ URL ngoài. Tối ưu theo kích thước hiển thị thực tế và kiểm tra hình ảnh, không đổi định dạng hàng loạt.

## 6. Điều kiện hạ tầng và các mục chưa xác nhận

| Điều kiện | Kết quả |
|---|---|
| Tài khoản Cloudflare | Người dùng xác nhận chưa có |
| R2 | Người dùng xác nhận chưa bật |
| Khóa R2 và bucket | Chưa có để cấu hình; không yêu cầu gửi bí mật trong chat |
| Tên miền website thực tế | Chưa được người dùng xác nhận; lấy trong lúc cấu hình Vercel giai đoạn 2 |
| Tên miền media production | Chưa cấu hình; cần chốt phương án custom domain hoặc gateway |
| Biến môi trường R2 trên Vercel | Chưa kiểm tra dashboard; không suy luận từ `.env` local |
| Cấu trúc Vercel | Đã có `api/*.js`; `.vercelignore` loại `docs`, `scripts/test`, `scripts/database` và tài liệu `PAWPAL_*.md` |
| Ngân sách R2 | Chưa được xác nhận; không coi hạn mức miễn phí là trần chi tiêu |

Hướng dẫn chính thức: [bắt đầu R2](https://developers.cloudflare.com/r2/get-started/), [bucket công khai và custom domain](https://developers.cloudflare.com/r2/buckets/public-buckets/), [giá và hạn mức](https://developers.cloudflare.com/r2/pricing/). Không dùng `r2.dev` làm điểm phục vụ production; lựa chọn này dành cho phát triển và bị giới hạn tốc độ.

## 7. Kết luận giai đoạn 1

Đã hoàn tất kiểm kê mã nguồn và schema Cloud có phạm vi. Thiết kế ban đầu đã được thay thế bằng [bản thiết kế MongoDB hiện hành](PAWPAL_THIET_KE_MEDIA_MONGODB.md). Các mặc định dung lượng/lưu giữ là đề xuất, chưa phải thay đổi đã áp dụng hoặc thời hạn người dùng phê duyệt. Các quyết định còn mở không tự coi là đã chốt.

Hạ tầng R2 không còn là điều kiện triển khai. Đầu vào mới của giai đoạn 2 là cluster Atlas, database media được phép dùng, database user riêng, cấu hình mạng/URI phía máy chủ và kiểm tra giới hạn trên Vercel. Chưa có thay đổi Cloud, tối ưu ảnh, sửa modal hoặc push trong đợt kiểm kê này.
