# Wireframe: About Us Page (Về Chúng Tôi)

> **Tài liệu thiết kế wireframe cho trang Về Chúng Tôi**
> 
> **Phiên bản:** 1.0  
> **Tuân thủ:** design.md - Bố cục bất đối xứng (No 50/50), Không phụ đề (No subtitles), Không dùng icon emoji, Không dùng ký tự "&", Luân phiên màu nền.

---

## 📌 Tổng quan

Trang **Về Chúng Tôi** giới thiệu câu chuyện, sứ mệnh, giá trị cốt lõi, đội ngũ chuyên gia và cơ sở vật chất của PawPal.
Cấu trúc trang tuân thủ nhịp độ (Vertical Rhythm) 4 tầng và xen kẽ các mảng màu nền (Dark/Light/White) theo chuẩn `DESIGN.md`.

---

## 🎨 Layout Structure

```text
┌─────────────────────────────────────────────────────────┐
│                    HEADER (Nav)                         │
├─────────────────────────────────────────────────────────┤
│  HERO SECTION (Background: --color-primary)             │
│  Layout: 60/40 (Bất đối xứng)                           │
│                                                         │
│  ┌────────────────────────┬──────────────────────────┐  │
│  │ Về PawPal              │ [Hình ảnh Hero]          │  │
│  │                        │                          │  │
│  │ Khởi nguồn từ tình     │                          │  │
│  │ yêu thương động vật,   │                          │  │
│  │ PawPal mang đến dịch   │                          │  │
│  │ vụ chăm sóc toàn diện  │                          │  │
│  │ chuẩn 5 sao.           │                          │  │
│  │                        │                          │  │
│  │ [Khám phá ngay]        │                          │  │
│  └────────────────────────┴──────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  CÂU CHUYỆN CỦA CHÚNG TÔI (Bg: --color-bg-light)        │
│  Layout: 40/60                                          │
│                                                         │
│  ┌────────────────┬──────────────────────────────────┐  │
│  │ [Hình ảnh      │ Hành trình phát triển            │  │
│  │  nhà sáng lập] │                                  │  │
│  │                │ PawPal được thành lập vào năm    │  │
│  │                │ 2023 với mục tiêu tạo ra một hệ  │  │
│  │                │ sinh thái chăm sóc thú cưng an   │  │
│  │                │ toàn, minh bạch và hiện đại      │  │
│  │                │ nhất tại Việt Nam.               │  │
│  └────────────────┴──────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  GIÁ TRỊ CỐT LÕI (Bg: --color-bg-white)                 │
│  Grid: 3 cột (Bento style)                              │
│                                                         │
│  Giá trị cốt lõi                                        │
│  ┌────────────────┬────────────────┬────────────────┐   │
│  │ [Icon Tâm]     │ [Icon Tín]     │ [Icon Tầm]     │   │
│  │ Tận Tâm        │ Uy Tín         │ Chuyên Nghiệp  │   │
│  │ Đặt thú cưng   │ Minh bạch      │ Đào tạo bài    │   │
│  │ lên hàng đầu.  │ trong mọi khâu.│ bản 100%.      │   │
│  └────────────────┴────────────────┴────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  ĐỘI NGŨ CHUYÊN GIA (Bg: --color-primary-dark)          │
│  Layout: Carousel / Grid 4 cột (Tỷ lệ ảnh 4/3)          │
│                                                         │
│  Đội ngũ của chúng tôi                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ [Ảnh 4:3]│ │ [Ảnh 4:3]│ │ [Ảnh 4:3]│ │ [Ảnh 4:3]│    │
│  │ Bs. Minh │ │ Bs. Lan  │ │ Nv. Tuấn │ │ Nv. Hoa  │    │
│  │ Thú Y    │ │ Dinh Dưỡng││ Groomer  │ │ Groomer  │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
├─────────────────────────────────────────────────────────┤
│  CƠ SỞ VẬT CHẤT (Bg: --color-bg-light)                  │
│  Layout: Bento Grid (1 lớn + 2 nhỏ)                     │
│                                                         │
│  Không gian trải nghiệm                                 │
│  ┌─────────────────────────┬───────────────────────┐    │
│  │                         │ [Ảnh nhỏ 1: Spa]      │    │
│  │ [Ảnh lớn: Toàn cảnh]    │                       │    │
│  │                         ├───────────────────────┤    │
│  │                         │ [Ảnh nhỏ 2: Hotel]    │    │
│  └─────────────────────────┴───────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  CTA SECTION (Bg: --color-accent)                       │
│  Layout: Center aligned                                 │
│                                                         │
│  Sẵn sàng trải nghiệm dịch vụ?                          │
│                                                         │
│  [Đặt lịch ngay]    [Khám phá cửa hàng]                 │
├─────────────────────────────────────────────────────────┤
│                    FOOTER                               │
└─────────────────────────────────────────────────────────┘
```

