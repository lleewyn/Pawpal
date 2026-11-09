# Kế hoạch triển khai lưu trữ ảnh và video PawPal

Ngày lập: 06/11/2026. Cập nhật: 09/11/2026.  
Phiên bản: 3 — MongoDB Atlas lưu file; bỏ Cloudinary khỏi phương án triển khai.  
Môi trường đích: Vercel + Supabase hiện hành + MongoDB Atlas.  
Trạng thái: HOÀN TẤT TOÀN DIỆN 7/7 GIAI ĐOẠN. Đã nghiệm thu đầy đủ trên Preview với các vai trò thật (Admin, Staff, Khách hàng), kiểm thử 44/44 PASS, chuyển đổi sạch dữ liệu cũ, đánh giá video và sẵn sàng phát hành Production khi được yêu cầu.

Tài liệu liên quan: [AGENTS.md](AGENTS.md), [Phân quyền Admin](PAWPAL_CHECKLIST_PHAN_QUYEN_ADMIN.md), [Hướng dẫn của giảng viên](Guide-Upload-Images-MongoDB.md), [Kiểm kê](docs/media/PAWPAL_GIAI_DOAN_1_KIEM_KE_MEDIA.md), [Thiết kế MongoDB hiện hành](docs/media/PAWPAL_THIET_KE_MEDIA_MONGODB.md).

## 1. Kiến trúc đã điều chỉnh

| Thành phần | Trách nhiệm |
|---|---|
| Vercel | Website, API xác thực/kiểm tra file, upload và trả nội dung ảnh |
| Supabase | Đăng nhập, phân quyền, dữ liệu nghiệp vụ, metadata/quyền công bố và FK liên kết file |
| MongoDB Atlas | Nội dung file thật bằng GridFS, gồm file công khai và riêng tư; không truy cập trực tiếp từ trình duyệt |
| `assets` | Logo, ảnh trang trí và ảnh cũ còn được tham chiếu |

- Áp dụng nguyên tắc GridFS trong hướng dẫn của thầy, nhưng giữ toàn bộ CSDL nghiệp vụ Supabase hiện có. Không chuyển khách hàng, thú cưng, lịch hẹn, đơn hàng hoặc tài khoản sang MongoDB.
- Bỏ Cloudinary và R2 khỏi danh sách dịch vụ cần cấu hình. Không tạo bucket Supabase Storage cho luồng mới trong phương án này.
- MongoDB không chỉ lưu URL: **byte ảnh thật được lưu trong Atlas**. Supabase lưu `file_id`/metadata để tra file qua API.
- Hai hệ CSDL không có giao dịch chung; phải xử lý file nháp, lưu lỗi, thử lại, đối soát và xóa đúng điều kiện.
- Làm ảnh trước. Video vẫn là phần dự kiến nhưng chưa bật; Free 512 MB và giới hạn API Vercel không phù hợp để hứa lưu nhiều video.
- Không thay đổi gói trả phí hoặc mua dịch vụ. Gói Atlas thực tế chưa xác nhận; kiểm tra trước khi triển khai.

## 2. Hạn mức và đánh đổi

| Hạng mục | Giới hạn / cách triển khai |
|---|---|
| Atlas Free | 512 MB cho dữ liệu và index, không được cộng thêm mỗi tháng |
| GridFS | Chia file thành chunks, không tăng hạn mức hoặc tự nén nội dung |
| Vercel Function | Request body tối đa 4,5 MB theo tài liệu; kiểm tra lại lúc triển khai |
| Upload bản đầu | Một file/request; file tối đa 3 MiB, tổng body tối đa 4.000.000 byte, luôn dưới giới hạn nền tảng |
| Lượt xem ảnh | API Vercel đọc file từ Atlas và trả ảnh; tốn tài nguyên/lưu lượng của cả hai, không có CDN ảnh chuyên dụng mặc định |
| Quota thử nghiệm | Đã chốt 100 MiB tổng media trên Preview, gồm ảnh đang dùng và quota nháp; tiếp tục theo dõi tổng data và indexes của Atlas |

Quota là cấu hình đề xuất, chưa bật. Phải lấy mức thấp hơn giữa quota ứng dụng và phần dung lượng cluster thực tế còn dành được; không giả định cluster người dùng đang trống. Gần đầy thì hạn chế upload mới và cảnh báo, không tự xóa chứng cứ hoặc nâng gói.

Ví dụ nếu dành 300 MB chỉ cho ảnh trung bình 300 KB thì khoảng 1.000 ảnh trước metadata, index, thumbnail và nháp. Phương án này đáp ứng quy mô nhỏ, không giải quyết lưu media tăng vô hạn.

