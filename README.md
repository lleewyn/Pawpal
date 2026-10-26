# PawPal

Website quản lý dịch vụ chăm sóc thú cưng và bán sản phẩm, gồm cổng khách hàng và hệ thống quản trị Pawpal-er.

**Website:** [pawpalgr3.vercel.app](https://pawpalgr3.vercel.app/) · **Tài liệu:** [docs/README.md](docs/README.md)

## Chạy dự án

Yêu cầu Node.js và npm.

```sh
npm install
npm run dev
```

Mở [localhost:3000](http://localhost:3000). Trước khi chạy, tạo `.env` với cấu hình Cloud do người quản lý dự án cung cấp:

- Khách hàng và API: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Quản trị: `PAWPAL_ADMIN_SUPABASE_URL`, `PAWPAL_ADMIN_SUPABASE_ANON_KEY`, `PAWPAL_ADMIN_SUPABASE_SERVICE_ROLE_KEY`.

Các URL phải trỏ tới project hiện tại `cpzuvaplseielhgcnqrn`. Giữ khóa đặc quyền ở phía máy chủ, không đưa `.env` hoặc thông tin đăng nhập vào Git.

Web chạy trên máy và Vercel đều dùng Supabase Cloud. Các script CSDL local cũ đã được gỡ; dự án không còn phụ thuộc Docker. Công cụ SQL Cloud dùng PostgreSQL client trực tiếp (`psql`, `pg_dump` trong PATH hoặc thư mục `PAWPAL_PG_BIN`); đây là công cụ kết nối Cloud, không phải CSDL local. Xem [hướng dẫn CSDL](scripts/database/v1/README.md).

## Chức năng

- Khách hàng: hồ sơ, thú cưng, nhật ký chăm sóc, đặt lịch spa/khách sạn/xe, mua hàng, đổi trả, đánh giá, Paw Points, yêu thích và hỗ trợ.
- Quản trị: Dashboard, Khách hàng, Thú cưng, Dịch vụ, Bán hàng, Nhân sự, Khiếu nại, Chatbot và Cấu hình.
- Dữ liệu nghiệp vụ đọc/ghi qua Supabase Cloud và đồng bộ Realtime theo các luồng đã nghiệm thu.

Phạm vi, kết quả kiểm thử và các phần đã hoãn được ghi tại [nghiệm thu tổng hợp](docs/acceptance/PAWPAL_DICH_VU_V1_NGHIEM_THU.md).

## Cấu trúc chính

```text
api/                  API triển khai trên Vercel
assets/               Ảnh, biểu tượng và tài nguyên tĩnh
components/           Header, footer và thành phần dùng chung
docs/                 Tài liệu, nghiệm thu và mục lưu trữ
pages/admin/          Giao diện quản trị
pages/user/           Cổng khách hàng
pages/public/         Các trang công khai
pages/services/       Danh mục, chi tiết và đặt dịch vụ
pages/shop/           Cửa hàng, giỏ hàng và thanh toán
scripts/api/          API và kết nối dữ liệu
scripts/database/     Migrations và công cụ CSDL
scripts/shared/       Mã dùng chung
scripts/test/         Kiểm thử offline và tích hợp
server.js             Máy chủ phát triển local
```

## Tài liệu thường dùng

- [Mục lục tài liệu](docs/README.md)
- [Thiết kế CSDL 3NF V1](docs/database/PAWPAL_THIET_KE_DATABASE_3NF_V1.md)
- [Bảng CSDL trên Cloud hiện tại](docs/database/PAWPAL_CSDL_CLOUD_MOI_HIEN_TAI_DANG_BANG.md)
- [Nghiệm thu và kiểm tra liên thông](docs/acceptance/PAWPAL_DICH_VU_V1_NGHIEM_THU.md)

Tài liệu Cloud cũ/self-host và kế hoạch đã hoàn tất nằm trong `docs/archive/`. Việc sắp xếp tài liệu không xóa project hay dữ liệu Supabase nào.

Bản quyền © 2026 PawPal Team.
