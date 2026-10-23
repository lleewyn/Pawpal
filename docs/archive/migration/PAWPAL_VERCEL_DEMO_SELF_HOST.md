# Kết nối Admin V1 trên Vercel với Supabase local

> Cập nhật 21/10/2026: hướng demo bên dưới đã được thay bằng Supabase Cloud project `cpzuvaplseielhgcnqrn`. Admin Production không còn dùng tunnel; tunnel demo đã dừng. Không áp dụng lại các giá trị demo cũ. Xem [kế hoạch và kết quả chuyển Cloud mới](PAWPAL_KE_HOACH_CLOUD_MOI_KET_HOP_V1.md).

## Trạng thái ngày 21/10/2026

Đã triển khai mã hiện tại lên Production của `llwyns-projects/pawpal_gr3`, tại `https://pawpalgr3.vercel.app`. Admin kết nối tới Supabase trên máy qua đường HTTPS tạm thời. Đây là phương án demo; máy, Docker, gateway và tunnel phải tiếp tục chạy.

Deployment đã nghiệm thu: `dpl_CznHQgH4Y1QbkjLbahVjp2ewpT9y` — [trang quản lý triển khai](https://vercel.com/llwyns-projects/pawpal_gr3/CznHQgH4Y1QbkjLbahVjp2ewpT9y). Triển khai trực tiếp từ workspace qua CLI, chưa commit/push các thay đổi lên GitHub. Các lần triển khai từ Git sau này cần chứa cùng mã đã cập nhật.

Kiểm tra **Production thật**, không chặn hoặc thay thế request trình duyệt, đã đạt bằng `scripts/test/self_host_vercel_production_live.cjs`: cấu hình khớp URL tunnel và khóa anon local; endpoint đổi mật khẩu từ chối phiên chưa đăng nhập; đăng nhập Admin; 35 khách hàng; tổng 7.964 điểm; Realtime joined; tải lại trang giữ phiên và dữ liệu; không request sang Supabase Cloud cũ. Ảnh lưu ngoài web tại `D:\Aboutme\Pawpal-infra\supabase-local\verification\vercel-production-customers.png`.

Kiểm tra Chrome với mã local phục vụ dưới origin `https://pawpalgr3.vercel.app` và request API đi qua tunnel thật đã đạt: đăng nhập Admin, 35 khách hàng, tổng 7.964 điểm, kênh Realtime ở trạng thái joined và không gọi Supabase Cloud cũ. Đây là kiểm tra trước triển khai, không phải xác nhận bản production đã cập nhật. Kiểm tra endpoint HTTPS cũng xác nhận Studio/Auth Admin không được công khai và REST không có khóa bị từ chối.

Gateway chỉ chuyển tiếp API dữ liệu, đăng nhập và Realtime. Studio, cổng PostgreSQL, Auth Admin và Storage không được công khai qua đường này. Thao tác đổi mật khẩu nhân viên đi qua một endpoint riêng kiểm tra phiên và nhân viên; khóa quản trị nằm ở máy local.

## Các bước trên Vercel

Các bước dưới đây đã hoàn tất cho deployment trên. Dùng lại khi cần đổi URL tunnel hoặc triển khai mã mới.

1. Mở dự án **pawpalgr3** trong Vercel Dashboard, vào **Settings → Environment Variables**.
2. Mở file riêng `D:\Aboutme\Pawpal-infra\supabase-local\VERCEL-DEMO-SETTINGS.private.txt`. Thêm hai biến `PAWPAL_ADMIN_SUPABASE_URL` và `PAWPAL_ADMIN_SUPABASE_ANON_KEY` cho Production, dùng đúng giá trị trong file.
3. Triển khai bản mã đã cập nhật trong workspace này. Chỉ bấm Redeploy bản Git cũ sẽ không có endpoint cấu hình mới và không đủ để chuyển kết nối.
4. Mở `https://pawpalgr3.vercel.app/admin/login`, đăng nhập bằng Admin local. Kiểm tra danh sách khách, hồ sơ và Pawpoint.

Giữ các biến Cloud cũ phục vụ những trang chưa chuyển đổi. Không đưa `SERVICE_ROLE_KEY`, mật khẩu Studio hoặc mật khẩu database lên frontend hay Vercel cho luồng này.

## Mã đã chuẩn bị

- `/api/admin-config`: cung cấp URL và khóa anon cho Admin; cấu hình thiếu hoặc dùng nhầm khóa quyền quản trị sẽ không được xuất ra trình duyệt.
- Admin nạp cấu hình trước khi tạo Supabase client; không tự quay về Cloud khi cấu hình thiếu.
- `/api/admin/auth/complete-password-change`: chuyển tiếp thao tác đổi mật khẩu nhân viên qua máy local.
- `scripts/dev/self-host-public-gateway.cjs`: gateway riêng tại `127.0.0.1:8012`.

## Khi dừng máy hoặc khởi động lại

URL của Quick Tunnel thay đổi khi tạo lại tunnel. Khi đó phải cập nhật `PAWPAL_ADMIN_SUPABASE_URL` và triển khai lại trên Vercel. Không cần tạo lại database.

PID và log của gateway/tunnel nằm tại thư mục hạ tầng: `demo-gateway.pid`, `demo-tunnel.pid`, `demo-gateway.*.log`, `demo-tunnel.*.log`. Supabase Studio vẫn mở tại `http://localhost:8000` trên máy này.

Phạm vi demo là Admin V1 và phân hệ Khách hàng đã nghiệm thu. Các trang khách mua hàng, dịch vụ, bán hàng và các phân hệ còn lại cần chuyển đổi, kiểm tra riêng trước khi dùng chung database V1.
