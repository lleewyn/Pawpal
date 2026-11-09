# Giai đoạn 2 — Chuẩn bị kết nối MongoDB Atlas

Cập nhật: 07/11/2026. Trạng thái: preflight từ máy kiểm tra đạt và **Vercel Preview ping Atlas thành công**. Chưa kiểm tra quyền ghi hoặc sửa CSDL/giao diện. Xem [bằng chứng Atlas chỉ đọc](phase2-atlas-readonly.txt) và [bằng chứng Preview](phase2-vercel-preview.txt).

## 1. Kết quả đã thực hiện

- Cài MongoDB Node.js driver `6.21.0` cố định phiên bản, cập nhật package/lockfile. Không chạy lifecycle scripts khi cài.
- Thêm [module kết nối máy chủ](../../scripts/api/media_mongodb.cjs). Import module không tự kết nối, không tạo collection/index hoặc ghi dữ liệu.
- Kết nối chỉ chấp nhận Atlas SRV có cấu hình database rõ ràng; không fallback về MongoDB local hoặc database mặc định.
- Xác minh TLS, không nhận tham số tắt bảo vệ chứng chỉ hoặc đổi pool tùy ý trong URI.
- Tái sử dụng một client/promise trong mỗi instance Node.js, kể cả request đồng thời; pool tối đa 3 kết nối thao tác mỗi server, có timeout và đóng idle. Driver vẫn có các kết nối giám sát riêng; nhiều instance Vercel có các pool riêng.
- Lỗi cấu hình/kết nối chỉ trả mã cố định; không in URI, tài khoản, password hoặc lỗi driver gốc.
- Thêm [mẫu cấu hình](../../config/media.env.example), upload/video mặc định tắt.
- Thêm CLI kiểm tra chỉ đọc. Chuẩn bị probe chỉ dùng trong artifact Preview riêng, có token ngẫu nhiên và chặn production; không gắn route vào website hoặc trả trạng thái Atlas cho khách truy cập.

Chưa có endpoint upload/read ảnh, chưa có migration `media_asset`, chưa sửa modal hoặc mở feature flag. `MEDIA_UPLOAD_ENABLED=true` không có nghĩa chức năng upload đã tồn tại; giữ false cho tới khi nghiệm thu.

## 2. Link ảnh hiện có vẫn được giữ

Các cột như `product_media.image_url`, `product_variant_media.image_url`, `service_image.image_url`, `care_log_media.media_url`, `pet_profile.avatar_url`, `banner.image_url` và `blog_post.thumbnail_url` tiếp tục tồn tại; không sửa hoặc di chuyển dữ liệu cũ ở giai đoạn 2.

| Nguồn ảnh | Dữ liệu dự kiến sau khi triển khai đầy đủ |
|---|---|
| Link HTTPS/đường dẫn assets cũ | Giữ URL ở cột hiện có và dùng bộ đọc tương thích |
| Dán link mới cho ảnh công khai | Lưu URL hợp lệ vào cột tương ứng như hiện tại |
| Upload file mới | GridFS lưu byte ảnh; Supabase có hồ sơ asset và FK nghiệp vụ |
| File riêng tư | Không lưu URL có token vĩnh viễn; đọc qua API xác thực |

Việc thêm FK/cho phép URL nullable chỉ thực hiện ở migration giai đoạn 3, với CHECK một nguồn hiệu lực, và bộ đọc phải được nâng cấp trước khi bật ghi theo từng nghiệp vụ. Chưa có thay đổi schema nào trong phần chuẩn bị này.

## 3. Việc người dùng cần chuẩn bị

Ban đầu người dùng chưa xác định cluster. Sau đó đã cung cấp màn hình Cluster0 gói Free được khởi động lại và lưu cấu hình riêng; kiểm tra kết nối chỉ đọc đã đạt ngày 07/11/2026. Các bước dưới là hướng dẫn thiết lập, không phải mọi bước đều chưa làm. Không cần gửi tài khoản quản trị, mật khẩu hoặc URI thật trong chat.

