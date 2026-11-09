# Giai đoạn 1 — Thiết kế tích hợp media

> ĐÃ ĐƯỢC THAY THẾ. Thiết kế R2 ngừng áp dụng ngày 06/11/2026 vì yêu cầu phương thức thanh toán; phương án trung gian dùng Cloudinary cũng đã ngừng ngày 07/11/2026. Xem [thiết kế MongoDB hiện hành](PAWPAL_THIET_KE_MEDIA_MONGODB.md) và [kế hoạch phiên bản 3](../../PAWPAL_KE_HOACH_LUU_TRU_ANH_VIDEO.md). Nội dung dưới giữ làm lịch sử, không có migration R2 đã áp dụng.

Ngày: 06/11/2026. Kiến trúc: Vercel + Supabase Free + Cloudflare R2. Đây là đặc tả triển khai, chưa phải migration hoặc API đã được cài đặt.

## 1. Quyết định kiến trúc

- Supabase lưu metadata và quan hệ; R2 lưu nội dung. Trình duyệt upload trực tiếp, API Vercel kiểm soát quyền và xác minh file.
- Tách bucket công khai, riêng tư và vùng upload nháp. Bucket nháp luôn riêng tư, khác vị trí file cuối; không upload thẳng vào URL public trước xác minh.
- Dùng khóa ngẫu nhiên không chứa tên, số điện thoại, email, mã tra cứu hoặc tên thú cưng.
- File cuối bất biến: không cấp lại URL PUT cho khóa đã gắn. Khi thay ảnh tạo file mới.
- Có một bộ phân giải media dùng chung cho đường dẫn cũ, URL ngoài và hồ sơ R2; không nhét khóa file vào `src` trực tiếp.
- R2 không mặc nhiên cung cấp chuyển mã video, ảnh thu nhỏ hoặc sao lưu nội dung. Các bước này có tác vụ và ngân sách riêng.

## 2. Ma trận phân loại và quyền

| Nhóm | Nguồn mới | Xem | Tạo/thay | Xóa |
|---|---|---|---|---|
| Sản phẩm/biến thể/dịch vụ/banner/bài viết | URL hoặc upload | Công khai khi nội dung được công bố | Quản lý; Nhân viên không được sửa danh mục/cấu hình mặc định | Quản lý gỡ liên kết; hệ thống chỉ xóa vật lý khi đủ điều kiện |
| Avatar thú cưng | Upload | Chủ hồ sơ, Quản lý, Nhân viên có quyền hồ sơ | Chủ hồ sơ hoặc người có quyền sửa hồ sơ | Theo quyền sửa; giữ ảnh cũ đến khi commit |
| Nhật ký/tiếp nhận/bàn giao | Upload | Chủ ca, Quản lý, Nhân viên trong phạm vi ca | Quyền nghiệp vụ hiện hành và ca được giao; không chỉ dựa vào quyền đọc | Bản đã chốt không cho sửa/xóa tùy ý; ghi phiên bản và audit |
| Bằng chứng phụ phí | Upload | Người có quyền trên ca/đề nghị theo nghiệp vụ | Theo quyền đề nghị hiện có; upload không tự cấp quyền duyệt tiền | Không cho xóa chứng cứ trong xử lý/đã chốt |
| Bằng chứng đổi trả/khiếu nại | Upload | Khách sở hữu và nhân sự được giao xử lý, Quản lý | Chủ yêu cầu hoặc nhân sự có quyền xử lý theo trạng thái | Không xóa tùy ý; dùng cờ giữ bằng chứng |
| Đánh giá chờ duyệt | Upload | Chủ đánh giá và người có quyền duyệt | Khách đúng dòng đơn/ca đủ điều kiện | Chủ chỉ sửa/gỡ khi nghiệp vụ cho phép, không xóa hồ sơ xử lý |
| Đánh giá đã duyệt | File công khai được xuất bản từ bản riêng | Công khai theo trạng thái | Chỉ quy trình duyệt công bố | Ẩn/thu hồi bản public và purge cache theo cấu hình; bản riêng giữ theo chính sách |
| Tệp chat | Upload | Thành viên đúng hội thoại; nhân sự đúng phân công; Quản lý | Theo trạng thái tiếp nhận và quyền gửi tin | Theo chính sách hội thoại, không xóa chỉ do đóng chat |
| Vãng lai | Upload khi luồng nghiệp vụ đã hỗ trợ | Token đúng đối tượng, mục đích và hạn dùng | Token cấp cho đúng đơn/phiếu/hội thoại | Không có quyền xóa chung hoặc tra theo ID tùy ý |

