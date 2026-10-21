# Kiểm tra HTTP localhost — GĐ-00

Thời điểm: 2026-10-21T02:20:45.951Z (UTC).

Chỉ GET route/asset trên localhost:3000; không chạy JavaScript, không chứng minh form hoạt động hoặc deployment production.

| Route | HTTP | So sánh source |
|---|---|---|
| /admin | 200 | Chưa so |
| /contact | 200 | Chưa so |
| /login | 200 | Chưa so |
| /booking | 200 | Chưa so |
| /checkout | 200 | Chưa so |
| /scripts/shared/address-validation.mjs | 200 | SHA-256 khớp local |
