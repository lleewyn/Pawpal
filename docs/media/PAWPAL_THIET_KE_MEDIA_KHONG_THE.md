# Thiết kế media không yêu cầu thẻ thanh toán

> ĐÃ ĐƯỢC THAY THẾ ngày 07/11/2026 theo yêu cầu bỏ Cloudinary. Không tạo tài khoản/preset Cloudinary hoặc bucket Supabase Storage theo tài liệu này. Xem [thiết kế MongoDB Atlas hiện hành](PAWPAL_THIET_KE_MEDIA_MONGODB.md). Nội dung dưới chỉ giữ làm lịch sử; chưa có triển khai Cloudinary để cần gỡ khỏi runtime.

Cập nhật 06/11/2026. Đặc tả hiện hành thay thế [thiết kế R2](PAWPAL_GIAI_DOAN_1_THIET_KE_MEDIA.md). Chưa áp dụng schema, tạo tài khoản Cloudinary hoặc sửa chức năng website.

## 1. Lựa chọn dịch vụ

| Nội dung | Nơi lưu | Phạm vi |
|---|---|---|
| Logo/trang trí, ảnh cũ | `assets` trên bản triển khai Vercel | Công khai theo tình trạng hiện có; rà soát ảnh nghiệp vụ cần chuyển private |
| Sản phẩm, biến thể, dịch vụ, banner, bài viết | Cloudinary Free | Chỉ nội dung đã được phép công khai |
| Avatar, nhật ký, biên bản, bằng chứng, chat | Supabase Storage private | Theo chủ sở hữu, ca/đơn/hội thoại được giao và vai trò |
| Đánh giá chờ duyệt | Supabase Storage private | Chủ đánh giá và người được quyền duyệt |
| Đánh giá đã duyệt | Bản public riêng trên Cloudinary | Công khai theo trạng thái công bố |
| Metadata và liên kết | Supabase PostgreSQL | RLS/RPC và FK nghiệp vụ |

Không yêu cầu kích hoạt R2 hoặc tên miền CDN riêng. Cloudinary Free cho đăng ký không cần thẻ, có 25 credits dùng chung cho storage/transformations/bandwidth; không phải dung lượng lưu độc lập 25 GB. Supabase vẫn giới hạn 1 GB file và lưu lượng Free. Phương án không hứa đáp ứng video thường xuyên hoặc dữ liệu tăng vô hạn.

