# Thiết kế media PawPal với MongoDB Atlas

Ngày: 07/11/2026. Đặc tả hiện hành cho [kế hoạch phiên bản 3](../../PAWPAL_KE_HOACH_LUU_TRU_ANH_VIDEO.md). Chưa có kết nối hoặc kiểm kê Atlas, migration hoặc API mới được triển khai.

## 1. Ranh giới hai CSDL

- Supabase giữ Auth, vai trò và toàn bộ dữ liệu nghiệp vụ. MongoDB chỉ lưu media; không sao chép bảng khách/đơn/lịch để tái dựng phân quyền.
- Chọn GridFS thống nhất cho nội dung ảnh, theo cách 2b trong [hướng dẫn giảng viên](../../Guide-Upload-Images-MongoDB.md). File bản đầu nhỏ hơn 16 MiB vẫn có thể dùng GridFS; đây là lựa chọn thống nhất thao tác, không phải bắt buộc vì kích thước.
- File thật nằm trong `.chunks`, metadata GridFS ở `.files`. Metadata quyền/link nghiệp vụ chuẩn ở Supabase, không tin cờ public do client hoặc Mongo metadata tự khai.
- Không có ràng buộc FK hoặc transaction xuyên Supabase–MongoDB. Cùng là CSDL không có nghĩa tự đồng bộ hoặc xóa cascade giữa hai hệ.
- Public/private là quyết định API và trạng thái nghiệp vụ, không phải tên bucket cho phép truy cập Atlas trực tiếp. Trình duyệt chỉ gọi API PawPal.

## 2. Hợp đồng dữ liệu

### Supabase `media_asset`

| Cột dự kiến | Quy tắc |
|---|---|
| `id uuid` | Khóa chính, định danh bên ngoài cho API |
| `provider text` | CHECK `mongodb_gridfs` trong bản đầu |
| `mongo_file_id text`, `mongo_bucket text` | Định danh GridFS; file ID hợp lệ, UNIQUE cặp bucket/file ID; bucket do server đặt |
| `purpose`, `visibility`, `status` | Enum/check; client không tự chọn public hoặc đánh dấu attached |
| `mime_type`, `size_bytes`, `original_name` | Metadata đã xác minh, tên hiển thị phải escape |
| `sha256`, `version` | Kiểm chứng nội dung và cache theo file bất biến; file mới khi thay ảnh |
| `created_by`, `created_at`, `verified_at` | Danh tính Auth xác thực và thời điểm |
| `retention_until`, `legal_hold` | Ngăn xóa bằng chứng hoặc xóa trước hạn |

Asset statuses: `verified`, `attached`, `pending_delete`, `deleted`, `missing`; session quản lý file trước xác minh. Không lưu URI Atlas, password, binary hoặc Base64 trong Supabase.

### Supabase `media_upload_session`

- Gồm actor, purpose, mục tiêu/draft được phép, request key, byte đặt trước, trạng thái, hạn nháp, file ID dự kiến và asset ID nếu đã chốt.
- `pending` → `uploading` → `verified` → `attached`; có nhánh `failed`, `cancelled`, `expired`. Request lặp cùng nội dung trả kết quả cũ; cùng key khác nội dung trả 409.
- File ID tạo trước được ghi vào session trước khi bắt đầu GridFS, để đối soát kể cả request ngắt trước khi có document `.files`. Không nhận ObjectId bất kỳ từ client làm nguồn file cuối.
- Đối tượng mới dùng draft ID được server cấp/kiểm tra quyền tạo. Khi Lưu phải kiểm tra đúng actor, purpose, draft và đối tượng thật.

### MongoDB

- Database riêng hoặc namespace riêng được người dùng cho phép. Không tự ghi vào collections hiện hữu.
- GridFS bucket dự kiến `pawpalMedia`: `.files`, `.chunks`; index chuẩn GridFS, thêm index metadata theo upload session/asset nếu thực sự cần.
- Metadata chỉ chứa `assetId`, `sessionId`, MIME, hash/size kiểm chứng và thời điểm; tránh tên/email/điện thoại/chủ nuôi.
- Không trả tài liệu chứa binary/chunks trong API danh sách. Danh sách dùng Supabase metadata, file API mới đọc byte.
- File cuối bất biến; không tái dùng ObjectId cho phiên bản khác. Metadata gốc có thể phục vụ đối soát, không cấp quyền độc lập.