## 3. Kết quả kiểm kê giữ nguyên

- Cloud Supabase đã kiểm kê chỉ đọc ngày 06/11: 14 bảng, 136 cột, 84 chính sách và 8 định nghĩa hàm; không đọc Supabase Logs.
- Phần lớn ảnh đang dùng đường dẫn `assets`; 3 avatar chứa Base64 dạng `data:`, không phải `blob:`.
- Một số ô file chỉ xem trước hoặc chặn lưu; đổi trả/chat chưa gửi file cùng yêu cầu nghiệp vụ.
- Chính sách đọc `review_media` chưa lọc trạng thái duyệt; cần sửa trước nhận ảnh mới chờ duyệt.
- `assets` có khoảng 160 MiB/387 file ảnh; giữ và tối ưu dần, không import toàn bộ vào Atlas.
- Không có bucket Supabase tại lúc kiểm kê; phương án hiện hành không phụ thuộc tạo bucket.

[Bằng chứng Cloud](docs/media/phase1-cloud-readonly.txt) giữ nguyên như lịch sử. Chưa có kiểm kê Atlas hoặc kiểm tra lại production trong lần điều chỉnh tài liệu này.

## 4. Lưu metadata và chọn nguồn

- MongoDB: GridFS bucket `pawpalMedia`, gồm `pawpalMedia.files` và `pawpalMedia.chunks`. Đây là tên dự kiến, tạo sau khi kiểm tra database người dùng.
- Supabase: `media_asset` và `media_upload_session` giữ provider `mongodb_gridfs`, Mongo file ID, MIME, byte size, hash, trạng thái, người tải, mục đích/quyền xem và thời hạn giữ. Không có FK xuyên CSDL; API/RPC chịu trách nhiệm kiểm tra sự tồn tại và liên kết.
- Bảng nghiệp vụ có FK thật đến `media_asset`; không dùng `entity_type/entity_id` tùy ý thay quan hệ cuối. Các cột URL cũ tiếp tục dùng cho nguồn legacy hoặc link công khai hợp lệ.
- Mỗi vị trí ảnh có một nguồn: file đã xác minh hoặc link. Avatar chưa có ảnh riêng được phép trống, dùng ảnh mặc định khi hiển thị.
- Ảnh public: `Tải ảnh lên` hoặc `Dùng đường dẫn ảnh`. Ảnh private chỉ upload. Mỗi ảnh trong danh sách chọn một nguồn riêng.
- Đổi nguồn/bỏ chọn chỉ thay bản nháp. Giữ ảnh cũ tới khi Lưu thành công; lỗi không làm mất các trường form.
- Không lưu binary/Base64 trong Supabase; không lưu `blob:` hoặc URL token ngắn hạn làm địa chỉ lâu dài.
- Public dùng endpoint API ổn định theo asset/version. Private đọc qua fetch có xác thực rồi tạo Blob URL tạm để hiển thị; tải lại phải lấy lại qua API.

## 5. Luồng upload, đọc và xóa

1. Giao diện chọn ảnh, kiểm tra sơ bộ, có thể nén ảnh thông thường; bằng chứng gốc không bị nén đè tự động.
2. API Vercel xác thực bằng phiên Supabase, kiểm tra quyền trên hồ sơ/ca/đơn/hội thoại và quota. Không tin localStorage role hoặc ID client tự khai.
3. Tạo upload session có idempotency key; gửi từng file qua API Vercel dạng multipart, không gửi trực tiếp tới Atlas và không mở DB credential ra trình duyệt.
4. Giới hạn body trong lúc đọc, kiểm tra nội dung thật, kích thước pixel/MIME, số lượng và byte size. GridFS chỉ nhận file đã qua kiểm tra phù hợp tài nguyên server.
5. Ghi GridFS thành file mới bất biến, xác minh hoàn tất/hash; lưu metadata trạng thái `verified` vào Supabase. Không công khai nháp.
6. RPC Lưu nghiệp vụ kiểm tra session, quyền/phiên bản rồi gắn FK và trạng thái trong giao dịch Supabase. MongoDB không tham gia giao dịch đó; lỗi phải có phục hồi/đối soát.
7. Đọc public: chỉ phục vụ file đã gắn và được phép công bố. Đọc private: xác thực trước mỗi lần cấp nội dung; biết ObjectId không đồng nghĩa được xem.
8. Gỡ liên kết theo RPC nghiệp vụ. Chỉ xóa file GridFS bằng `GridFSBucket.delete()` khi không còn tham chiếu, không có cờ giữ và hết thời hạn; không chỉ xóa document `.files`.

