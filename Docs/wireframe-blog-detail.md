# Wireframe: Trang Chi Tiết Cẩm Nang (Blog Detail Page)

## 1. Mục đích
Trang này dùng để hiển thị nội dung chi tiết của một bài viết (blog post) thuộc chuyên mục Cẩm nang/Kiến thức chăm sóc của PawPal. Mục tiêu là cung cấp trải nghiệm đọc thoải mái, dễ chịu, đồng thời khuyến khích người dùng tương tác (chia sẻ, bình luận) và mua sắm các sản phẩm liên quan.

## 2. Cấu trúc Layout (Grid / Flexbox)
Layout sẽ sử dụng cấu trúc **2 cột** cho phần thân trang ở màn hình lớn (Desktop), và **1 cột** ở màn hình nhỏ (Mobile/Tablet).

*   **Header**: Component Navbar chung của toàn trang.
*   **Breadcrumbs**: Điều hướng (VD: Trang chủ > Cẩm nang > Kiến thức chăm sóc > Có nên tắm cho chó...).
*   **Hero Article**: Chứa Tiêu đề lớn, thông tin tác giả, ngày đăng, và Ảnh bìa (Cover Image) tràn viền hoặc có bo góc.
*   **Body Content (2 Cột)**:
    *   **Cột chính (Trái - 70%)**: Nội dung chi tiết bài viết, Mục lục, Các thẻ heading, hình ảnh minh họa, box sản phẩm nhúng trong bài, phần Tác giả, và Bình luận.
    *   **Cột phụ (Phải - 30% - Sticky)**: Thanh bên (Sidebar) chứa hộp tìm kiếm, Bài viết xem nhiều, Danh mục, và Quảng cáo sản phẩm liên quan.
*   **Bài viết liên quan (Bottom)**: 3 bài viết cùng chuyên mục.
*   **Footer**: Component Footer chung.

---

## 3. Chi tiết các Section

### 3.1. Breadcrumb & Blog Header
*   **Breadcrumb**: `Trang chủ / Cẩm nang / Chăm sóc chó / Có nên tắm cho chó vào mùa mưa?`
*   **Tiêu đề bài viết (H1)**: Font chữ to, nổi bật.
*   **Meta data**:
    *   Avatar tác giả + Tên tác giả (PawPal Team).
    *   Ngày đăng (24/07/2026).
    *   Thời gian đọc ước tính (5 phút đọc).
*   **Hành động**: Nút chia sẻ mạng xã hội (Facebook, Zalo, Copy Link) dạng icon nhỏ nằm ngang.
*   **Ảnh bìa (Featured Image)**: Hình ảnh chất lượng cao, bo góc mềm mại, có shadow nhẹ.

### 3.2. Main Content (Cột Trái)
*   **Nội dung bài viết (Rich Text)**:
    *   Các thẻ `<h2>`, `<h3>` rõ ràng, có margin rộng rãi để dễ đọc.
    *   Đoạn văn bản font `DM Sans` size 1.1rem, line-height 1.8 giúp mắt không bị mỏi.
    *   **Blockquote**: Dành cho các trích dẫn hoặc lưu ý quan trọng (Highlight màu vàng/xanh đặc trưng của PawPal).
    *   Hình ảnh minh họa nhúng trong bài có chú thích (caption) bên dưới.
    *   **Product Inline Box**: Hộp gợi ý sản phẩm liên quan (Ví dụ: Đang đọc bài tắm chó -> Hiện box "Sữa tắm cho chó" kèm nút "Thêm vào giỏ" ngay trong bài).
*   **Tags**: Nút hashtag (Ví dụ: `#TắmChoChó`, `#MùaMưa`, `#SứcKhỏe`).
*   **Box Tác giả**: Giới thiệu ngắn về tác giả/đội ngũ biên tập ở cuối bài.
*   **Khu vực Bình luận**:
    *   Thống kê số lượt bình luận.
    *   Ô nhập bình luận mới.
    *   Danh sách bình luận của người dùng khác (Mockup vài bình luận mẫu).

### 3.3. Sidebar (Cột Phải - Sticky)
*   **Thanh Tìm kiếm**: Ô input tìm bài viết.
*   **Mục lục (Table of Contents)**: Tự động bám theo nội dung bài viết khi cuộn trang (Sticky).
*   **Kiến thức xem nhiều (Trending)**: Danh sách top 3-5 bài viết có lượt xem cao nhất (hiển thị ảnh nhỏ + tiêu đề).
*   **Danh mục cẩm nang**: Khuyến mãi, Tin tức, Dinh dưỡng, Chăm sóc...
*   **Banner Quảng Cáo / Gợi ý Dịch vụ**: Box kêu gọi đặt lịch Spa/Grooming mùa mưa với nút CTA nổi bật.

### 3.4. Related Posts (Bài viết liên quan)
*   Tiêu đề: `Bài viết liên quan` hoặc `Đọc thêm`.
*   Layout: Grid 3 cột.
*   Component: Sử dụng lại `.blog-card-standard` đã có sẵn từ trang Blog chính.

---

## 4. Hành vi & Tương tác (Interactions)
*   **Scroll & Sticky**: Cột Sidebar bên phải (đặc biệt là Mục lục) sẽ trượt theo (sticky) khi người dùng cuộn dọc đọc nội dung bên trái.
*   **Table of Contents**: Click vào một thẻ heading trong mục lục sẽ cuộn mượt (smooth scroll) đến đoạn tương ứng trong bài.
*   **Image Zoom**: Click vào ảnh trong bài viết để xem kích thước lớn (Lightbox/Zoom).
*   **Share Buttons**: Nút chia sẻ Zalo/FB sẽ có hiệu ứng hover đổi màu.

## 5. Danh sách file cần tạo/chỉnh sửa
1.  **Tạo mới**: `pages/public/blog-detail.html`
2.  **Tạo mới**: `assets/css/public/blog-detail.css` (Kế thừa biến màu từ style.css)
3.  **Tạo mới/Cập nhật**: `assets/js/public/blog-detail.js` (Xử lý sticky sidebar, scroll spy cho mục lục).
4.  **Cập nhật**: Liên kết thẻ `<a>` ở trang `blog.html` trỏ về `blog-detail.html`.