1. Đăng nhập MongoDB Atlas và tạo cluster, chọn **Free** nếu có trong tài khoản/region; không chọn Flex/dedicated/add-on trả phí theo kế hoạch hiện tại.
2. Chọn database media dự định, ví dụ `pawpal_media`. Không import dữ liệu nghiệp vụ Supabase vào Atlas.
3. Tạo database user riêng, quyền chỉ trên database media cần dùng; đây là user ứng dụng, khác tài khoản đăng nhập website Atlas.
4. Xác định phương án network access để Vercel kết nối được. Không tự mở mọi IP chỉ để vượt lỗi; chưa có kết nối thật nếu chưa thống nhất bước này.
5. Trong mục Connect dành cho Drivers, lấy URI Atlas. Nếu mật khẩu có ký tự đặc biệt, mã hóa đúng phần username/password theo hướng dẫn; không thay URI bằng link trang dashboard.
6. Đặt URI và tên database trong môi trường riêng hoặc Vercel Environment Variables. Trên máy thử, dùng file nằm ngoài webroot; chỉ sao chép mẫu, không điền bí mật vào `config/media.env.example` rồi commit.

Tài liệu: [Tạo Free cluster](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/). Giao diện/tier cần kiểm tra tại lúc tạo; chưa coi cluster, database user hoặc chính sách mạng là đã được cấu hình.

### Biến cần có

| Biến | Giá trị |
|---|---|
| `MONGODB_URI` | URI Atlas thật, chỉ ở server |
| `MONGODB_DB` | Database media được phép dùng, bắt buộc khai báo |
| `MONGODB_MEDIA_BUCKET` | `pawpalMedia` hoặc namespace đã thống nhất |
| `MEDIA_UPLOAD_ENABLED` | `false` |
| `MEDIA_VIDEO_ENABLED` | `false` |

Module bản đầu chấp nhận URI `mongodb+srv://` trên hostname kết thúc bằng `.mongodb.net`; TLS bắt buộc. Query options cho phép là `retryWrites=true`, `w=majority`, `appName`, `authSource=admin`, `readPreference=primary`; options khác bị từ chối bằng mã cấu hình, không tự bỏ qua. Tên DB/bucket bắt đầu bằng chữ, chỉ dùng chữ/số/gạch dưới/gạch ngang, tối đa 63 ký tự.

Không đọc `.env` dự án tự động trong CLI để tránh vô tình dùng URI MongoDB local hoặc cấu hình cũ. Nếu chỉ có Vercel env, cần chạy kiểm tra bằng môi trường triển khai phù hợp hoặc file riêng đã cấu hình an toàn; không tạo endpoint chẩn đoán public.

## 4. Cách kiểm tra

Chạy kiểm thử không cần mạng/cluster:

```powershell
npm run test:media
```

Sau khi có file cấu hình riêng ở một đường dẫn tuyệt đối ngoài thư mục website:

```powershell
npm run media:preflight -- --env-file "DUONG_DAN_TUYET_DOI_TOI_FILE_RIENG"
```

Hoặc đặt biến môi trường riêng trong process rồi chạy `npm run media:preflight`. Không truyền URI trực tiếp làm đối số lệnh vì dễ lưu vào lịch sử.

CLI chỉ ping, đọc `dbStats` của database đã chọn và kiểm tra sự tồn tại của hai collection GridFS theo tên. Không đọc ảnh, không dump tài liệu, không tạo index/collection, không thử upload/xóa và không đọc Supabase Logs. `PASS` chỉ chứng minh kết nối/quyền đọc metadata trong phạm vi này, không chứng minh quyền ghi hoặc network access của Vercel production.

Kết quả chỉ có số byte tổng hợp, trạng thái collection và flags; không in host/database name/URI. Số byte chỉ của DB cấu hình, **không phải dung lượng cả cluster**; cần dashboard để kiểm tra tier và dung lượng các database khác.

## 5. Kiểm thử đã chạy