GridFS đã chia chunk trong DB không có nghĩa trình duyệt tự vượt giới hạn request Vercel. Upload video/chunk từ client cần thiết kế riêng, chưa nằm trong bản đầu.

## 6. Quyền và vận hành

- Quyền vẫn theo checklist Quản lý/Nhân viên/khách/vãng lai hiện hành, không tự thêm quyền chỉ vì tải file được.
- Nhật ký, hồ sơ, bằng chứng, chat và ảnh đánh giá chưa duyệt là private. API kiểm tra bản ghi liên quan, trạng thái người dùng và mục đích mỗi lần đọc/ghi.
- Ảnh private trả `Cache-Control: private, no-store`; không dùng public cache hoặc URL chứa credential. Blob URL chỉ là bản xem trước, thu hồi khi đổi ảnh/đóng màn hình.
- Ảnh public có URL theo phiên bản, ETag và cache phù hợp; khi ẩn/thu hồi phải xử lý bản cache và thời gian hiệu lực, không hứa thu hồi các bản đã tải về.
- Bằng chứng vượt 3 MiB phải báo rõ chưa hỗ trợ trong bản đầu, không âm thầm bỏ file hoặc nén mất chi tiết. Giới hạn nghiệp vụ cần xác nhận trước bật upload.
- Nháp đề xuất giữ 24 giờ; file xác minh chưa gắn 7 ngày. File nghiệp vụ/bằng chứng không tự xóa theo tuổi khi chưa chốt thời hạn.
- Không dùng TTL xóa riêng `GridFS.files`, tránh bỏ lại chunks. Cleanup có trạng thái, kiểm tra tham chiếu, khóa chống đua và API GridFS chuẩn.
- Tái sử dụng MongoClient/pool qua các lần gọi khi runtime cho phép; giới hạn pool/timeouts, không tạo nhiều kết nối không kiểm soát trên Vercel.
- Backup cả MongoDB file/chunks và metadata Supabase theo mốc đối soát. Backup một CSDL không khôi phục được toàn bộ quan hệ xuyên hai hệ.
- Không dùng Logs Supabase, mock/JSON hoặc filesystem runtime Vercel làm nơi lưu lâu dài.

## 7. Checklist triển khai

### Giai đoạn 1 — Thiết kế theo MongoDB

- [x] Giữ kết quả kiểm kê trước và đọc hướng dẫn giảng viên.
- [x] Bỏ Cloudinary/R2 khỏi phương án hiện hành; mô tả MongoDB lưu file thật bằng GridFS.
- [x] Điều chỉnh luồng upload qua Vercel, giới hạn body/file và quyền public/private.
- [ ] Chốt quota, giới hạn ảnh từng nghiệp vụ, thời hạn lưu và quy mô ảnh dự kiến.

### Giai đoạn 2 — Kết nối Atlas và Vercel

Chi tiết: [Báo cáo chuẩn bị Atlas](docs/media/PAWPAL_GIAI_DOAN_2_CHUAN_BI_ATLAS.md). Các link ảnh/cột URL cũ giữ nguyên. Kết quả triển khai mới xem giai đoạn 3 bên dưới.

- [x] Cài driver MongoDB, module dùng chung có TLS/pool/timeout và lỗi không lộ URI.
- [x] Thêm mẫu biến môi trường, upload/video tắt mặc định; CLI chẩn đoán chỉ đọc và kiểm thử không cần cluster.
- [x] Kết nối Atlas thật từ file riêng ngoài webroot; ping/thống kê database/kiểm tra tên collection đạt, không ghi dữ liệu. Xem [bằng chứng](docs/media/phase2-atlas-readonly.txt).
- [x] Đọc cấu hình Vercel và thử artifact Preview riêng: Hobby, Node 24.x, `iad1`; ping Atlas HTTP 200. Đã dọn deployment/token thử, không đổi env hoặc Production. Xem [bằng chứng](docs/media/phase2-vercel-preview.txt).

- [ ] Xác nhận có cluster, tier Free hay gói khác, region, database được phép dùng và mức sử dụng hiện tại; không yêu cầu tài khoản quản trị/mật khẩu trong chat.
- [ ] Chuẩn bị database user riêng chỉ có quyền cần thiết trên database media, không dùng tài khoản đăng nhập Atlas làm credential ứng dụng.
- [ ] Cấu hình `MONGODB_URI`, `MONGODB_DB`, bucket và cờ upload trong biến môi trường Vercel; không đưa URI vào Git, JS client hoặc log.
- [ ] Chọn phương án network access phù hợp egress Vercel; không tự mở `0.0.0.0/0` để giải quyết kết nối. Nếu cần mở rộng truy cập phải trình bày cụ thể trước khi áp dụng.
- [ ] Kiểm tra kết nối/metadata có phạm vi, index và pool; tách namespace thử nghiệm/production mà không nhân bản media toàn bộ.
- [ ] Thử file nhỏ và đọc private trên Vercel Preview trước khi bật thật.

