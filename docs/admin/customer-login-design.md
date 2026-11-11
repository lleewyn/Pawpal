# Thiết kế đăng nhập khách hàng

Trang `/login` dùng ảnh chó con ở lớp trước mép trên của form. Giữ header, footer và toàn bộ luồng xác thực hiện có. Điện thoại thấp ẩn ảnh; điện thoại hẹp ẩn nút liên hệ nổi để tránh che trường nhập.

Asset: `assets/images/publics/login-puppy.webp`, 1000 × 750, có alpha, 215.034 byte. Tạo bằng image_gen tích hợp, nén WebP bằng Sharp.

Prompt đã dùng:

> Website decorative transparent cutout asset, photorealistic adorable golden retriever puppy peeking over an invisible horizontal ledge. Only head, floppy ears and TWO front paws visible, NO torso NO legs NO tail NO panel NO props NO text. Head gently tilted to viewer right, chin resting at ledge level. Both fluffy paws hang over the imaginary ledge, one to left of face and one to right, naturally curved soft silhouette with no rectangular clipping. Head and ears fill upper 75% of a wide 4:3 canvas; paws extend a little below chin level and are the lowest parts of the asset. Entire silhouette has true alpha transparency, including between paws. Warm cream golden fur, sweet dark eyes, small black nose. Soft studio lighting, fine fur detail, realistic photography. Use asset as foreground overlapping the top-right corner of a white website login form. No white panel baked into image. Transparent background.

Kiểm tra: desktop và điện thoại bằng trình duyệt, chuyển tab đăng nhập/đăng ký, không tràn ngang ở 320/390/768/1440px. Bốn bài kiểm thử trong `scripts/test/customer_auth_ui.test.js` đạt; JS syntax và git diff --check đạt. Không gửi OTP hay đăng nhập bằng tài khoản thật.