Nguồn: [Cloudinary Free](https://cloudinary.com/documentation/developer_onboarding_faq_free_plan), [credits](https://cloudinary.com/documentation/billing_and_plans), [Storage Supabase](https://supabase.com/docs/guides/storage/pricing).

## 2. Những phần giữ nguyên

- Dùng bảng nghiệp vụ hiện có, FK thật, một nguồn hiệu lực cho từng slot; không dùng `entity_type/entity_id` tùy ý làm quan hệ cuối.
- Ma trận quyền trong thiết kế cũ tiếp tục áp dụng: Quản lý quản lý danh mục/cấu hình; Nhân viên xử lý đúng phạm vi; khách/vãng lai chỉ dùng đúng đối tượng được xác thực.
- Dùng `appointment_record` và quan hệ media mới cho tiếp nhận/bàn giao; `appointment_adjustment` cho bằng chứng phụ phí.
- Hồ sơ tiêm phòng chưa có hợp đồng lưu tương ứng vẫn hoãn; không tạo thêm nghiệp vụ đã bị loại.
- Xử lý lỗi liên kho, idempotency, kiểm tra trước gắn/xóa, giữ bằng chứng và sao lưu metadata/file riêng.
- Kiểm kê Cloud đã làm vẫn là bằng chứng lịch sử; chưa có kết quả Cloud hoặc E2E mới chỉ vì đổi kế hoạch.

## 3. Hồ sơ dữ liệu cập nhật

### `media_asset`

| Trường | Quy tắc |
|---|---|
| `id` | UUID khóa chính |
| `provider` | `cloudinary` hoặc `supabase_storage` |
| `visibility`, `purpose` | Do máy chủ quyết định; `cloudinary` bản đầu chỉ dùng public |
| `bucket`, `object_key` | Bắt buộc riêng với provider Supabase, cấm client tự chọn |
| `cloudinary_asset_id`, `public_id`, `resource_type`, `delivery_type`, `version` | Bắt buộc phù hợp provider Cloudinary; đủ để kiểm chứng, dựng URL và xóa đúng tài nguyên |
| `mime_type`, `size_bytes`, `original_name` | Metadata đã xác minh; escape tên khi hiển thị |
| `checksum_sha256` | Cho file cần kiểm chứng, đặc biệt bằng chứng gốc; không dùng ETag làm hash nội dung mặc định |
| `status` | `verified`, `attached`, `pending_delete`, `deleted`; trạng thái upload trước xác minh ở session |
| `created_by`, thời điểm | Danh tính Auth đã xác thực; không tin user ID từ trình duyệt |
| `retention_until`, `legal_hold` | Chặn xóa trước hạn/đang giữ bằng chứng |

CHECK theo provider phải ngăn cả hai nhóm vị trí cùng có dữ liệu hoặc thiếu vị trí bắt buộc. UNIQUE provider/khóa định danh. Không lưu API secret, token upload hoặc signed URL trong hồ sơ.

### `media_upload_session`

- Lưu người tạo, purpose, đối tượng/draft được phép, request ID, provider do server chọn, khóa nháp, thời hạn, số byte dự kiến và trạng thái.
- Request lặp trả cùng kết quả; cùng key khác payload trả 409. Session giới hạn số lượng đang mở và tổng byte đặt trước.
- Trạng thái dự kiến `pending` → `uploaded` → `verifying` → `verified` → `attached`, có nhánh hủy/lỗi/hết hạn. Không gắn session chưa xác minh.
- Đối tượng mới dùng draft ID được kiểm tra quyền tạo; khi commit phải xác minh draft và FK đối tượng thật cùng danh tính/mục đích.

### Liên kết nghiệp vụ

- `product_media`, `product_variant_media`, `service_image`, `care_log_media`, `return_request_evidence`, `review_media`, `support_ticket_message_attachment`: thêm FK `media_asset_id`, giữ metadata/thứ tự hiện hữu.
- `pet_profile`: `avatar_media_asset_id`; `banner`: `image_media_asset_id`; `blog_post`: `thumbnail_media_asset_id`. Đây là tên cột dự kiến cho migration, chưa tồn tại được xác nhận trên Cloud.
- Các cột URL cũ nới NOT NULL khi thích hợp và có CHECK độc quyền URL/FK; slot không bắt buộc cho phép cả hai trống.
- Thêm `appointment_record_media`, `appointment_adjustment_media` với FK thật và audit. Giữ constraint lịch sử NO ACTION phù hợp dự án.
- Cập nhật RPC cũ đang nhận mảng URL để nhận asset ID đã xác minh, không chuyển asset ID thành chuỗi URL giả.

## 4. Adapter và API

API đề xuất `api/media.js` điều phối `prepare`, `complete`, `resolve`, `cancel`, `detach`; module máy chủ nằm trong `scripts/api/`. Chưa thêm file API trong lần điều chỉnh này.

### Cloudinary công khai

1. API xác thực quyền sửa nội dung và kiểm tra purpose cho phép public; cấp chữ ký upload theo SDK chính thức, giới hạn preset/định dạng/kích thước/khóa do server đặt.
2. Trình duyệt upload trực tiếp. Không lộ API secret, không dùng unsigned preset mở chung; chữ ký upload không phải một URL PUT của R2.
3. API kiểm chứng chữ ký phản hồi và metadata dịch vụ, đúng public ID, version, resource/delivery type, người tạo session và giới hạn. Không tin URL/counters client tự gửi.
4. File cuối không ghi đè. Không cấp chữ ký overwrite cho key đã gắn; nếu cần staging/final, chốt sang định danh chưa cấp quyền upload và xác minh bản cuối. Thiết kế replay/overwrite được thử theo API Cloudinary thực tế trước nghiệm thu.
5. Sau xác minh mới gắn vào bản ghi. Public upload có thể được truy cập bằng URL dù chưa gắn; chỉ cho nội dung được phép public, không dùng cho tài liệu chờ duyệt hoặc hồ sơ cá nhân.
6. Thumbnail dùng danh sách biến đổi cố định, không mở biến đổi tùy ý gây tăng credits. Hủy/xóa theo định danh server đã lưu, không nhận public ID bất kỳ từ client.

### Supabase Storage riêng tư

1. Tạo bucket nháp và bucket cuối đều private, khóa ngẫu nhiên không chứa PII.
2. API cấp quyền upload đúng session sau xác thực. RLS `storage.objects` không cho ghi/read/list mọi file; kiểm tra hiệu lực token và quyền ghi đè theo SDK thực tế.
3. Upload trực tiếp; máy chủ đọc metadata và kiểm tra nội dung. Chuyển/chốt sang key cuối bất biến chưa được cấp token upload; xác minh chính nội dung cuối rồi tạo asset.
4. RPC Lưu kiểm tra quyền trên ca/đơn/hồ sơ, phiên bản, purpose và session, gắn FK cùng trạng thái trong giao dịch.
5. `resolve` kiểm tra từng asset/bản ghi trước cấp signed GET; mục tiêu URL đọc 5 phút. Phản hồi cấp URL private dùng `no-store`; thời hạn upload không tự giả định là 5 phút.
6. Tắt upsert/overwrite của file đã gắn. API service role không được bỏ qua phạm vi người gọi. Không tự bật bucket public để sửa lỗi xem ảnh.

Storage và PostgreSQL cùng nhà cung cấp vẫn không tạo một giao dịch chung với object. Lỗi giữa các bước cần giữ trạng thái có thể thử lại, đối soát và dọn file chưa gắn; không báo thành công giả.

Tài liệu: [RLS Storage](https://supabase.com/docs/guides/storage/security/access-control), [đọc private](https://supabase.com/docs/guides/storage/serving/downloads), [Cloudinary upload](https://cloudinary.com/documentation/image_upload_api_reference).

## 5. Đánh giá và thu hồi bản công khai

- Trước khi nhận ảnh đánh giá, sửa `review_media` SELECT đang có điều kiện `true`, cùng gateway và bộ đọc; người không có quyền không được thấy file/metadata chờ duyệt.
- Giữ bản gốc private; khi duyệt tạo bản public đã kiểm tra và lưu liên kết tới phiên bản công bố. Việc xuất bản phải thử lại an toàn nếu provider thành công nhưng cập nhật DB thất bại.
- Ẩn đánh giá thì ngừng trả URL và đưa bản public vào quy trình thu hồi/xử lý cache; không xóa bằng chứng gốc private theo thao tác ẩn.
- Trạng thái xuất bản public và trạng thái nghiệp vụ là hai bước cần đối soát; không cho publish chỉ vì upload thành công.

## 6. Giới hạn và lưu giữ đề xuất

| Nhóm | Mặc định thử nghiệm |
|---|---|
| Ảnh công khai | JPEG/PNG/WebP, 5 MiB/file, tối đa 10 ảnh/đối tượng và 30 MiB/lần |
| Avatar | Một ảnh, 3 MiB/file |
| Nhật ký/biên bản/chat | 3 MiB/ảnh thông thường; tối đa 5 ảnh/lần, chat một ảnh/tin |
| Bằng chứng | Gốc tối đa 10 MiB/ảnh, 5 ảnh/yêu cầu, tổng 30 MiB; không nén đè gốc |
| Đánh giá | 3 ảnh/đánh giá, 3 MiB/ảnh, private trước duyệt |
| Video | Chưa bật ở bản đầu; không quảng cáo như tính năng đã có |
| Tổng private | Đề xuất 500 MB gồm gốc/preview/nháp, quota server cần xác nhận |

- Giới hạn chiều ảnh, tổng pixel và tài nguyên giải mã ở máy chủ; không chỉ kiểm đuôi/MIME do client gửi. Bản đầu không nhận SVG/GIF/HTML/PDF tùy ý từ người dùng.
- URL ngoài công khai chỉ HTTPS hoặc assets legacy được kiểm soát; không fetch URL tùy ý từ máy chủ. Sai URL không fallback dữ liệu giả.
- Mục tiêu bản xem thông thường khoảng 200–500 KB khi chất lượng phù hợp; không coi đây là giới hạn cho bằng chứng gốc và không hứa mọi ảnh đều đạt cùng mức.
- Nháp hết hạn: đề xuất 24 giờ; file xác minh chưa gắn: 7 ngày, kiểm tra tham chiếu và khóa trạng thái trước xóa. File đã gắn/bằng chứng không tự xóa theo tuổi khi chính sách chưa được xác nhận.
- Quota server phải tính cả session đặt trước, upload đồng thời, file nháp, file bị từ chối đang chờ dọn và bản xem trước. Quota không thể giới hạn tuyệt đối mọi byte tải trái phép bằng token còn hiệu lực, cần đối soát sớm.
- Cảnh báo theo mức sử dụng, chặn upload khi chạm quota; không nâng gói, không chuyển private sang public, không xóa bằng chứng để giải phóng chỗ.
- Không hứa hạn chế upload sẽ ngăn hết lưu lượng CDN. Nếu Cloudinary gần/vượt credits phải có phương án vận hành thông báo và giảm phát sinh biến đổi/lưu lượng hợp lệ, không tự mua thêm.

## 7. Biến môi trường và điều kiện triển khai

| Cấu hình | Cách dùng |
|---|---|
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Server Vercel; API secret tuyệt đối không xuất client |
| Preset và namespace Cloudinary | Do server kiểm soát, không mở preset unsigned |
| `MEDIA_PRIVATE_STAGING_BUCKET`, `MEDIA_PRIVATE_BUCKET` | Supabase private, tách môi trường phù hợp hạn mức hiện có |
| Supabase URL/key | Tái sử dụng Cloud hiện hành sau kiểm tra; service role chỉ ở server |
| `MEDIA_UPLOAD_ENABLED`, `MEDIA_VIDEO_ENABLED` | Tắt khi thiếu cấu hình; video mặc định tắt |
| Origin production/preview | Lấy đúng cấu hình website, không wildcard tùy tiện; CORS không thay thế quyền |
| Quota/giới hạn file/lịch dọn | Cấu hình server; kiểm tra gói Vercel trước chọn lịch tác vụ |

- Chưa có tài khoản Cloudinary được xác nhận. Tạo tài khoản Free không yêu cầu thẻ là đầu vào tiếp theo; không yêu cầu gửi bí mật trong chat.
- Không bắt buộc tên miền riêng vì có CDN Cloudinary. Không cần tiếp tục checkout Cloudflare; tài khoản Cloudflare có thể giữ nguyên, không tự xóa.
- Supabase bucket hiện chưa được tạo trong đợt này. Các preset, chính sách, biến môi trường và quota thực tế đều phải được thử trên Vercel Preview trước bật production.
- Chi phí gói Vercel hiện hữu và điều kiện sử dụng của từng nhà cung cấp vẫn theo tài khoản thực tế; kế hoạch không bảo đảm tổng chi phí website vĩnh viễn bằng 0.

## 8. Chuyển đổi và nghiệm thu

- Bộ đọc mới hỗ trợ hai provider và URL cũ trước khi bật ghi; không làm các màn hình cũ dùng asset ID làm `src`.
- Từng modal nghiệm thu riêng. Hai ca đầu: sản phẩm public trên Cloudinary, nhật ký private trên Supabase.
- Chuyển avatar Base64 và nhật ký assets bằng tác vụ riêng có hash/đối chiếu, không đổi URL cũ trước khi file mới sẵn sàng. Không xóa tài nguyên còn dùng chung.
- Thử sai quyền, hết token, token dùng lại, quota/file giả, lỗi mạng, provider thành công nhưng DB lỗi, giữ nháp, thay/xóa ảnh, phát hành/ẩn đánh giá, tải lại và phục hồi.
- Video chỉ được bật sau một vòng thiết kế/thử riêng chứng minh hạn mức đủ và xác minh nội dung chạy trong giới hạn Vercel. Free không đủ thì báo giới hạn, không tự mua dịch vụ.
- Quay lui bằng tắt ghi theo nhóm, giữ bộ đọc và metadata/file đã tạo; không rollback schema phá dữ liệu.