URL public có thể bị sao chép. Không dùng đường dẫn public cho tài liệu cần thu hồi quyền ngay. URL đọc riêng tư có hiệu lực ngắn; việc khóa tài khoản chặn cấp mới nhưng không thu hồi tức thì URL đã cấp.

## 3. Hợp đồng dữ liệu đề xuất

### 3.1. Bảng `media_asset`

| Cột | Ràng buộc / mục đích |
|---|---|
| `id uuid` | Khóa chính |
| `provider text` | Giai đoạn đầu chỉ `r2`; URL ngoài và assets cũ nằm trong cột legacy của bảng nghiệp vụ |
| `bucket text`, `object_key text` | NOT NULL, UNIQUE cặp bucket/key, do máy chủ đặt |
| `purpose text`, `visibility text` | Danh sách giá trị cho phép; khớp nhóm nghiệp vụ, không do client tự chọn public |
| `mime_type text`, `size_bytes bigint`, `original_name text` | Được xác minh trước khi vào trạng thái hợp lệ, tên gốc chỉ để hiển thị an toàn |
| `checksum_sha256 text` | Dấu kiểm nội dung khi xác minh; không suy luận hash nội dung từ ETag multipart |
| `created_by uuid`, `created_at timestamptz`, `verified_at timestamptz` | Danh tính Auth xác thực và thời điểm; không lấy ID từ localStorage làm căn cứ quyền |
| `status text` | `verified`, `attached`, `pending_delete`, `deleted`; file chưa xác minh nằm trong upload session |
| `retention_until timestamptz`, `legal_hold boolean` | Ngăn xóa vật lý sớm; không tự đặt thời hạn hết hạn cho bằng chứng khi chưa được chốt |

Không thêm provider cho URL ngoài trong bảng này ở bản đầu để tránh nhiều nguồn trong một hồ sơ. URL ngoài hợp lệ vẫn giữ trong cột URL hiện tại; một vị trí dữ liệu chọn giữa URL legacy và `media_asset_id` bằng CHECK độc quyền.

### 3.2. Bảng `media_upload_session`

- Gồm ID, request/idempotency key, người tạo, purpose, đối tượng gốc được phép, khóa nháp, hạn upload, hạn giữ nháp, trạng thái và file cuối nếu đã xác minh.
- Trạng thái: `pending` → `uploaded` → `verifying` → `verified` → `attached`; các nhánh `rejected`, `expired` và `cancelled` không được gắn.
- Với đối tượng chưa tạo, đặt ID yêu cầu/draft do máy chủ cho phép; kiểm tra quyền tạo và danh tính, không tạo hàng nghiệp vụ rỗng để lấy quyền upload.
- Request lặp cùng người/nội dung trả cùng kết quả; cùng key nhưng payload khác trả 409.
- Không lưu signed URL, bí mật R2 hoặc payload Base64 vào session.

### 3.3. Liên kết từng bảng