---

## 🧩 Components Detail

### 1. Hero Section
- **Background**: `--color-primary` (Xanh ngọc đậm)
- **Grid**: `grid-template-columns: 1.5fr 1fr;` (Tỷ lệ 60/40)
- **Typography**: 
  - Thẻ `h1` dùng font Lora (`--fs-display`), màu trắng.
  - Đoạn văn mô tả dùng font DM Sans (`--fs-body-lg`), màu `--color-primary-light`.
- **Button**: Dùng `.btn-accent` (Nút màu vàng nổi bật).

### 2. Câu chuyện của chúng tôi
- **Background**: `--color-bg-light` (Cream)
- **Grid**: `grid-template-columns: 1fr 1.5fr;` (Tỷ lệ 40/60)
- Mảng màu sáng kết hợp với hình ảnh bo góc chuẩn (`--card-border-radius`).
- **Typography**: `h2` Lora cho tiêu đề, thẻ `p` margin bottom `--space-md`.

### 3. Giá trị cốt lõi
- **Background**: `--color-bg-white` (Trắng)
- **Grid**: 3 cột đều nhau (`repeat(3, 1fr)`).
- **Cards**: Nền `--color-bg-light`, shadow `--shadow-card`.
- **Icons**: Sử dụng icon SVG đơn sắc (Monochrome SVG từ Flaticon), **tuyệt đối không dùng emoji**. 
  - *Ví dụ:* Icon trái tim (Tận tâm), Icon cái khiên (Uy tín), Icon huy chương (Chuyên nghiệp).
  - Màu icon: `--color-primary`.

### 4. Đội ngũ chuyên gia
- **Background**: `--color-primary-dark` (Xanh rất đậm)
- **Tiêu đề**: Màu trắng (`#ffffff`).
- **Cards**: Dùng `.expert-card` (Tỷ lệ ảnh 4/3 theo quy định `DESIGN.md`).
  - JS sync: Card width cố định nếu dùng carousel, hoặc grid 4 cột trên desktop.

### 5. Cơ sở vật chất (Bento Grid)
- **Background**: `--color-bg-light`
- **Layout**: Asymmetric Bento Grid.
  - Cột trái: Hình ảnh trải dài 2 hàng (span 2).
  - Cột phải: 2 hình ảnh xếp chồng lên nhau.
- **Radius**: Bo góc chuẩn `--card-border-radius`.

---

## 📱 Responsive Breakpoints

| Breakpoint | Hero | Câu chuyện | Giá trị cốt lõi | Đội ngũ |
|------------|------|------------|-----------------|---------|
| **≥1400px**| 60/40| 40/60      | 3 cột           | 4 cột   |
| **≤1024px**| 50/50| 50/50 (Tạm)| 3 cột           | 3 cột   |
| **≤768px** | 1 cột| 1 cột      | 1 cột           | 2 cột   |
| **≤480px** | 1 cột| 1 cột      | 1 cột           | 1 cột   |

---

## ⛔ Check-list Tuân Thủ Design.md
- [x] Không có phụ đề (subtitles) cho các tiêu đề chính.
- [x] Không dùng layout 50/50 trên màn hình lớn (Sử dụng 60/40, 40/60, Bento Grid).
- [x] Không dùng Emoji (chỉ dùng SVG).
- [x] Không dùng ký tự `&` (Dùng "và").
- [x] Nền các section luân phiên sáng - tối liên tục (`primary` -> `light` -> `white` -> `primary-dark` -> `light`).
- [x] Tỷ lệ ảnh thẻ chuyên gia chuẩn 4/3.
