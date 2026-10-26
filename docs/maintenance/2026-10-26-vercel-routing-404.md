# Sửa 404 URL Vercel — 26/10/2026

## Đã xác minh

- `https://pawpalgr3.vercel.app/` trả 200.
- `/services`, `/admin`, `/user` trả 404 với `x-vercel-error: NOT_FOUND`.
- `/pages/services/index.html`, `/pages/shop/index.html` và `/api/admin-config` trả 200. Nội dung trang và function vẫn có, nhưng URL sạch không được ánh xạ.
- Domain trong ảnh `pawpalgr3-llwyns-projects.vercel.app` yêu cầu SSO khi truy cập từ phiên chưa đăng nhập Vercel. Không thay đổi Deployment Protection; kiểm tra lỗi route trên domain production công khai ở trên.
- `vercel.json` bị xóa trong commit `0ef89a39`; không có trong HEAD hiện tại. Route `/services` vẫn tồn tại trong `server.js`, nên chạy local không tái hiện được cấu hình Vercel bị thiếu.

## Bản sửa local

- Khôi phục `vercel.json`, đặt framework Other (`null`), output root, không chạy build server cho các trang tĩnh.
- 105 rewrite: các trang và asset alias theo `sendFile` trong server local, những alias cũ còn đích hợp lệ, các route API Auth và module Admin.
- 59 redirect cho đường dẫn HTML cũ và phần tài khoản. Trang chủ phục vụ `index.html`, không redirect thành vòng lặp.
- Giữ các API dưới `/api` trỏ đến function, không dùng catch-all trả trang chủ cho mọi URL.
- Cả 61 file đích duy nhất đều đã nằm trong HEAD; có thể push riêng bản sửa route mà không đưa các thay đổi frontend chưa commit lên production.

## Kiểm tra

`node --test scripts/test/vercel_routes.test.cjs`: 4 test PASS, đối chiếu đầy đủ route local/Vercel, đích file, alias API, URL cũ và không trùng source/vòng lặp trang chủ.

Chưa push/redeploy; production vẫn cần phát hành cấu hình này rồi kiểm tra HTTP lại. Chưa thay cấu hình dự án/domain hay ghi dữ liệu Supabase. Không dùng Logs hoặc kiểm thử tải.

Tài liệu cấu hình tham chiếu: [Vercel vercel.json](https://vercel.com/docs/project-configuration/vercel-json).