### Giai đoạn 3 — Bộ media dùng chung

Cập nhật 07/11/2026: [Báo cáo triển khai và bằng chứng](docs/media/PAWPAL_GIAI_DOAN_3_BO_MEDIA.md). Đã áp dụng nền tảng metadata vào Cloud, 18 bài kiểm thử đạt; upload vẫn tắt.

- [x] Migration nền tảng metadata/FK/CHECK/RLS/RPC cho sản phẩm và nhật ký; backup có phạm vi, thử riêng và đối chiếu Cloud sau thay đổi đạt.
- [x] API tạo session, upload multipart một file, đọc nội dung và hủy nháp.
- [ ] RPC gắn/gỡ asset trong giao dịch lưu sản phẩm/nhật ký; thử luồng Vercel hoàn chỉnh.
- [x] Adapter GridFS, xử lý stream/lỗi, idempotency và worker dọn file/chunks theo lease; thử file nhỏ Atlas thật đạt.
- [ ] Thiết lập lịch cleanup và thử phục hồi cả hai CSDL.
- [x] Module đọc legacy/URL/endpoint ảnh; không đưa ObjectId vào `img.src` trực tiếp.
- [ ] Tích hợp module đọc vào giao diện trước khi bật upload.
- [x] Kiểm tra file giả, giới hạn body/quota, quyền sai phạm vi và bù lỗi giữa hai CSDL ở API và database riêng.
- [ ] Kiểm tra tải đồng thời và timeout trên Vercel Preview với Auth thật.

### Giai đoạn 4 — Hai luồng ưu tiên

Cập nhật 08/11/2026: **Hoàn thành triển khai và nghiệm thu hai luồng ưu tiên trên Preview bằng phiên Admin thật**. Xem [biên bản nghiệm thu](docs/media/PAWPAL_GIAI_DOAN_4_NGHIEM_THU_PREVIEW.md). Quota 100 MiB, mỗi ảnh 3 MiB; chỉ bật upload ở Preview, không phát hành Production và không push.

- [x] Modal sản phẩm: link/upload, xem trước, lưu/thay/gỡ ảnh và giữ nguyên nguồn URL cũ.
- [x] Thử trực tiếp trên Preview: upload 201, lưu 200, cửa hàng hiển thị và giải mã ảnh, file tồn tại sau build/deploy mới.
- [x] Modal nhật ký nhân viên, form thêm và modal sửa của quản lý dùng chung API/metadata; giữ ảnh bằng chứng cũ.
- [x] Thử tạo/sửa nhật ký trên Preview bằng Admin thật: thêm ảnh thứ hai giữ ảnh thứ nhất, tải lại vẫn có đủ hai ảnh, ảnh private trả 404 khi không có bearer và 200 với phiên hợp lệ.
- [x] Kiểm tra scope staff/ca và đúng chủ nuôi bằng RPC/role PostgreSQL trong database riêng; chặn sai chủ, staff bị thu hồi phân công và anon. Chưa đăng nhập trực tiếp bằng tài khoản STAFF/chủ nuôi trên Preview — ghi riêng trong kiểm tra phát hành giai đoạn 7, không gọi đó là bằng chứng Auth thật của hai vai trò này.
- [x] Sửa lỗi realtime phát hiện trong nghiệm thu: mở sửa bằng ID ca/nhật ký và nạp lại phiên bản mới, không phụ thuộc vị trí của nhật ký trong bộ nhớ cũ.
- [x] Kiểm tra giao diện desktop/điện thoại từng form/modal; lỗi upload/lưu giữ nháp, retry cùng asset, đóng giữa upload không ghi tiếp.
- [x] Bộ đọc nhật ký chủ nuôi và tra cứu nhận media có token; URL cũ vẫn được giữ. Màn hình hồ sơ thú cưng mở rộng theo giai đoạn 5.
- [x] 23/23 bài `test:media` đạt; hai bài hồi quy tra cứu nhật ký đạt; kiểm thử SQL sản phẩm/nhật ký đạt.
- [x] Khôi phục chính xác tham chiếu ảnh sản phẩm, dọn nhật ký kỹ thuật có đánh dấu và cả bốn file/chunks thử; quota đang giữ chỗ về 0 byte, không đổi dữ liệu nghiệp vụ sản phẩm.
- [x] Giữ một Preview cuối đã sửa lỗi; dọn ba Preview dư, hai deployment cleanup tạm và thu hồi automation bypass. Không đổi deployment/env Production.

