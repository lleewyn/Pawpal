# PawPal Backend

Khung backend MongoDB ban đầu cho PawPal.

## Mục tiêu
- Giữ nguyên front-end hiện tại.
- Bổ sung Express API để thay dần dữ liệu JSON/localStorage.
- Chuẩn bị đường chuyển sang MongoDB theo từng collection.

## Chạy thử
1. Copy `.env.example` thành `.env`
2. Điền `MONGODB_URI`
3. Cài dependencies
4. Chạy `npm run server`

## Seed dữ liệu
- Chạy `node backend/src/seed/importSeed.js`
- Script sẽ import `users`, `pets`, `bookings`, `orders` từ thư mục `/data`

## API hiện có
- `GET /health`
- `GET /api`

## Bước tiếp theo
- Tạo model cho `users`, `pets`, `bookings`, `orders`
- Viết seed script import từ `/data`
- Đổi `scripts/api/api.js` sang gọi API thật
