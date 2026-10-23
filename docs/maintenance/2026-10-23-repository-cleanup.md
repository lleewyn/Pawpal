# Dọn mã không còn dùng — 23/10/2026

## Dọn Markdown trong pages

- Xóa 25 kế hoạch/checklist/báo cáo cũ đã được thay thế bởi nghiệm thu Cloud V1. Các file này không được API, giao diện hoặc công cụ đọc làm đầu vào; vẫn khôi phục được từ Git trước đợt dọn.
- Giữ 5 tài liệu còn hữu ích: thiết kế Admin, cache/rollback, kiểm thử chatbot thủ công, ma trận UI được sinh từ mã và cảnh báo về giới hạn test runner. Chuyển chúng sang `docs/design`, `docs/architecture` và `docs/testing`.
- Đặt ghi chú rõ phạm vi/thời điểm trên các tài liệu giữ lại. Không coi kế hoạch hoặc bản kiểm kê cũ là kết quả nghiệm thu mới.
- Công cụ sinh kiểm kê được đổi nơi đọc/ghi sang `docs/testing/generated`, để không tạo lại Markdown trong `pages/`. Cập nhật liên kết tài liệu sang bản thay thế hiện hành.
- Không thay đổi mã chạy giao diện, dữ liệu Supabase, Docker hoặc thư mục HTML chưa theo dõi của người dùng.

## Gom tài liệu sau khi dọn mã

- Chuyển 35 tài liệu/nguồn tham khảo từ thư mục gốc vào `docs/acceptance`, `docs/database`, `docs/testing`, `docs/business` và `docs/archive`. Ở gốc chỉ giữ hai file Markdown `README.md` và `AGENTS.md`.
- README được rút gọn thành hướng dẫn chạy và đường dẫn tới [mục lục tài liệu](../README.md). Bỏ hướng dẫn JSON dự phòng, tài khoản mẫu và mô tả chức năng đã cũ khỏi README hiện hành.
- Kế hoạch Cloud cũ/self-host, báo cáo nhập dữ liệu, thiết kế cũ và đề xuất đã hoãn giữ trong mục lưu trữ; không dùng làm hướng dẫn vận hành hiện tại.
- Cập nhật 88 liên kết tài liệu và 11 đường dẫn trong công cụ đọc/sinh báo cáo. Mô hình thiết kế sau chuyển vẫn khớp mã băm trước chuyển: 105 bảng/906 thuộc tính trong thiết kế V1; không ghi hoặc đổi schema Cloud.
- Loại `docs/` khỏi gói triển khai Vercel; tài liệu vẫn có trên GitHub. Các API đang triển khai không đọc thư mục này.
- Giữ nguyên thư mục HTML chưa theo dõi của người dùng. Không thao tác Supabase Cloud hoặc Docker trong đợt gom tài liệu.

## Phạm vi đã chốt

Chỉ dọn file/mã trong dự án Pawpal. Không xóa project, tổ chức, tài khoản hoặc dữ liệu Supabase Cloud cũ/mới. Không xóa hay dừng container/database/volume Supabase local. Quyết định này thay thế yêu cầu xóa Cloud cũ trước đó.

## Những gì đã dọn

- Đưa 25 file khỏi repo vào `D:/Aboutme/Pawpal-infra/retired/cleanup-2026-10-23/repo-files`, giữ đường dẫn tương đối và đối chiếu SHA-256 từng file. Danh sách chi tiết ở `manifest.tsv` trong kho này; có thể khôi phục hoặc lấy từ lịch sử Git.
- Nhóm lưu trữ: bộ tương thích `scripts/database/self-host` gồm 8 file; hai công cụ preview/gateway trong `scripts/dev`; `scripts/database/v1/deploy_local.cjs`; 12 test `self_host_*`; script đánh giá sản phẩm cũ không còn trang nào nạp; ảnh bằng chứng `blog-filter-proof.png` ở thư mục gốc không có tham chiếu chạy.
- Giữ migrations V1, công cụ kiểm thử phục hồi đang dùng và tài liệu thiết kế/nghiệm thu. Không xóa file chỉ vì tên có `local` hoặc `cloud`: nhiều công cụ đó vẫn phục vụ kiểm thử và Cloud mới.
- Bỏ khả năng chọn backend bằng hai giá trị cấu hình Supabase lưu cũ trong localStorage. Trình duyệt dùng cấu hình ứng dụng được cấp rõ ràng hoặc mặc định Cloud mới; không xóa phiên đăng nhập/dữ liệu người dùng trong trình duyệt.
- Tách `cloud_connection.cjs` khỏi container database `supabase-db`: công cụ dùng container CLI PostgreSQL dùng một lần, không gắn volume và không chạy máy chủ database.
- Cập nhật README và bỏ mục script đánh giá cũ khỏi cây thư mục; thêm `.tmp-*` vào gitignore.

## Dữ liệu được giữ

- Cloud cũ `ralnsebcwdqelikykxic` và Cloud mới `cpzuvaplseielhgcnqrn` không có thao tác xóa trong đợt này.
- Thư mục infra tên `supabase-local` vẫn chứa cấu hình Cloud mới, bản sao lưu, bằng chứng và công cụ kiểm thử; giữ nguyên thư mục và các khóa riêng tư.
- Trước khi người dùng thu hẹp phạm vi, đã tạo thêm bản sao lưu local `local-cluster.private.sql` cùng SHA-256 ngoài repo. Đây chỉ là đọc/sao lưu; không xóa hoặc thay database local.
- Giữ nguyên thư mục chưa theo dõi `PAWPAL_PUBLIC_HTML_V218_VA_7_TRANG/` của người dùng, không đưa vào commit dọn dẹp.

## Kiểm tra

- Kiểm thử băng thông offline: cấu hình trình duyệt cũ không đổi backend, gộp request trùng, cách ly phiên, chặn tải lặp khi hết quota, cache/Realtime và phục hồi lỗi. Fixture Dashboard được cập nhật cho phân trang, các dòng lịch V1 và RPC thực thu hiện tại; không thay logic ứng dụng để làm test qua.
- Kiểm thử cấu hình Admin không công bố khóa đặc quyền: đạt.
- Công cụ SQL Cloud mới chạy `SELECT 1` bằng CLI dùng một lần: đạt. Không truy vấn hệ thống Logs Cloud.
- Commit `b6b7fd92` đã lên Vercel. `node scripts/test/public_services_cloud.cjs --deployed --retired-config` đạt: cố tình lưu cấu hình backend lỗi trong trình duyệt, ứng dụng vẫn đọc Cloud mới, danh mục/chi tiết/loài/đánh giá thật hiển thị đúng; không gọi backend đã loại bỏ và không đọc file dữ liệu dự phòng khi RPC lỗi. Không tạo dữ liệu thử.
- 14 kiểm thử cấu hình/header/tìm kiếm và bộ kiểm thử băng thông offline đạt. Kiểm tra lại đủ 25 mã băm bản lưu trữ; các container Supabase local vẫn đang chạy như trước. Chỉ còn thư mục HTML chưa theo dõi của người dùng ngoài commit.
