# Bản guest sẵn sàng phát hành production

Ngày chuẩn bị: 27/10/2026.

## Nội dung chờ phát hành

Code đã push trên `feat/guest-admin-identity` tới `972bf577`; gồm catalog/luồng guest, Admin nhận diện guest, API/session, đặt lịch, checkout, liên kết OTP giả lập và đổi phân loại trong giỏ. Production/main hiện ở `51548731` khi fetch chuẩn bị bản này. Ba commit từ production tới nhánh guest có thể fast-forward, không có xung đột.

Checkout riêng: `D:/Aboutme/Pawpal-infra/guest-production-release`, nhánh `release/guest-production-20261027`. Không dùng diff chưa commit của About, Blog, giao diện chatbot hoặc ảnh kiểm thử cũ trong workspace chính.

## Kiểm tra trên checkout sạch

- [x] 112/112 test Node PASS: Auth, UI Auth, cookie/link, commerce guards/client, guest cart/checkout preferences/pet context/profile/recovery, member cart persistence và checkout request.
- [x] Chrome module giỏ thật/CSS thật với catalog fixture PASS: chọn phân loại, ảnh/giá/tổng, số lượng, gộp, tồn kho, selection và mobile.
- [x] Chrome module checkout với API fixture PASS: validation, uncertain failure/retry, receipt, cleanup và sửa contact.
- [x] 34 file JavaScript runtime thay đổi so với main qua kiểm tra cú pháp.
- [x] Rewrite `/api/customer/guest/:path*` đúng handler; `.vercelignore` loại `.env`, private files, test, database scripts và docs khỏi upload deployment.
- [x] `git diff --check origin/main...HEAD` PASS.
- [x] GitHub/Vercel báo Preview của `972bf577` thành công. Preview yêu cầu Vercel SSO; không tính là nghiệm thu UI production.
- [ ] Push bản phát hành lên `origin/main` sau yêu cầu rõ ràng của người dùng.
- [ ] Đợi Vercel deployment Production thành công, kiểm tra đúng SHA và module/API đã cập nhật.
- [ ] Chạy kiểm tra giao diện production, phiên guest và giỏ, ghi kết quả thực tế vào checklist.

Lệnh test Node đã chạy từ checkout riêng, dùng dependency hiện có qua `NODE_PATH`:

```powershell
node --test scripts/test/customer_auth.test.js scripts/test/customer_auth_ui.test.js scripts/test/guest_account_cookie.test.cjs scripts/test/guest_commerce_http_guards.test.cjs scripts/test/guest_commerce_client.test.cjs scripts/test/guest_cart.test.cjs scripts/test/guest_checkout_preferences.test.cjs scripts/test/guest_booking_pet_context.test.cjs scripts/test/guest_profile_edit_http.test.cjs scripts/test/guest_recovery_http.test.cjs scripts/test/cart_persistence.test.mjs scripts/test/checkout_request.test.mjs
node scripts/test/guest_cart_variant_ui.cjs
node scripts/test/guest_checkout_validation_ui.cjs
```

Không chạy lại giao dịch Cloud chỉ để kiểm tra checkout Git; bằng chứng committed và dọn fixture của lượt trước vẫn ở [OTP giả lập](guest-demo-otp.md). Không thêm polling, load test hoặc migration mới.

## Khôi phục nếu phát hành gặp lỗi

Mốc production trước phát hành: `515487316452d2df1394984e74d45926c4f0cca9`. Ưu tiên khôi phục deployment Production trước đó qua Vercel; hoặc tạo commit đảo các thay đổi phát hành trên main, không force-push hay xóa lịch sử. Không đảo migration Cloud hoặc phục hồi cookie đã thu hồi; dữ liệu liên kết giữ nguyên. Khách đã có Auth dùng đăng nhập/Quên mật khẩu hiện có.

Việc push đang chờ vì [AGENTS.md](../../../AGENTS.md), mục 10 quy định: “Chỉ chạy git push khi người dùng yêu cầu rõ ràng.” Mục 12 cũng yêu cầu không coi yêu cầu sửa tiếp là yêu cầu push. Bản hợp nhất và các kiểm tra đã hoàn tất trước bước xác nhận này.