### Liên kết nghiệp vụ

- Thêm FK `media_asset_id` vào `product_media`, `product_variant_media`, `service_image`, `care_log_media`, `return_request_evidence`, `review_media`, `support_ticket_message_attachment`.
- `pet_profile` thêm FK avatar, `banner` thêm FK ảnh, `blog_post` thêm FK thumbnail.
- Thêm `appointment_record_media` và `appointment_adjustment_media` với FK thật; không tạo lại bảng tiếp nhận/bàn giao trùng.
- URL cũ nullable khi cần, CHECK đúng một nguồn URL/FK; slot avatar/thumbnail tùy chọn cho phép cả hai trống. Không ghi GridFS ID vào `image_url` rồi dùng trực tiếp làm `src`.
- Quan hệ cuối dùng FK Supabase và RPC từng nghiệp vụ, không dùng entity ID tùy ý từ client. Giữ điều kiện lịch sử NO ACTION phù hợp dự án.

## 3. API Vercel dự kiến

Handler Node.js `api/media.js`, module dùng chung trong `scripts/api/`. Chưa tạo file runtime trong đợt sửa kế hoạch.

| Thao tác | Hợp đồng |
|---|---|
| `prepare` POST | request key, purpose, ID nghiệp vụ/draft; kiểm tra quyền/quota và cấp session |
| `upload` POST multipart | session ID, đúng một file; kiểm tra phiên lại, body/file và nội dung; ghi GridFS, xác minh rồi trả asset ID |
| `GET` theo asset ID/version | Kiểm tra metadata và nghiệp vụ, trả nội dung binary hoặc lỗi; không trả JSON thay ảnh |
| `cancel` POST | Chỉ đúng chủ session hoặc quyền quản lý, không xóa file đã gắn |
| `detach` POST | Đối tượng/slot/phiên bản; gọi RPC nghiệp vụ và đưa vào hàng chờ xóa nếu được phép |

Không có attach endpoint bỏ qua RPC lưu nghiệp vụ. Batch chọn nhiều file được upload tuần tự hoặc giới hạn đồng thời, một file/request, tổng số ảnh kiểm tra lại nguyên tử trong RPC Lưu.

### Giới hạn xử lý

- Request body tối đa **4.000.000 byte**, thấp hơn giới hạn Function 4,5 MB; mỗi file tối đa **3 MiB**, một file/request. Multipart overhead và trường form vẫn tính vào tổng body.
- Giới hạn trong parser khi đọc stream, không đợi tải hết rồi mới kiểm tra `Content-Length`. Kiểm tra tên field, số phần, byte từng phần và tổng byte, xử lý lỗi rõ.
- Xác thực/kiểm tra quyền trước nhận file khi có thể; không dùng diskStorage vào `/uploads`. RAM/stream có giới hạn, kiểm tra magic bytes, MIME thật, kích thước pixel và tài nguyên giải mã.
- Chỉ JPEG/PNG/WebP bản đầu, không nhận SVG/HTML/file thực thi. Ảnh thông thường có thể tạo thumbnail kiểm soát; bằng chứng không nén đè gốc.
- Dùng MongoClient cache/pool trong runtime còn sống; pool nhỏ, timeout connect/read/write và xử lý hủy stream khi client ngắt. Kiểm tra plan Vercel thực trước đặt duration.
- GridFS chunks không tự giải quyết payload từ trình duyệt. File lớn/video cần thiết kế giao thức upload khác và quota riêng, chưa mở trong bản đầu.

## 4. Phân quyền và hiển thị