| Bảng | Thay đổi dự kiến |
|---|---|
| `product_media`, `product_variant_media`, `service_image` | Thêm FK `media_asset_id`; URL cũ nullable; CHECK đúng một nguồn; giữ thứ tự và ảnh đại diện |
| `care_log_media` | Thêm FK; nguồn mới bắt buộc R2; tiếp tục metadata tên/kích thước/loại và FK `care_log_id` |
| `return_request_evidence` | Thêm FK và loại media để hỗ trợ ảnh/video; giữ FK yêu cầu đổi trả và thứ tự |
| `review_media` | FK file riêng tư; sửa RLS và gateway để trạng thái chờ duyệt không công khai metadata/file; quản lý riêng bản công bố |
| `support_ticket_message_attachment` | FK file, metadata hiện hữu; cấp đọc theo message → ticket/conversation thực tế |
| `pet_profile` | FK `avatar_media_asset_id`; cho phép cả hai nguồn rỗng, cấm cả hai cùng có giá trị; ảnh mặc định là quyết định hiển thị |
| `banner`, `blog_post` | FK tương ứng cho ảnh/thumbnail; giữ URL ngoài hoặc asset cũ khi chưa đổi |
| `appointment_record` | Tạo `appointment_record_media` nối record → asset, có thứ tự và audit; không tạo bảng tiếp nhận/bàn giao trùng |
| `appointment_adjustment` | Tạo `appointment_adjustment_media` nối đề nghị phụ phí → asset; không sửa logic tiền |

Không dùng một `entity_type/entity_id` tùy ý làm quan hệ cuối vì không bảo đảm FK. Các liên kết phải là khóa ngoại thật, kiểm tra đúng đối tượng gốc, mục đích, danh tính và trạng thái. FK tài liệu lịch sử dùng NO ACTION phù hợp quy tắc dự án.

RPC lưu nghiệp vụ nhận `asset_id` đã xác minh và URL legacy hợp lệ, kiểm tra phiên bản bản ghi, rồi lưu quan hệ cùng trạng thái `attached` trong một giao dịch Supabase. Không cho client tự ghi `attached`. Điều chỉnh các RPC đang nhận mảng URL để không biến ID file thành chuỗi URL.

## 4. API dự kiến trên Vercel

Một handler `api/media.js` điều phối action; mã máy chủ dùng module trong `scripts/api/`. Tên action là thiết kế, cần bổ sung routing và giới hạn phương thức khi thực hiện giai đoạn 3.

| Action | Đầu vào | Kết quả / kiểm tra |
|---|---|---|
| `prepare` — POST | request ID, purpose, loại ID nghiệp vụ cho phép, MIME, kích thước khai báo | Xác thực và kiểm tra quyền, tạo session, cấp PUT ngắn hạn cho key nháp |
| `complete` — POST | upload session ID | HEAD/đọc nội dung xác minh, chốt sang key cuối, tạo hồ sơ asset; thử lại an toàn |
| `cancel` — POST | session ID | Chỉ chủ session hoặc quyền quản lý phù hợp; đánh dấu hủy, không chạm file đã gắn |
| `resolve` — POST | Danh sách asset ID giới hạn số lượng | Kiểm tra quyền từng ID, trả URL public hoặc signed GET, MIME và hạn dùng; không để một ID sai lộ dữ liệu ID khác |
| `detach` — POST | Đối tượng, slot, phiên bản mong đợi | Đi qua RPC đúng nghiệp vụ; không nhận object key tùy ý để xóa |

Không có endpoint attach chung bỏ qua nghiệp vụ: thao tác Lưu dùng RPC theo từng phân hệ. API `detach` cũng phải từ chối bản ghi bị khóa/chốt/giữ chứng cứ. Tác vụ dọn file là nhiệm vụ máy chủ có xác thực riêng, không công khai để trình duyệt tự gọi.

### 4.1. Xác thực và phân quyền