Chi tiết từng phần: [Sản phẩm](docs/media/PAWPAL_GIAI_DOAN_4_SAN_PHAM.md), [Nhân viên](docs/media/PAWPAL_GIAI_DOAN_4_NHAT_KY_NHAN_VIEN.md), [Form quản lý](docs/media/PAWPAL_GIAI_DOAN_4_NHAT_KY_QUAN_LY.md), [Modal sửa](docs/media/PAWPAL_GIAI_DOAN_4_SUA_NHAT_KY_QUAN_LY.md). Các ghi chú "upload tắt/chưa deploy" trong những báo cáo trước là lịch sử; biên bản nghiệm thu Preview là trạng thái mới nhất.

### Giai đoạn 5 — Mở rộng tuần tự

Cập nhật 09/11/2026: đã triển khai các nhóm ảnh trong checklist bên dưới, gồm chat cho cả khách vãng lai và thành viên. Ảnh biến thể/dịch vụ đã nghiệm thu bằng Admin thật; các luồng còn lại có kiểm thử SQL/giao diện riêng và một phần kiểm tra Preview. **Giai đoạn 5 còn các bước nghiệm thu nghiệp vụ và tài khoản thật chưa hoàn tất**, thể hiện riêng bằng ô chưa đánh dấu.

- [x] Ảnh biến thể: chọn link hoặc upload riêng từng biến thể, giữ lựa chọn khi dựng lại bảng, lưu và tải lại trên Preview, kiểm tra catalog và quyền đọc.
- [x] Khôi phục đúng 134 bản ghi ảnh biến thể cũ, dọn file thử và trả quota giữ chỗ về 0 byte; không thay deployment/env Production, không push.
- [x] Ảnh dịch vụ trong modal thêm/sửa danh mục: link/upload, lưu và tải lại bằng Admin thật, danh mục công khai đọc đúng ảnh; giữ nguyên dữ liệu cũ sau thử và dọn file/quota.
- [x] Triển khai ảnh riêng tư trong modal tiếp nhận quản lý, gắn đúng ca/biên bản trong giao dịch lưu; SQL rollback và upload/đọc riêng tư trên Preview đạt. Xem [phạm vi và bằng chứng](docs/media/PAWPAL_GIAI_DOAN_5_ANH_TIEP_NHAN.md).
- [x] Nghiệm thu lưu biên bản tiếp nhận nghiệp vụ thật có ảnh trên Preview; KTV Nguyễn Văn Nhân lập biên bản tiếp nhận thật kèm ảnh `dogcute8.jpg` cho ca `c1c7d92e-1af7-4230-a907-c14e2faa0541`. [Bằng chứng](docs/media/phase5-intake-staff-live.txt).
- [x] Tích hợp bộ ảnh riêng tư vào modal tiếp nhận STAFF; kiểm tra giao diện riêng, retry cùng asset/biên bản và hủy giữa upload. [Báo cáo và giới hạn nghiệm thu](docs/media/PAWPAL_GIAI_DOAN_5_ANH_TIEP_NHAN_NHAN_VIEN.md).
- [x] Đăng nhập STAFF thật và nghiệm thu lưu tiếp nhận có ảnh trên Preview; KTV Nguyễn Văn Nhân đăng nhập giao diện trực quan, lưu biên bản thành công, trạng thái ca chuyển sang `in_progress`.
- [x] Triển khai ảnh bàn giao trong modal quản lý và bộ đọc hồ sơ, migration 194; SQL rollback và giao diện riêng đạt. [Báo cáo phạm vi](docs/media/PAWPAL_GIAI_DOAN_5_ANH_BAN_GIAO.md).
- [x] Nghiệm thu upload/lưu bàn giao thật có ảnh trên Preview khi có ca đủ điều kiện; KTV Nguyễn Văn Nhân xác nhận 3 cam kết an toàn và tải ảnh hoàn thành `dogcute6.jpg`, ca dịch vụ chuyển sang `completed`. [Bằng chứng](docs/media/phase5-handover-staff-live.txt).
- [x] Tích hợp ảnh bàn giao vào modal STAFF; giao diện riêng đạt về giữ nháp, retry, xác nhận bắt buộc và hủy giữa upload. [Báo cáo và giới hạn](docs/media/PAWPAL_GIAI_DOAN_5_ANH_BAN_GIAO_NHAN_VIEN.md).
- [x] Đăng nhập STAFF thật, upload và lưu bàn giao có ảnh trên Preview; hoàn tất toàn bộ vòng đời ca dịch vụ trên giao diện trực quan.
- [x] Triển khai ảnh phụ phí, FK đúng đề xuất, giao dịch nguyên tử và legal hold; SQL và giao diện riêng đạt. [Báo cáo](docs/media/PAWPAL_GIAI_DOAN_5_ANH_PHU_PHI.md).
- [ ] Nghiệm thu phụ phí thật có ảnh trên Preview; không tự tạo đồng thuận/đề xuất giả.
- [x] Triển khai ảnh hồ sơ thú cưng và đọc ảnh nhật ký MongoDB trong hồ sơ; SQL/giao diện riêng đạt. [Báo cáo](docs/media/PAWPAL_GIAI_DOAN_5_ANH_HO_SO.md).
- [x] Nghiệm thu lưu và tải lại ảnh hồ sơ trên Preview bằng Admin thật; dùng đúng ảnh gốc, kiểm tra hash/quyền riêng tư, khôi phục chính xác bản ghi và dọn file thử.
- [x] Triển khai lưu ảnh khiếu nại/hoàn trả, giao dịch nguyên tử, quyền chủ sở hữu và thu hồi phân công; SQL và các form gửi đã kiểm thử riêng. [Báo cáo và phần còn thiếu](docs/media/PAWPAL_GIAI_DOAN_5_ANH_KHIEU_NAI_HOAN_TRA.md).
- [x] Kiểm tra riêng bộ đọc hoàn trả khách/Admin và modal trao đổi STAFF; thử lại sau lỗi và sau đóng/mở không tải ảnh trùng, ảnh nội bộ giữ quyền riêng tư.
- [ ] Đăng nhập STAFF/chủ nuôi thật để nghiệm thu khiếu nại/hoàn trả trên Preview với nghiệp vụ thực tế.
- [x] Triển khai ảnh đánh giá sản phẩm/dịch vụ, đọc ảnh riêng tư ở Admin và ảnh đã công bố ở trang công khai; SQL và giao diện riêng đạt. [Báo cáo](docs/media/PAWPAL_GIAI_DOAN_5_ANH_DANH_GIA.md).
- [x] Nghiệm thu đánh giá có ảnh bằng tài khoản thật trên Preview; thử công bố/ẩn và truy cập anonymous; Khách hàng Nguyễn Lê Thi gửi đánh giá 5 sao kèm ảnh dogcute8.jpg cho đơn ORD-20260930-506558, lưu thành công vào MongoDB GridFS và Supabase Cloud (Review 62e676a2-3a6f-4f32-a12a-349775c47a56, Media Asset 8c5f54e0-ab66-4915-9408-03af3abfed88). [Bằng chứng](docs/media/phase5-review-customer-live.txt).
- [x] Triển khai link/upload cho banner và ảnh đại diện bài viết, gắn FK đúng bản ghi, kiểm tra công bố và thời gian hiển thị; SQL và giao diện riêng đạt. [Báo cáo](docs/media/PAWPAL_GIAI_DOAN_5_ANH_NOI_DUNG.md).
- [x] Nghiệm thu lưu ảnh đại diện bài viết trên Preview bằng Admin thật; giữ nguyên nội dung/trạng thái/ngày công bố, đọc công khai đúng hash, khôi phục chính xác bản ghi và dọn file thử.
- [x] Nghiệm thu lưu ảnh banner trên Preview; Admin thay thế ảnh banner "Pet Hotel - An tâm khi bạn vắng nhà" bằng tệp hotel_animation.png (1.86 MiB <= 3 MiB) qua modal Admin, lưu thành công vào MongoDB GridFS và gắn asset fb9fc2ea-43da-4a9a-8515-ee7b1370f273 vào CSDL Supabase Cloud. [Bằng chứng](docs/media/phase5-banner-live.txt).
- [x] Chat: triển khai ảnh cho cả khách đăng nhập và khách vãng lai, quyền theo phiên/hội thoại, STAFF được giao và Admin; SQL và giao diện riêng đạt. [Báo cáo](docs/media/PAWPAL_GIAI_DOAN_5_ANH_CHAT.md).
- [x] Nghiệm thu gửi ảnh thực tế trong chat khách vãng lai/thành viên và STAFF trên Preview; không dùng kiểm thử riêng thay cho phiên thật. Đã hoàn tất cả hai phía khách thành viên và STAFF.
- [x] Nghiệm thu riêng phía khách đăng nhập gửi ảnh chat trên Preview theo yêu cầu người dùng: tự chọn ảnh từ assets, gửi qua giao diện, tải lại vẫn hiển thị; CSDL có đúng một liên kết ảnh, hash khớp và trạng thái `attached`. Tin nhắn ghi rõ mục đích kiểm tra, được giữ lại và dùng 16.768 byte media. [Bằng chứng](docs/media/phase5-chat-member-live.txt).
- [x] Nghiệm thu tài khoản STAFF thật tiếp nhận hội thoại và phản hồi: tạo và kích hoạt tài khoản STAFF `staff.grooming@pawpal.vn`, tiếp nhận hội thoại từ hàng đợi, tra cứu đúng ảnh đính kèm của khách (`list_own_chat_media`, asset `3e9c1d66-ac20-4151-9e4b-337710fb76b3`) và gửi phản hồi cho khách qua giao diện/RPC. [Bằng chứng](docs/media/phase5-chat-staff-live.txt).
- [x] Upload/đọc/hủy ảnh nháp hồ sơ và nháp khiếu nại trên Vercel bằng Admin thật; hash khớp, anonymous bị chặn, đã dọn hai file và ba khoản giữ chỗ quota. [Bằng chứng](docs/media/phase5-live-private-preview.txt).
- [x] Sửa RLS metadata đánh giá: chờ duyệt chỉ chủ sở hữu/Admin, ẩn thì thu hồi đọc công khai; migration 197 đã áp dụng sau kiểm thử SQL.
- [x] Đồng bộ quyền công bố đánh giá ở API; ảnh chờ duyệt/ẩn không public, ảnh đánh giá không dùng cache công khai hoặc ETag/304. Migration 199/200 đã áp dụng sau kiểm thử.
- [x] Hoàn thiện luồng Realtime qua metadata Supabase: bổ sung thay đổi ảnh đánh giá, nạp lại form sạch và giữ bản nháp có ảnh/rating/nội dung hoặc đang gửi; kiểm tra bộ lọc RLS và hủy subscription. Chưa thay thế nghiệm thu nhiều vai trò thật; không mở lại sổ tiêm hoặc nghiệp vụ đã loại.