- Kiểm tra token Supabase thật, context công vụ/trạng thái và sở hữu/phân công hiện hành. Không tin ID hoặc role lưu ở trình duyệt.
- Quản lý sửa ảnh danh mục/cấu hình. Nhân viên chỉ thao tác đúng quyền/ca/đơn/phiếu/hội thoại. Khách chỉ đúng hồ sơ của mình; vãng lai chỉ token gateway có phạm vi/thời hạn.
- Public endpoint chỉ trả asset đã gắn và được phép công bố theo bản ghi gốc. File nháp hoặc đánh giá chờ duyệt không public dù biết ID.
- Private dùng fetch có Authorization hợp lệ rồi `URL.createObjectURL` từ blob. Trình duyệt thu hồi Blob URL khi đổi ảnh/đóng màn hình; không ghi Blob URL vào CSDL hoặc dùng như link bền vững.
- Với private dùng `Cache-Control: private, no-store`, `Vary`/headers phù hợp; không shared cache, không credential trong URL. Phải xác thực trước trả cả nội dung/304/lỗi có thể lộ metadata.
- Public dùng ETag và URL version; kiểm tra trạng thái trước quyết định cache. Chọn TTL ngắn cho nội dung có thể ẩn; mô tả đúng thời gian cache còn hiệu lực khi thu hồi, không hứa chặn bản đã tải.
- Với file mất hoặc chunks không đủ, trả lỗi ảnh phù hợp, đánh dấu đối soát; không trả ảnh nhầm hoặc mock.
- Sửa chính sách `review_media` trước nhận ảnh mới để metadata chờ duyệt không bị đọc anonymous. Giữ bản gốc riêng tư khi ẩn hoặc xử lý đánh giá.

## 5. Nhất quán và dọn file

1. Tạo session và đặt trước quota ở Supabase, sinh Mongo file ID.
2. Ghi GridFS bằng driver có quản lý lỗi. Chỉ sau hoàn tất stream và xác minh metadata/hash mới tạo asset `verified`.
3. RPC Lưu khóa/kiểm tra bản ghi, session và phiên bản, gắn FK và `attached` trong giao dịch Supabase.
4. Nếu GridFS thành công nhưng Supabase lỗi, session/file ID giúp đối soát và thử lại; không công khai file hoặc báo Lưu thành công.
5. Nếu Supabase có metadata nhưng Mongo thiếu file, không trả thành công giả; ghi trạng thái đối soát, giữ ảnh cũ khi thay ảnh chưa commit.
6. Gỡ theo RPC nghiệp vụ; chỉ chuyển `pending_delete` nếu không còn tham chiếu/cờ giữ. Trạng thái này chặn gắn mới để tránh đua với tác vụ xóa.
7. Xóa bằng `GridFSBucket.delete(fileId)` cho file hoàn tất. Không dùng `deleteOne` riêng `.files` hoặc TTL tự xóa metadata.
8. Upload dở có thể chỉ còn chunks. Tác vụ riêng đối chiếu session hết hạn/file ID, chắc chắn không còn upload hoạt động rồi mới dọn; không quét/xóa mọi chunk chưa có `.files` vì có thể đang được ghi.
9. Xóa lỗi có hàng chờ thử lại; không coi mọi lỗi delete là file không tồn tại. Giữ bằng chứng lỗi ở mức metadata an toàn, không chứa URI/credential.

Nháp 24 giờ, file xác minh chưa gắn 7 ngày là đề xuất. File đã gắn và bằng chứng không tự xóa theo tuổi cho tới khi người dùng chốt chính sách. TTL không thay cơ chế cleanup có kiểm tra tham chiếu.

## 6. Quota và dung lượng

- Atlas Free có 512 MB data + indexes. Đề xuất hạn mức byte media 300 MB để chừa metadata, chunks/index và dự phòng; kiểm tra phần dung lượng đang dùng trước khi nhận là áp dụng được.
- Tính gốc, thumbnail, file nháp và reservation upload đồng thời. Theo dõi cả thống kê data/index của database có phạm vi; không chỉ sum độ dài file để kết luận cluster chưa đầy.
- Ảnh hiển thị thông thường hướng tới 200–500 KB khi chất lượng phù hợp. Avatar đề xuất 500 KiB; bằng chứng gốc vẫn tối đa 3 MiB theo luồng Vercel bản đầu, lớn hơn thì báo chưa hỗ trợ thay vì bỏ/nén âm thầm.
- Hết quota báo lỗi rõ, giữ form/ảnh cũ, chặn upload mới; không xóa chứng cứ hoặc mua gói. Không dồn toàn bộ 160 MiB assets vào Atlas.
- Lượt đọc ảnh qua Vercel/Atlas có hạn mức mạng và compute riêng; kiểm tra hạn mức plan và tải thử thật. MongoDB không mặc nhiên cấp CDN ảnh, resize hay phát video nhiều chất lượng.