- 9 kiểm thử đạt: 6 trường hợp cấu hình/pool/redaction/metadata/Admin config và 3 trường hợp probe (không chạy ở production, token sai bị chặn, chỉ ping và không lộ lỗi provider).
- CLI chạy không có cấu hình trả `MEDIA_MONGODB_CONFIG_MISSING` và exit code 1 như dự kiến; không phải bằng chứng Atlas đang lỗi hoặc đã kết nối.
- Preflight mạng thật đã đạt: connect/ping/dbStats/metadata collection; database đích có 0 byte dữ liệu và 0 byte index tại thời điểm kiểm tra, chưa có hai collection GridFS. Không tạo collection/file hoặc gọi thao tác ghi.
- Truy vấn listCollections dùng `$in` ban đầu bị mã 8000; đã đổi thành hai truy vấn tên chính xác và chạy lại đạt. Chỉ lưu giai đoạn lỗi và mã số, không xuất nội dung lỗi có thể chứa bí mật.
- Gói Free được thấy trên ảnh dashboard người dùng cung cấp; chưa xác minh tổng dung lượng cả cluster, phạm vi tối thiểu database user/network policy hoặc quyền ghi. Không suy luận từ ping rằng upload production đã sẵn sàng.

### Kiểm tra Vercel Preview thật

- Phiên CLI cũ trả 403; người dùng đã xác nhận đăng nhập lại bằng luồng device login.
- Đọc project `pawpal_gr3`: Hobby, Node 24.x, Fluid Compute, region mặc định `iad1`. Đã có `MONGODB_URI` áp dụng Preview/Production; không ghi đè hoặc đọc giá trị ra đầu ra.
- API không cho tạo biến cho nhánh Git chưa tồn tại. Các yêu cầu thử ban đầu bị từ chối, không tạo được biến nào; không push nhánh để vượt điều kiện đó.
- Chuyển sang CLI deploy artifact tối giản với `--target preview`; runtime env chỉ ghi đè ở cấp deployment. URI nhận từ private file qua process env; CLI chỉ nhận tên biến, không có credential trong argv/source/Git.
- Bản thử chỉ chứa connector, probe có token và trang thông báo; không đóng gói website hoặc thay đổi `components/fab/fab.html` đang có chỉnh sửa riêng của người dùng.
- Probe qua CLI có xác thực trả HTTP 200, `atlas_ping_only`, `writes=false`. Không cần đổi IP access list trong đợt này để ping đạt; điều đó không chứng minh chính sách hiện tại đã đủ chặt hoặc sẽ ổn định cho mọi instance.
- Xóa các deployment thử sau khi chạy. Vercel CLI đã tạo automation bypass để gọi Preview được bảo vệ; token sinh trong lần thử đã được thu hồi, không tạo token thay thế. Token probe riêng và file header tạm không được giữ trong repository.
- Không đổi project env hoặc Production, không tắt Deployment Protection, không tạo collection/index/file MongoDB, không đọc Supabase Logs.
- Các lần đầu gặp giới hạn CLI (không nhận `--config`) và redirect của lớp bảo vệ; đã sửa cách cấp header qua private file. Chỉ kết quả HTTP 200 thật mới được ghi PASS, không coi build thành công là kết nối thành công.
- Chưa đặt biến media cố định cho rollout. Phần đó phải thực hiện theo phạm vi Preview/Production đã chốt sau schema/API, tránh thay URI đang dùng cho mục đích khác.

## 6. Checklist còn lại

- [x] Dependency, module kết nối, mẫu cấu hình và CLI chỉ đọc.
- [x] Kiểm thử local không cần Atlas đạt; không đổi URL/schema/giao diện.
- [ ] Cluster Free, region và database đích được xác nhận.
- [ ] Database user phạm vi tối thiểu và network access phù hợp Vercel.
- [x] Cấu hình được đọc từ file riêng ngoài webroot; preflight chỉ đọc thật đạt. Nội dung file không được in hoặc sao chép vào repository.
- [ ] Kiểm tra tier/dung lượng cluster và quota media được chốt.
- [x] Xác nhận runtime/routing và kết nối Atlas bằng Preview riêng có env cấp deployment; probe ping đạt, artifact thử được dọn.
- [ ] Chốt namespace và biến media rollout lâu dài, tránh xung đột `MONGODB_URI` hiện có; chưa áp dụng project env mới.
- [x] Đã sang giai đoạn 3 để triển khai nền tảng metadata, quyền và API. Xem [báo cáo giai đoạn 3](PAWPAL_GIAI_DOAN_3_BO_MEDIA.md); upload và giao diện vẫn chưa bật.
