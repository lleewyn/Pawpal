# Điểm nhấn thú cưng trên trang chủ

Tám vị trí: khối mở đầu, dịch vụ, tính cách của bé, mua sắm, quy trình spa, đội ngũ, PawPass và hỏi đáp. Giữ nguyên cỡ chữ, kích thước section và banner 1720 × 540. Đồng bộ markup ở `index.html` và `pages/public/landing/landing.html`.

Ảnh tạo bằng công cụ image_gen tích hợp theo phong cách nhiếp ảnh, không phải ảnh chụp thú cưng tại PawPal. Dùng Sharp để giảm kích thước còn 900 × 600 và nén WebP, giữ alpha. Tổng năm asset mới khoảng 474 KB; bảy vị trí dưới đầu trang tải lazy, ảnh trang trí không tương tác và có alt rỗng.

## Asset mới và prompt

### hero-dog

`assets/images/home-pets/hero-dog.webp`

> One real young golden retriever dog leaning its head curiously sideways from the RIGHT edge as if peeking around an invisible vertical wall. Head and one forepaw only, head near center-left and paw below, neck/body exit cleanly at the right edge. Landscape 3:2 canvas, face angled towards left into page content, mouth closed, gentle attentive expression. No actual wall. Photographic cutout of a REAL pet, normal anatomy and proportions, small natural eyes, individual slightly untidy fur, neutral overcast daylight, candid DSLR photography, 85mm f/8. Natural unretouched color, genuine alpha transparency with no floor, panel, background, haze, shadows, lettering or props unless specified. Whole silhouette inside frame. Avoid CGI, plush toy, illustration, airbrushing, oversized eyes, rounded baby faces, exaggerated smiles and plastic fur.

### stretching-cat

`assets/images/home-pets/stretching-cat.webp`

> One real short-haired gray and white domestic cat in a full-body stretching pose: front legs stretched forwards to viewer left, chest low, hindquarters up at right, tail raised with natural curve. Side profile, head looking slightly left and down. Landscape 3:2 canvas, feet stand along a horizontal baseline 94 percent down. No props. Photographic cutout of a REAL pet, normal anatomy and proportions, small natural eyes, individual slightly untidy fur, neutral overcast daylight, candid DSLR photography, 85mm f/8. Natural unretouched color, genuine alpha transparency with no floor, panel, background, haze, shadows, lettering or props unless specified. Whole silhouette inside frame. Avoid CGI, plush toy, illustration, airbrushing, oversized eyes, rounded baby faces, exaggerated smiles and plastic fur.

### peeking-hamster

`assets/images/home-pets/peeking-hamster.webp`

> One real golden Syrian hamster peeking over an invisible horizontal ledge, only upper half of face and two little pink hands gripping the edge, nose just above ledge. Curious upright ears, not holding food, candid and slightly asymmetrical. Landscape 3:2 canvas. Invisible ledge level at 87 percent down, hands extend slightly below. Do not draw the ledge. Photographic cutout of a REAL pet, normal anatomy and proportions, small natural eyes, individual slightly untidy fur, neutral overcast daylight, candid DSLR photography, 85mm f/8. Natural unretouched color, genuine alpha transparency with no floor, panel, background, haze, shadows, lettering or props unless specified. Whole silhouette inside frame. Avoid CGI, plush toy, illustration, airbrushing, oversized eyes, rounded baby faces, exaggerated smiles and plastic fur.

### towel-dog

`assets/images/home-pets/towel-dog.webp`

> One real small white-and-tan terrier after a bath, a simple soft ivory cotton bath towel loosely draped over its head and ears. Its nose and face visible with real fine damp fur. Chin resting near two front paws over an invisible ledge. Landscape 3:2 canvas. Ledge level 85 percent down, paws lowest near 96 percent. No actual ledge. Calm real expression, no grin. Photographic cutout of a REAL pet, normal anatomy and proportions, small natural eyes, individual slightly untidy fur, neutral overcast daylight, candid DSLR photography, 85mm f/8. Natural unretouched color, genuine alpha transparency with no floor, panel, background, haze, shadows, lettering or props unless specified. Whole silhouette inside frame. Avoid CGI, plush toy, illustration, airbrushing, oversized eyes, rounded baby faces, exaggerated smiles and plastic fur.

### resting-rabbit

`assets/images/home-pets/resting-rabbit.webp`

> One real small brown and white pet rabbit lying stretched out sideways in a relaxed flop, front paws extended left, hind legs stretched to right, ears relaxed back but visible, looking gently left, full body. Landscape 3:2 canvas, body resting along horizontal baseline at 86 percent down. Natural rabbit anatomy, realistic proportions, no props. Photographic cutout of a REAL pet, normal anatomy and proportions, small natural eyes, individual slightly untidy fur, neutral overcast daylight, candid DSLR photography, 85mm f/8. Natural unretouched color, genuine alpha transparency with no floor, panel, background, haze, shadows, lettering or props unless specified. Whole silhouette inside frame. Avoid CGI, plush toy, illustration, airbrushing, oversized eyes, rounded baby faces, exaggerated smiles and plastic fur.

## Asset được dùng lại

- `assets/images/about-editorial/curious-collie.webp`: cún nhìn về phía nội dung ở khối đội ngũ.
- `assets/images/about-editorial/lounging-tabby.webp`: mèo nằm, thả đuôi ở mép khối PawPass.
- `assets/images/about-editorial/perched-cockatiel.webp`: chim ở phần hỏi đáp.

## Kiểm tra

Đã kiểm tra trình duyệt ở 320/390/768/1024/1440px; tám ảnh tải thành công, không tràn ngang. Kiểm tra cả alpha của ảnh so với vùng chữ để tránh tính nhầm vùng ảnh trong suốt; không ghi nhận ảnh che chữ sau khi căn lại. Ảnh không nhận pointer events nên giữ thao tác banner, sản phẩm và hỏi đáp. Một số ảnh banner có sẵn trả lỗi tải ở môi trường local khi kiểm tra, không thay dữ liệu hay đường dẫn banner. Không thay logic hoặc dữ liệu CSDL. Chỉ giữ thay đổi local.