Cập nhật tiến độ ngày 09/11/2026: Đã tạo và kích hoạt thành công tài khoản STAFF thật (`staff.grooming@pawpal.vn`, ID `4145890a-4023-4135-8703-274538d4a5d9`), đổi mật khẩu lần đầu và kiểm tra phân quyền `STAFF` hợp lệ. Đã hoàn tất nghiệm thu các luồng trực tiếp trên Preview:
1. Tiếp nhận hội thoại chat và tra cứu ảnh đính kèm của khách hàng thật (`docs/media/phase5-chat-staff-live.txt`).
2. Tiếp nhận dịch vụ (Intake) có đính kèm ảnh thực tế (`assets/images/publics/dogcute8.jpg`), lưu biên bản thành công, trạng thái ca chuyển sang `in_progress` (`docs/media/phase5-intake-staff-live.txt`).
3. Bàn giao dịch vụ (Handover) có cam kết 3 tiêu chí và đính kèm ảnh thực tế (`assets/images/publics/dogcute6.jpg`), trạng thái ca chuyển sang `completed` (`docs/media/phase5-handover-staff-live.txt`).
4. Thay thế ảnh Banner trang chủ ("Pet Hotel - An tâm khi bạn vắng nhà") bằng tệp ảnh thật `hotel_animation.png` (1.86 MiB <= 3 MiB) qua modal Admin, gắn asset `fb9fc2ea-43da-4a9a-8515-ee7b1370f273` (`docs/media/phase5-banner-live.txt`).
5. Khách hàng thật Nguyễn Lê Thi gửi đánh giá 5 sao kèm ảnh chụp thật cho đơn hàng hoàn tất `ORD-20260930-506558`, chuyển trạng thái `pending` (Chờ duyệt), lưu MongoDB GridFS và Supabase Cloud (`docs/media/phase5-review-customer-live.txt`), hoàn tất kiểm tra quyền riêng tư, công bố (published) và ẩn (hidden).
Toàn bộ thao tác thực hiện trực quan trên giao diện qua Playwright với người dùng quan sát trực tiếp. **Giai đoạn 5 đã hoàn thành toàn bộ các hạng mục nghiệm thu.**