- Xác minh token bằng Supabase Auth; tra ngữ cảnh công vụ hiện tại như luồng `staff_auth.js`/`get_staff_login_context`, không tin vai trò gửi từ client.
- Tái sử dụng các kiểm tra nghiệp vụ như `work_rpc_permission`, `work_owns_appointment` và phạm vi khách/hội thoại đang có. Không dựa duy nhất vào quyền CRUD media.
- API dùng service role phải kiểm tra quyền trước khi chạm file; RPC mới không được cho phép bỏ qua kiểm tra chỉ vì role máy chủ.
- Khách vãng lai tiếp tục cơ chế gateway/token hiện hành; token upload có purpose, ID mục tiêu, hạn và hạn ngạch riêng, không trả khóa bí mật.
- Giới hạn tần suất, số session đang mở, tổng byte dự kiến và quota theo người/mục đích ở máy chủ; kiểm tra lại sau upload.
- Signed PUT có thể dùng lại tới khi hết hạn. File được xác minh phải chuyển sang key cuối chưa từng được cấp PUT; xác minh chính nội dung ở key cuối trước khi đánh dấu hợp lệ. Không chỉ HEAD key nháp rồi tin nội dung không đổi.
- CORS chỉ hỗ trợ trình duyệt; API vẫn phải chống truy cập sai người dù request không đến từ trình duyệt.

### 4.2. Hoàn tất hai kho và xử lý lỗi

1. Tạo session metadata trước; nếu cấp URL lỗi giữ trạng thái có thể thử lại.
2. Upload vào vùng nháp riêng tư; không có liên kết công khai hoặc nghiệp vụ lúc này.
3. Máy chủ chuyển sang key cuối riêng biệt và xác minh nội dung thực tế. Giới hạn tài nguyên xác minh theo gói Vercel; video không xử lý inline vượt khả năng runtime.
4. Tạo asset `verified` sau khi kiểm tra. Với nội dung công khai, chỉ đưa bản đã kiểm tra sang bucket public khi phù hợp trạng thái xuất bản; ảnh đánh giá chờ duyệt luôn ở bucket riêng.
5. RPC Lưu kiểm tra asset/session và bản ghi nghiệp vụ rồi gắn trong một giao dịch.
6. Nếu ghi CSDL lỗi, giữ key cuối làm file chưa gắn chờ thử lại/đối soát. Nếu file R2 mất, không trả lưu thành công; giữ liên kết cũ và báo lỗi.
7. Dọn file dùng trạng thái và thời hạn; luôn tái kiểm tra tham chiếu ngay trước xóa để tránh đua với thao tác Lưu. Khóa trạng thái ở CSDL ngăn gắn mới trong lúc xóa.

## 5. Mặc định giới hạn để triển khai thử

Các con số dưới đây là đề xuất kỹ thuật để bắt đầu thử nghiệm, chưa bật trên production. Nếu người dùng thay đổi thì cập nhật cùng cấu hình máy chủ và giao diện.

| Mục đích | Định dạng | Giới hạn đề xuất |
|---|---|---|
| Avatar | JPEG/PNG/WebP | 1 ảnh, tối đa 5 MiB, chiều dài tối đa 4096px, thêm giới hạn tổng pixel khi giải mã |
| Sản phẩm/biến thể/dịch vụ | JPEG/PNG/WebP | 10 ảnh/đối tượng, 5 MiB/ảnh, tối đa 30 MiB/lần lưu |
| Banner/bìa bài | JPEG/PNG/WebP | 1 ảnh/slot, 5 MiB; banner 1720 × 540px |
| Nhật ký/biên bản/phụ phí | JPEG/PNG/WebP | 5 ảnh/lần, 10 MiB/ảnh gốc, tối đa 30 MiB/lần |
| Khiếu nại/hoàn trả | Ảnh như trên, MP4 | 5 tệp/yêu cầu; ảnh 10 MiB, video 20 MiB và 30 giây, tổng 40 MiB |
| Chat | JPEG/PNG/WebP | Bản đầu 1 ảnh/tin, 5 MiB; chưa bật video chat |
| Đánh giá | JPEG/PNG/WebP | 3 ảnh/đánh giá, 5 MiB/ảnh; chưa bật video đánh giá |

