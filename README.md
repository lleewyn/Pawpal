# PawPal

Website quản lý dịch vụ chăm sóc thú cưng và bán sản phẩm, gồm cổng khách hàng và hệ thống quản trị Pawpal-er.

[Website PawPal](https://pawpalgr3.vercel.app/)

## Chức năng

- **Khách hàng** có thể xem danh mục sản phẩm và dịch vụ, đặt lịch chăm sóc, mua hàng, theo dõi đơn, quản lý hồ sơ thú cưng, xem nhật ký chăm sóc, gửi đánh giá và nhận hỗ trợ.
- **Quản trị** có các phân hệ tổng quan, khách hàng, thú cưng, dịch vụ, bán hàng, nhân sự, khiếu nại, chatbot và cấu hình.
- **Dữ liệu** được đọc và ghi trên Supabase Cloud. Các luồng có hỗ trợ Realtime cập nhật giao diện khi dữ liệu thay đổi.

## Công nghệ và kiến trúc

- **Giao diện** dùng HTML, CSS và JavaScript, với Bootstrap cho các thành phần giao diện đang sử dụng thư viện này.
- **Máy chủ** dùng Node.js và Express để phục vụ giao diện, xử lý API, xác thực và các nghiệp vụ cần chạy phía máy chủ.
- **Cơ sở dữ liệu** dùng Supabase PostgreSQL, Supabase Auth và Realtime. Các tệp SQL quản lý lược đồ và hàm nghiệp vụ nằm trong `my-server/scripts/database/`.
- **Ảnh tải lên** được xử lý qua API media. MongoDB GridFS lưu nội dung tệp, còn Supabase lưu thông tin ảnh, quyền truy cập và liên kết với hồ sơ nghiệp vụ.
- **Chatbot** có các luồng tra cứu dữ liệu và hỗ trợ bằng Gemini khi cấu hình tương ứng được bật.

Khi chạy local, Express phục vụ `my-client/` và xử lý các yêu cầu `/api/...` trên cùng địa chỉ. Trên Vercel, `my-client/` là đầu ra tĩnh, còn `api/` là các điểm vào gọi cùng hàm xử lý trong `my-server/api/`.

## Cài đặt và chạy local

1. Cài Node.js từ 22 trở lên và npm. Có thể kiểm tra bằng `node --version` và `npm --version`.
2. Mở terminal tại thư mục gốc PawPal, nơi có `package.json` và `package-lock.json`.
3. Tạo tệp `.env` tại thư mục gốc theo mẫu bên dưới. Xin thông tin kết nối từ người quản lý dự án.
4. Cài thư viện và khởi động máy chủ.

```powershell
npm ci
npm start
```

Sau lần cài đặt đầu tiên, dùng `npm start` để chạy lại. Lệnh này gọi `node my-server/server.js`. `npm run dev` dùng cùng điểm khởi động. Mặc định máy chủ chạy ở cổng 3000. Nếu đặt `PORT` trong `.env`, mở địa chỉ được in trong terminal. Nhấn `Ctrl+C` để dừng máy chủ.

- [Trang chủ](http://localhost:3000/)
- [Danh mục dịch vụ](http://localhost:3000/services)
- [Cửa hàng](http://localhost:3000/shop)
- [Đăng nhập khách hàng](http://localhost:3000/login)
- [Đăng nhập quản trị](http://localhost:3000/admin/login)

### Hướng dẫn đăng nhập

Chọn trang đăng nhập theo vai trò, sau đó nhập tài khoản kiểm thử tương ứng.

- **Quản trị viên** vào trang đăng nhập quản trị. Email `admin.local@pawpal.test`, mật khẩu `pawpal@123`.
- **Nhân viên** vào trang đăng nhập quản trị. Email `nguyentest@gmail.com`, mật khẩu `0987412365`.
- **Khách hàng thành viên** vào trang đăng nhập khách hàng. Tên đăng nhập `0007277387`, mật khẩu `Pawpal@123`.

### Mẫu cấu hình `.env`

Thay các giá trị mẫu bằng cấu hình được cấp. Với môi trường PawPal hiện tại, cả hai URL trỏ đến project Supabase `cpzuvaplseielhgcnqrn`.

```dotenv
PORT=3000

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-key
SUPABASE_SERVICE_ROLE_KEY=your-server-key

PAWPAL_ADMIN_SUPABASE_URL=https://your-project.supabase.co
PAWPAL_ADMIN_SUPABASE_ANON_KEY=your-public-key
PAWPAL_ADMIN_SUPABASE_SERVICE_ROLE_KEY=your-server-key
```

Nhóm `SUPABASE_*` phục vụ cổng khách hàng và các API, nhóm `PAWPAL_ADMIN_SUPABASE_*` phục vụ quản trị. Khóa đặc quyền chỉ dùng trên máy chủ. Để `.env` thật, `.env.local` và thông tin đăng nhập cá nhân ngoài Git và gói nộp. Khi chạy local, ứng dụng vẫn dùng Supabase Cloud, nên cần kết nối Internet.

### Cấu hình dịch vụ bổ sung

- **Ảnh tải lên:** thiết lập nhóm biến MongoDB và Supabase dành cho media. Chỉ bật `MEDIA_UPLOAD_ENABLED=true` ở môi trường được phép nhận ảnh. [Mẫu cấu hình media](my-server/config/media.env.example)
- **Chatbot:** cấu hình Gemini và các cờ chức năng theo môi trường triển khai. Các bài kiểm thử offline có thể dùng phản hồi mô phỏng.
- **VNPay:** dùng cho thử nghiệm sandbox. Đường dẫn thử local là `/vnpay-sandbox`.

## Cấu trúc chính

```text
Pawpal/
├── my-client/
│   ├── index.html
│   ├── pages/                  Trang khách hàng và quản trị
│   ├── components/             Thành phần giao diện dùng chung
│   ├── scripts/                JavaScript chạy trên trình duyệt
│   ├── styles/                 CSS dùng chung
│   └── assets/                 Ảnh và tài nguyên tĩnh
├── my-server/
│   ├── server.js               Điểm khởi động Express
│   ├── api/                    Hàm xử lý yêu cầu HTTP
│   ├── scripts/api/            Mã nghiệp vụ phía máy chủ
│   ├── scripts/database/       Migration và công cụ CSDL
│   ├── data/                   Hai CSV nhập danh mục
│   └── config/                 Mẫu cấu hình media
├── api/                        Điểm vào các hàm Vercel
├── scripts/test/               Kiểm thử trình duyệt và máy chủ
├── docs/                       Tài liệu kỹ thuật và kiểm thử
├── package.json
├── package-lock.json
└── vercel.json
```

Giữ `api/` và `vercel.json` ở thư mục gốc khi triển khai Vercel. URL giao diện giữ dạng `/services`, `/shop` và `/admin`. Các đường dẫn như `/assets/...` và `/scripts/...` trỏ đến tài nguyên bên trong `my-client/`.

## Cơ sở dữ liệu và nhập danh mục

Hai tệp `my-server/data/Dich_vu_data_final.csv` và `my-server/data/San_pham_final.csv` là đầu vào của công cụ nhập danh mục. Có thể kiểm tra định dạng và dữ liệu nguồn mà không kết nối Supabase bằng hai lệnh sau.

```powershell
node my-server/scripts/database/v1/import_service_catalog_final.cjs --validate
node my-server/scripts/database/v1/import_product_catalog_final.cjs --validate
```

Nếu kết quả kiểm tra dịch vụ có danh sách `missingImages`, đối chiếu các tên ảnh đó với `my-client/assets/images/services/` trước khi nhập danh mục. Khởi động ứng dụng và kiểm tra CSV không tự chạy migration hay nhập dữ liệu. Người quản trị CSDL thực hiện các thao tác đó khi cần. [Hướng dẫn công cụ CSDL](my-server/scripts/database/v1/README.md)

## Kiểm thử và kiểm tra nhanh

Chạy các lệnh trong thư mục gốc.

```powershell
npm run test:media
node --test scripts/test/vercel_routes.test.cjs
```

Lệnh đầu kiểm tra media, cấu hình Admin và cập nhật dữ liệu theo thời gian thực bằng dữ liệu mô phỏng. Lệnh thứ hai đối chiếu định tuyến Express với cấu hình Vercel. Sau khi khởi động, có thể mở cửa hàng, danh mục dịch vụ và trang đăng nhập Admin để kiểm tra dữ liệu và ảnh. Với tài khoản được cấp, mở **Dịch vụ → Lịch hẹn → Tiếp nhận** để kiểm tra danh sách kỹ thuật viên.

### Xử lý lỗi thường gặp

- Nếu gặp `supabaseUrl is required`, kiểm tra `.env` nằm cạnh `package.json` và có `SUPABASE_URL`. Khởi động lại sau khi chỉnh biến môi trường.
- Nếu báo `EADDRINUSE`, dừng tiến trình đang dùng cổng hoặc đặt cổng khác bằng `PORT` trong `.env`.
- Nếu `/api/admin-config` trả HTTP 503, kiểm tra URL và khóa công khai của Supabase Admin trong môi trường đang chạy.
- Nếu tải ảnh trả `MEDIA_DISABLED`, kiểm tra cờ tải ảnh và cấu hình media của môi trường thử nghiệm.

## Tài liệu

- [Quy chuẩn giao diện Admin](docs/design/ADMIN_DESIGN_SYSTEM.md)
- [Hướng dẫn ảnh và MongoDB](docs/Guide-Upload-Images-MongoDB.md)
- [Báo cáo kiểm thử chatbot](docs/chatbot/BAO_CAO_KIEM_THU_CHATBOT_2026-11-25.md)

Bản quyền © 2026 PawPal Team.