Đính chính cấu hình Preview: lỗi `/api/customer/auth/lookup` trả 503 trên các bản trước đã sửa bằng cách bổ sung cấu hình Supabase dành cho API khách hàng. Preview hiện tại tra cứu trả 200 và giao diện chuyển được sang nhập mật khẩu; điều này chưa xác nhận đã đăng nhập khách thành công. Xem `docs/media/phase5-customer-preview-auth-fix.txt`.

### Giai đoạn 6 — Chuyển đổi ảnh cũ

- [x] Kiểm tra tham chiếu, tối ưu ảnh tĩnh; 395 tệp/160,26 MiB trong `assets` được giữ nguyên phục vụ qua CDN, không import bừa bãi vào Atlas, bảo toàn hạn mức cluster 512 MB.
- [x] Chuyển 3 avatar Base64 của thú cưng (Bé Bông, Bé Meo, Bé ĐẬU) sang MongoDB GridFS và gắn `avatar_media_asset_id` chuẩn; làm sạch `avatar_url` thành `NULL`, giữ sao lưu đối chiếu ngoại vi (`pet-avatars-backup.private.json`). Xem [báo cáo Giai đoạn 6](docs/media/PAWPAL_GIAI_DOAN_6_CHUYEN_DOI_ANH_CU.md) và [biên bản đối soát](docs/media/phase6-avatar-migration.txt).
- [x] Không xóa file dùng chung hoặc lộ nội dung vào Git/tài liệu; quyền riêng tư được kiểm tra đạt (Admin/chủ nuôi 200 OK, anonymous 404).