- Bản đầu không nhận SVG/GIF/HTML/PDF do người dùng tải lên, không mở rộng tài liệu tùy ý ngoài ma trận này.
- MP4 cần kiểm tra container/codec tương thích và thời lượng thật phía máy chủ. Chỉ mở video sau khi chứng minh bước xác minh chạy trong giới hạn Vercel; nếu chưa đạt thì chỉ mở ảnh và ghi rõ video chưa nghiệm thu.
- Kích thước pixel, MIME khai báo và đuôi file không thay thế kiểm tra nội dung. Đặt giới hạn tài nguyên giải mã để tránh file nhỏ nhưng ảnh cực lớn.
- Ảnh thương mại có thể tạo WebP/thumbnail. Với bằng chứng, giữ nguyên bản gốc và hash, tạo bản xem trước riêng; xử lý metadata vị trí trên bản công bố khi phù hợp.
- Không tự tải URL ngoài vào máy chủ. URL ngoài mới chỉ HTTPS và độ dài có giới hạn; đường dẫn `assets` được hỗ trợ như nguồn legacy được kiểm soát, không nhận mọi đường dẫn tùy ý.

## 6. Lưu giữ, xóa và ngân sách

- URL PUT thử nghiệm: 5 phút; signed GET riêng tư: 5 phút. Khi sắp hết hạn, chỉ cấp lại sau kiểm tra quyền.
- File nháp: đề xuất dọn sau 24 giờ, chỉ khi session hết hạn và chưa gắn. Không áp lifecycle xóa theo tuổi cho toàn bộ bucket có file nghiệp vụ.
- File cuối chưa gắn: đề xuất giữ tối đa 7 ngày để thử lại/đối soát; luôn kiểm tra không còn tham chiếu trước xóa.
- File đã gắn: **không tự xóa theo tuổi trong bản đầu**. Gỡ ảnh thông thường thì vào hàng chờ, giữ 7 ngày đề xuất trước xóa vật lý; bằng chứng đang xử lý/đã chốt đặt cờ giữ, chưa cho tự xóa.
- Thời hạn lưu bằng chứng sau kết thúc vụ việc, giới hạn tổng dung lượng và ngân sách R2 cần người dùng xác nhận trước khi bật dọn tự động tương ứng. Chưa chốt không đồng nghĩa cho phép xóa hoặc cho upload không giới hạn.
- Sao lưu file gốc và metadata theo cùng mốc. Cache/CDN không phải backup; backup CSDL không bao gồm nội dung R2.
- Giai đoạn 2 xác nhận ngân sách. Đề xuất cảnh báo 50/80/95% quota ứng dụng và chặn upload mới khi chạm quota đã đặt, vẫn cho đọc/xuất dữ liệu; không hứa tổng chi phí tuyệt đối bằng 0.

## 7. Tương thích và chuyển đổi

1. Migration bổ sung cột/bảng; chưa xóa URL cũ. Bộ đọc mới hiểu cả URL legacy và asset ID.
2. Triển khai bộ đọc trước khi bật bộ ghi. Cập nhật mọi màn hình đọc của một nghiệp vụ trước khi chấp nhận file riêng tư trong nghiệp vụ đó.
3. Sản phẩm là luồng đầu tiên, nhật ký là luồng thứ hai. Mỗi modal sửa/kiểm tra/nghiệm thu riêng theo `AGENTS.md`.
4. Avatar Base64 cũ: đọc có phạm vi trong tác vụ chuyển đổi riêng, giải mã và xác minh, upload R2, đối chiếu rồi thay cột; không xuất nội dung ra tài liệu/Git.
5. Nhật ký `assets` cũ: kiểm tra file thật, tính riêng tư, các tham chiếu dùng chung, rồi chuyển. Không xóa ảnh dùng cho trang công khai khác theo tên thư mục.
6. RLS `review_media` và đường dẫn public phải sửa trước khi nhận ảnh chờ duyệt. Khi ẩn đánh giá đã công bố, ngừng cấp URL, gỡ bản public và xử lý cache theo cơ chế triển khai; không hứa thu hồi bản đã được tải về.
7. Mã quay lui phải đọc được asset ID hoặc bộ phân giải tiếp tục hoạt động; tắt upload mới không làm hỏng ảnh đã lưu. Không rollback schema phá dữ liệu.