## 7. Kết nối và bí mật

| Biến dự kiến | Mục đích |
|---|---|
| `PAWPAL_MEDIA_MONGODB_URI` | URI dùng database user riêng, chỉ ở server |
| `PAWPAL_MEDIA_MONGODB_DB` | Database media được phép dùng |
| `PAWPAL_MEDIA_MONGODB_BUCKET` | Bucket GridFS do server đặt |
| `MEDIA_UPLOAD_ENABLED`, `MEDIA_VIDEO_ENABLED` | Thiếu cấu hình thì tắt upload; video mặc định tắt |
| Quota, parser/file limits, timeout/pool | Cấu hình server và hiển thị giới hạn tương ứng |

- Không cần và không nhận tài khoản/mật khẩu đăng nhập Atlas để cấu hình ứng dụng. Người dùng đặt URI trong biến môi trường riêng; không gửi URI thật trong chat.
- DB user quyền tối thiểu trên database media, không dùng admin toàn cluster. URI không được in qua console, error response hoặc endpoint config client.
- Kết nối qua TLS và network access tương thích Vercel. Không tự mở mọi IP (`0.0.0.0/0`); nếu gói hiện tại không có egress cố định, trình bày các lựa chọn và giới hạn trước thay đổi mạng.
- Đã ping Atlas từ Vercel Preview ở giai đoạn 2 và thử GridFS nhỏ ở giai đoạn 3. Chưa xác nhận đầy đủ hạn mức, quyền user và luồng upload Vercel; xem [báo cáo giai đoạn 3](PAWPAL_GIAI_DOAN_3_BO_MEDIA.md).

## 8. Backup, chuyển đổi và nghiệm thu

- Backup Mongo gồm cả `.files`, `.chunks` và cấu hình cần thiết; backup Supabase gồm metadata/quan hệ cùng mốc đối soát. Không tự giả định gói Atlas có backup đủ cho yêu cầu, phải kiểm tra khả năng export/restore thực tế.
- Chuyển 3 avatar Base64 bằng tác vụ riêng: xác minh/ghi/hash/đối chiếu trước cập nhật; không xuất dữ liệu cá nhân vào Git. Chuyển ảnh nhật ký assets cần kiểm tra chia sẻ/tham chiếu trước gỡ public.
- Bộ đọc hỗ trợ legacy + GridFS trước bật ghi. Nghiệm thu tuần tự sản phẩm public và nhật ký private, rồi mới mở rộng từng modal.
- Thử sai quyền, ID đoán được, session cũ, upload lặp, giới hạn 413, quota đầy, chunk thiếu, timeout/mất mạng, lỗi giữa hai DB, xóa còn tham chiếu/cờ giữ và phục hồi.
- Trên Vercel Preview phải chứng minh parser một file hoạt động, ảnh tồn tại qua deploy, private không cache lộ và pool không tạo kết nối không kiểm soát.
- Video không triển khai bằng cách tăng limits của Multer. Cần đánh giá upload client chunk, Range/download, verification, timeout và quota riêng; chưa đáp ứng thì ghi chưa hỗ trợ.
- Quay lui bằng tắt ghi theo nhóm, giữ bộ đọc và metadata/file đã tạo; không rollback phá dữ liệu, không tự push.

## 9. Nguồn

- [Hướng dẫn giảng viên](../../Guide-Upload-Images-MongoDB.md).
- [GridFS Node.js](https://www.mongodb.com/docs/drivers/node/current/crud/gridfs/).
- [Atlas Free limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/), [tier/storage](https://www.mongodb.com/docs/atlas/manage-clusters/).
- [Vercel Function limits](https://vercel.com/docs/functions/limitations).