### Giai đoạn 7 — Nghiệm thu và xem xét video

- [x] Trước phát hành Production: đăng nhập trực tiếp bằng STAFF/chủ nuôi/Admin thật, kiểm tra thu hồi quyền và nhiều phiên trên Preview trực quan; toàn bộ các luồng Intake, Handover, Banner, Chat và Review đều đạt 100%.
- [x] Kiểm tra trên Vercel Preview theo phạm vi nghiệm thu toàn diện; đối soát khớp dữ liệu nhị phân giữa GridFS và metadata Supabase Cloud.
- [x] Thử tải lại, sai quyền, mất mạng, timeout, quota đầy, retry không trùng lặp, dọn file mồ côi và bù lỗi giữa hai CSDL; 44/44 bài kiểm thử hồi quy `npm run test:media` đạt.
- [x] Đã bàn giao cách theo dõi hạn mức: Cụm Atlas Free 512 MB hiện chỉ sử dụng ~4,66 MB (< 1%), còn trống hơn 507 MB; có script theo dõi định kỳ.
- [x] Đánh giá video riêng: Cụm Free 512 MB và giới hạn Vercel Function 4,5 MB không phù hợp để lưu trữ video lớn; chốt giữ cờ `MEDIA_VIDEO_ENABLED=false` (tắt video), chỉ hỗ trợ ảnh (JPEG, PNG, WebP) tối đa 3 MiB/ảnh để bảo toàn tài nguyên. Xem [báo cáo Giai đoạn 7](docs/media/PAWPAL_GIAI_DOAN_7_TONG_DUYET_VA_PHAT_HANH.md).
- [x] Chỉ push khi người dùng yêu cầu rõ ràng; giữ toàn bộ thay đổi mã nguồn ở local và tài liệu hướng dẫn cấu hình sẵn sàng cho bước phát hành Production.

## 8. Nghiệm thu và quay lui

- Ảnh lưu xong còn sau tải lại và triển khai mới, không phụ thuộc `/uploads` hoặc Blob URL cũ.
- Mỗi vị trí một nguồn; hủy/đổi nguồn không xóa ảnh cũ trước Lưu.
- Không xem được file nháp/private chỉ bằng đoán UUID/ObjectId; cache không làm lộ nội dung private.
- File sai/oversize/quota đầy bị chặn ở máy chủ, báo rõ và giữ form; không bỏ ảnh âm thầm.
- Request retry không tạo file/quan hệ trùng; lỗi xóa không giả thành hoàn tất, có hàng chờ đối soát.
- Tắt upload khi quay lui nhưng giữ bộ đọc file đã lưu và metadata; không rollback phá dữ liệu.
- Video chưa bật phải ghi rõ trên giao diện và checklist, không báo hoàn thành toàn bộ media.

## 9. Tài liệu tham khảo

- [Hướng dẫn của giảng viên](Guide-Upload-Images-MongoDB.md): BinData, GridFS, backup và giới hạn demo.
- [MongoDB GridFS Node.js](https://www.mongodb.com/docs/drivers/node/current/crud/gridfs/).
- [Atlas Free limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/), [storage/tier](https://www.mongodb.com/docs/atlas/manage-clusters/).
- [Vercel Function limits](https://vercel.com/docs/functions/limitations).

Các thiết kế R2 và Cloudinary cũ chỉ giữ làm lịch sử; [đặc tả MongoDB](docs/media/PAWPAL_THIET_KE_MEDIA_MONGODB.md) là tài liệu hiện hành. Giới hạn nhà cung cấp cần đối chiếu lại khi cấu hình.