## 8. Đầu vào giai đoạn 2 và quyết định còn mở

Đã xác nhận người dùng chưa có tài khoản Cloudflare/chưa bật R2. Tên miền và ngân sách chưa xác nhận, nên không có cấu hình giả được coi là production.

| Cấu hình cần chuẩn bị | Vị trí |
|---|---|
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Vercel server environment; không xuất qua `/api/admin-config` |
| `R2_BUCKET_STAGING`, `R2_BUCKET_PUBLIC`, `R2_BUCKET_PRIVATE` | Tách preview/production; staging luôn private |
| `MEDIA_PUBLIC_BASE_URL` | URL media công khai production, không dùng `r2.dev` |
| `MEDIA_ALLOWED_ORIGINS` | Origin website thực và preview được chọn; không CORS wildcard tùy tiện |
| `MEDIA_UPLOAD_ENABLED`, `MEDIA_VIDEO_ENABLED` | Mở theo từng nhóm đã nghiệm thu; mặc định tắt khi thiếu cấu hình |
| Giới hạn file/quota và dọn file | Cấu hình máy chủ, không chỉ kiểm tra client |
| Thông tin Supabase | Tái sử dụng biến đang dùng cho Cloud hiện hành sau kiểm tra, không quay về project cũ |

- Nếu chưa có tên miền media, chỉ thử trên môi trường phát triển hoặc dùng signed GET/gateway đã xác thực; chưa nghiệm thu đường dẫn public production.
- Custom domain media và CORS không yêu cầu chuyển hosting website khỏi Vercel. Cần xác nhận quyền quản lý DNS phù hợp lúc cấu hình.
- Kích hoạt R2 có bước thiết lập subscription/thanh toán; chủ tài khoản tự thực hiện thông tin tài chính. Không gửi khóa hoặc thông tin thẻ trong chat.
- Xác nhận ngân sách/quota và thời hạn lưu bằng chứng trước bật chính sách tốn phí/xóa tương ứng.
- Kiểm tra gói Vercel, runtime và lịch tác vụ thực tế trước chọn cách xác minh video, tạo thumbnail và dọn file. Không giả định cron tần suất cao luôn có sẵn.

## 9. Tiêu chí chuyển sang giai đoạn 3

- Tài khoản/bucket/khóa, origin, phương án URL và ngân sách/quota đã được cấu hình cụ thể.
- Upload nháp → xác minh → file cuối được thử trên Vercel Preview; file riêng tư không truy cập bằng URL public.
- Giới hạn và khả năng kiểm tra ảnh/video được xác nhận bằng thử nghiệm, không suy luận từ upload thành công.
- Có thiết kế migration khớp schema Cloud mới nhất, cùng checklist quyền cho cả Quản lý/Nhân viên/khách/vãng lai.

## 10. Tài liệu chính thức

- [Đường dẫn ký có thời hạn R2](https://developers.cloudflare.com/r2/api/s3/presigned-urls/): cấp quyền tạm thời cho thao tác trên một object.
- [CORS R2](https://developers.cloudflare.com/r2/buckets/cors/): upload trực tiếp từ trình duyệt cần origin phù hợp.
- [Bucket public](https://developers.cloudflare.com/r2/buckets/public-buckets/): custom domain và giới hạn môi trường `r2.dev`.
- [Khởi tạo R2](https://developers.cloudflare.com/r2/get-started/) và [giá hiện hành](https://developers.cloudflare.com/r2/pricing/): đối chiếu lại khi kích hoạt tài khoản.
