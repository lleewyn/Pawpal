# PawPal Design System Specifications

Tài liệu này xác định các thông số kỹ thuật (Design Tokens & Variables) cho hệ thống thiết kế của PawPal, tuân thủ nghiêm ngặt các tiêu chuẩn thẩm mỹ cao cấp và chống rập khuôn.

---

## 1. Các biến cấu hình cốt lõi (Core Dials)
Các thông số này điều khiển mật độ trực quan, mức độ chuyển động và tính phi đối xứng của bố cục:

*   **`DESIGN_VARIANCE: 7`** - Layout không cân đối đối xứng (asymmetric), sử dụng các nhịp ngắt bố cục tự nhiên để loại bỏ cảm giác "AI template".
*   **`MOTION_INTENSITY: 6`** - Sử dụng Smooth Scroll (Lenis) và Scroll-driven animations (GSAP) có kiểm soát để tạo độ sâu, không lạm dụng chuyển động lặp vô nghĩa.
*   **`VISUAL_DENSITY: 3`** - Thiết kế thoáng đãng như tạp chí (Editorial), khoảng trắng (whitespace) rộng rãi để thông điệp và hình ảnh "hít thở".

---

## 2. Hệ màu sắc (Color Calibration)
Đồng bộ hoàn toàn với các biến CSS trong [style.css](file:///d:/Aboutme/MyProject/Pawpal/assets/css/style.css):

| Vai trò | Biến CSS | Giá trị thực | Mã Hex tương đương | Ý nghĩa cảm xúc |
| :--- | :--- | :--- | :--- | :--- |
| **Primary** | `--color-primary` | `hsl(156, 36%, 26%)` | `#2A5944` | Forest Green: Tin cậy, tự nhiên, an tâm |
| **Accent** | `--color-accent` | `hsl(38, 77%, 57%)` | `#E5A93C` | Gold: Ấm áp, tích cực, cao cấp |
| **Background Light** | `--color-bg-light` | `#FAF9F6` | `#FAF9F6` | Warm Cream: Editorial nền nhã nhặn |
| **Text Dark** | `--color-text-dark` | `#2D3732` | `#2D3732` | Deep Charcoal: Dễ đọc, tương phản cao |
| **Text Light** | `--color-text-light` | `#606F66` | `#606F66` | Muted Olive-Grey: Chữ phụ mềm mại |

---

## 3. Hệ Font chữ & Căn chỉnh (Typography System)
Đã được nâng cấp để tối ưu hóa hiển thị tiếng Việt, giảm tracking để chữ kết nối chặt chẽ hơn:

*   **Display / Large Titles (H1, Hero):**
    *   Font: `Playfair Display` (Serif)
    *   Căn chỉnh: `letter-spacing: -0.02em`, `line-height: 1.1`
*   **Section Headers (H2, H3):**
    *   Font: `Playfair Display` (Serif)
    *   Căn chỉnh: `letter-spacing: -0.04em`, `line-height: 1.1`
*   **Body & Utility Text (P, Buttons, Forms):**
    *   Font: `Plus Jakarta Sans` (Sans-serif)
    *   Căn chỉnh: `line-height: 1.6`, `letter-spacing: -0.01em`

---

## 4. Quy chuẩn Bố cục & Bo góc (Layout & Shape Constraints)
Đảm bảo tính đồng bộ trên toàn trang:
*   **Bo góc (Shape Consistency):**
    *   Card lớn & Khối nội dung: `24px` (`--border-radius-lg`)
    *   Card dịch vụ & Ảnh: `16px` (`--border-radius-md`)
    *   Buttons & Inputs: Pill shape (tròn đầu) hoặc `8px` (`--border-radius-sm`) cho input.
*   **Khoảng trắng (Section Spacing):**
    *   Khoảng cách giữa các phần lớn: `120px` đến `140px` để tạo chiều sâu trực quan.

---

## 5. Hệ thống Chuyển động (Motion System & Animations)
PawPal sử dụng hệ thống chuyển động premium kết hợp giữa **Lenis Smooth Scroll** và **GSAP ScrollTrigger**:

*   **Smooth Scroll (Lenis):** Đảm bảo cuộn trang mượt mà như native app, không bị khựng kể cả trên web.
*   **GSAP ScrollTrigger:** Áp dụng hiệu ứng mờ dần và trượt lên (`opacity: 0, y: 40/50`) cho các khối nội dung khi cuộn tới.
*   **⚠️ LƯU Ý KỸ THUẬT QUAN TRỌNG (Bug Prevention):**
    1. **Bắt buộc dùng `clearProps: "all"`:** Mọi hàm `gsap.from()` phải đi kèm `clearProps: "all"` để dọn dẹp các CSS nội tuyến ngay sau khi hiệu ứng kết thúc. Điều này ngăn chặn lỗi thẻ bị kẹt `opacity: 0` khi người dùng cuộn quá nhanh hoặc truy cập trực tiếp bằng anchor link (ví dụ: `index.html#shop`).
    2. **Không dùng `x` cho thẻ nằm trong khung cuộn ngang:** Đối với các khối có `overflow-x: auto` (như phần Dịch vụ), chỉ được animate trục `y`. Tuyệt đối không animate trục `x` vì sẽ làm sai lệch cơ chế tính toán overflow và scroll-snap của trình duyệt.

---

## 6. Hệ thống Responsive Framework (Bootstrap 5.3 Integration)
PawPal sử dụng **Bootstrap 5.3** (latest stable, CDN) theo mô hình **"Bootstrap Grid + PawPal Custom"**:

*   **Vai trò của Bootstrap:**
    *   Grid system (`container`, `row`, `col-*`) để xử lý responsive layout.
    *   Responsive utilities (`d-none`, `d-md-block`, `d-lg-flex`...) để ẩn/hiện phần tử theo breakpoint.
    *   Navbar component (collapse/offcanvas) để xử lý mobile navigation — thay thế JS custom.
    *   Spacing utilities (`mb-4`, `py-5`, `gap-3`...) khi cần bổ sung nhanh.
*   **KHÔNG dùng Bootstrap cho:**
    *   Toàn bộ design tokens (màu sắc, font, border-radius, shadow) — giữ nguyên CSS variables PawPal.
    *   Card styling, modal styling, button styling — giữ nguyên PawPal custom CSS.
    *   Animation/Motion — giữ nguyên GSAP + Lenis.
*   **⚠️ QUY TẮC CSS LOAD ORDER (Bắt buộc):**
    1. **Bootstrap CSS** phải load **TRƯỚC** `style.css` trong `<head>`.
    2. `style.css` (PawPal custom) luôn override Bootstrap defaults nhờ load sau.
    3. Mọi page-specific CSS (`services.css`, `shop.css`...) load **SAU** `style.css`.
*   **⚠️ BOOTSTRAP JS BUNDLE:**
    *   Dùng `bootstrap.bundle.min.js` (bao gồm Popper.js).
    *   Load **TRƯỚC** Lenis/GSAP scripts trong `<body>`.

---

## 7. Hệ thống Breakpoints & Grid Responsive
Tuân theo hệ breakpoint chuẩn Bootstrap 5.3, áp dụng cho toàn bộ layout PawPal:

| Breakpoint | Ký hiệu BS | Min-width | Thiết bị mục tiêu | Columns mặc định |
| :--- | :--- | :--- | :--- | :--- |
| **X-Small** | _(none)_ | `< 576px` | Điện thoại dọc | 1 cột |
| **Small** | `sm` | `≥ 576px` | Điện thoại ngang | 1–2 cột |
| **Medium** | `md` | `≥ 768px` | Tablet dọc | 2–3 cột |
| **Large** | `lg` | `≥ 992px` | Tablet ngang / Desktop nhỏ | 3–4 cột |
| **X-Large** | `xl` | `≥ 1200px` | Desktop | 4 cột (full layout) |
| **XX-Large** | `xxl` | `≥ 1400px` | Desktop lớn | 4 cột (container max-width) |

**Quy tắc Grid cho từng section trên trang chủ:**

| Section | Mobile (`<576px`) | Tablet (`≥768px`) | Desktop (`≥992px`) |
| :--- | :--- | :--- | :--- |
| Features | 1 cột | 2 cột (`col-md-6`) | 4 cột (`col-lg-3`) |
| Services Carousel | Cuộn ngang | Cuộn ngang | Cuộn ngang |
| Tracker | Stack dọc | Stack dọc | 2 cột (`col-lg-6`) |
| Safety | 1 cột | 3 cột (`col-md-4`) | 3 cột |
| Experts | 1 cột | 2 cột (`col-md-6`) | 3 cột (`col-lg-4`) |
| Process Steps | 1 cột | 3 cột (`col-md-4`) | 3 cột |
| Shop Products | 2 cột (`col-6`) | 3 cột (`col-md-4`) | 4 cột (`col-lg-3`) |
| Footer | 1 cột | 2 cột (`col-sm-6`) | 4 cột (`col-lg-3`) |

**Quy tắc khoảng trắng responsive:**
*   Desktop: Section padding `120px–140px` (giữ nguyên editorial spacing).
*   Tablet: Section padding giảm còn `80px–100px`.
*   Mobile: Section padding giảm còn `60px–80px`.
*   Container max-width: `1300px` (override Bootstrap mặc định `1320px` để khớp PawPal design).
