# PawPal

Website quản lý dịch vụ chăm sóc thú cưng và bán sản phẩm, gồm cổng khách hàng và hệ thống quản trị Pawpal-er.

**Website:** [pawpalgr3.vercel.app](https://pawpalgr3.vercel.app/)

## Chạy dự án

Yêu cầu Node.js và npm.

```sh
npm ci
npm start
```

Mở địa chỉ được in trong terminal (mặc định [localhost:3000](http://localhost:3000), hoặc cổng `PORT` trong `.env`). Trước khi chạy, tạo `.env` với cấu hình Cloud do người quản lý dự án cung cấp:

`npm run dev` cũng khởi động cùng máy chủ phát triển. Máy chủ web chạy trên máy, CSDL vẫn dùng Supabase Cloud; không cần Docker hoặc CSDL local.

- Khách hàng và API: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Quản trị: `PAWPAL_ADMIN_SUPABASE_URL`, `PAWPAL_ADMIN_SUPABASE_ANON_KEY`, `PAWPAL_ADMIN_SUPABASE_SERVICE_ROLE_KEY`.

Các URL phải trỏ tới project hiện tại `cpzuvaplseielhgcnqrn`. Giữ khóa đặc quyền ở phía máy chủ, không đưa `.env` hoặc thông tin đăng nhập vào Git.

Web chạy trên máy và Vercel đều dùng Supabase Cloud. Các script CSDL local cũ đã được gỡ; dự án không còn phụ thuộc Docker. Công cụ SQL Cloud dùng PostgreSQL client trực tiếp (`psql`, `pg_dump` trong PATH hoặc thư mục `PAWPAL_PG_BIN`); đây là công cụ kết nối Cloud, không phải CSDL local. Xem [hướng dẫn CSDL](my-server/scripts/database/v1/README.md).

## Chức năng

- Khách hàng: hồ sơ, thú cưng, nhật ký chăm sóc, đặt lịch spa/khách sạn/xe, mua hàng, đổi trả, đánh giá, Paw Points, yêu thích và hỗ trợ.
- Quản trị: Dashboard, Khách hàng, Thú cưng, Dịch vụ, Bán hàng, Nhân sự, Khiếu nại, Chatbot và Cấu hình.
- Dữ liệu nghiệp vụ đọc/ghi qua Supabase Cloud và đồng bộ Realtime theo các luồng đã nghiệm thu.

## Cấu trúc chính

- **my-client/** chứa giao diện khách hàng, quản trị và tài nguyên tĩnh.
- **my-server/** chứa máy chủ Express, API, migration và công cụ CSDL. Hai CSV nhập danh mục nằm trong my-server/data/.
- **api/** chứa các điểm vào Vercel dùng chung handler với Express.
- **scripts/test/** chứa các bài kiểm thử offline và tích hợp.

Express phục vụ tệp tĩnh từ my-client/. Trình duyệt gọi API trên cùng tên miền qua /api/. Cấu hình Vercel dùng my-client làm thư mục đầu ra tĩnh.

## Tài liệu

- [Quy chuẩn giao diện Admin](docs/design/ADMIN_DESIGN_SYSTEM.md)
- [Hướng dẫn ảnh và MongoDB](docs/Guide-Upload-Images-MongoDB.md)

Bản quyền © 2026 PawPal Team.
