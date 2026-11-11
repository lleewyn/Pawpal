# Trang đăng nhập quản trị

Thiết kế theo ảnh tham chiếu của người dùng: nền studio sáng, form kính mờ, mèo ôm cạnh phải. Dùng ảnh tách nền và các lớp bàn chân bằng CSS; không cần WebGL cho cảnh tĩnh. Giữ nguyên xác thực Supabase và luồng đổi mật khẩu lần đầu.

Ảnh: `assets/images/admin/login-cat.webp` (1000 × 1333, có alpha, 247.036 byte). Tạo bằng công cụ image_gen tích hợp, chuyển sang WebP bằng Sharp.

Prompt tạo ảnh:

> Create a photorealistic studio cutout asset for a website. A cute realistic gray brown tabby cat with white chest and white paws, sitting upright, full body including curled tail extending to right. Cat is on the right of the transparent canvas, leaning its head left inquisitively. Its left front paw reaches left at about 30 percent down the image, resting on the top edge of an INVISIBLE panel; other front paw reaches left at 48 percent down as if wrapping around the right edge of an invisible upright rectangular login card. No actual panel, no rectangle, no text, no props. Leave leftmost 25 percent of canvas transparent, cat occupies right 75 percent. Full ears, full feet and tail visible. Soft natural studio light from upper left, detailed soft fur, realistic proportions, green eyes. Transparent background. Portrait 3:4 composition. Save resulting image in workspace D:/Aboutme/MyProject/Pawpal/assets/images/admin/login-cat.png if filesystem output is supported.

Kiểm tra: hiển thị trực quan desktop và điện thoại; không tràn ngang ở 320, 390, 768, 1024 và 1448px; hiện/ẩn mật khẩu và kiểm tra trường bắt buộc hoạt động. JavaScript syntax và git diff --check đạt. Không đăng nhập bằng tài khoản thật, không thay đổi dữ liệu CSDL.
