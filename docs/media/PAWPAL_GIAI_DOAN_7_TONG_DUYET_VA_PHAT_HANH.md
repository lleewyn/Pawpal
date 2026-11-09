# Giai đoạn 7 — Tổng duyệt nghiệm thu, đánh giá video và hướng dẫn phát hành Production

Ngày thực hiện: 09/11/2026.
Phiên bản: Hoàn tất toàn diện 7/7 Giai đoạn kế hoạch triển khai lưu trữ ảnh và video PawPal.

---

## 1. Tổng kết nghiệm thu thực tế bằng các vai trò thật (Live Verification)

Toàn bộ các luồng lưu trữ media đã được nghiệm thu trực quan trên môi trường **Vercel Preview** (`https://pawpalgr3-5bph12hep-llwyns-projects.vercel.app`) kết nối **MongoDB Atlas GridFS** và **Supabase Cloud**, với đầy đủ 3 vai trò người dùng thực tế:

| Vai trò | Tài khoản thực tế | Nghiệp vụ nghiệm thu | Kết quả | Bằng chứng |
|---|---|---|---|---|
| **Quản trị viên (ADMIN)** | `admin.local@pawpal.test` | Thay thế Banner trang chủ "Pet Hotel" bằng ảnh động `hotel_animation.png` (1.86 MiB <= 3 MiB) qua modal Admin | Lưu thành công vào MongoDB GridFS (`fb9fc2ea-43da-4a9a-8515-ee7b1370f273`), Supabase gắn FK, hiển thị chuẩn | `docs/media/phase5-banner-live.txt` |
| **Kỹ thuật viên (STAFF)** | `staff.grooming@pawpal.vn` (KTV Nguyễn Văn Nhân, Master Groomer) | 1. Tiếp nhận ca (Intake): tải ảnh lâm sàng `dogcute8.jpg`, chuyển ca sang `in_progress`.<br>2. Bàn giao ca (Handover): cam kết 3 tiêu chí, tải ảnh hoàn tất `dogcute6.jpg`, chuyển ca sang `completed`.<br>3. Tiếp nhận hội thoại chat, tra cứu và phản hồi ảnh khách gửi. | Toàn bộ vòng đời ca dịch vụ hoàn tất 100% trên giao diện trực quan | `docs/media/phase5-intake-staff-live.txt`<br>`docs/media/phase5-handover-staff-live.txt`<br>`docs/media/phase5-chat-staff-live.txt` |
| **Khách hàng (CUSTOMER)** | `Nguyễn Lê Thi` (SĐT `0834562948`) | 1. Đánh giá đơn hàng `#ORD-20260930-506558`: gửi đánh giá 5 sao kèm ảnh chụp thật `dogcute8.jpg`, chuyển trạng thái `pending` (Chờ duyệt).<br>2. Chat tư vấn: gửi ảnh thú cưng qua khung chat thành công. | Tải và xem ảnh trong gallery cá nhân; bảo mật phân quyền đạt tuyệt đối | `docs/media/phase5-review-customer-live.txt`<br>`docs/media/phase5-chat-member-live.txt` |

---

## 2. Kiểm thử bảo mật phân quyền và kiểm soát rò rỉ (Access Control Matrix)

| Loại tài nguyên | Trạng thái nghiệp vụ | Chủ sở hữu | Quản trị viên (Admin) | Nhân viên (Staff) | Khách vãng lai (Anonymous) |
|---|---|:---:|:---:|:---:|:---:|
| **Ảnh Tiếp nhận / Bàn giao** | Gắn ca dịch vụ (`appointment_record`) | Xem được (ca của mình) | Toàn quyền | Xem được (ca phụ trách) | **404 Chặn** |
| **Ảnh Hồ sơ thú cưng** | Gắn hồ sơ (`pet_profile`) | Xem được (bé của mình) | Toàn quyền | Xem được (khi có lịch hẹn) | **404 Chặn** |
| **Ảnh Đánh giá đơn hàng** | `pending` (Chờ duyệt) | Xem được (bài của mình) | Toàn quyền | **404 Chặn** | **404 Chặn** |
| **Ảnh Đánh giá đơn hàng** | `published` (Đã duyệt) | Xem được | Xem được | Xem được | **200 Public** |
| **Ảnh Đánh giá đơn hàng** | `hidden` (Đã ẩn) | Xem được (bài của mình) | Toàn quyền | **404 Chặn** | **404 Chặn** |
| **Banner quảng cáo / Bài viết** | `active` (Đang bật) | Xem được | Toàn quyền | Xem được | **200 Public** |
| **Ảnh Sản phẩm / Biến thể** | `active` | Xem được | Toàn quyền | Xem được | **200 Public** |

* Ảnh đánh giá và ảnh riêng tư trả header `Cache-Control: private, no-store`, không trả ETag/304 công khai để tránh rò rỉ dữ liệu qua bộ nhớ đệm trình duyệt hoặc proxy.

---

## 3. Đánh giá tính năng Video (Video Storage Assessment)

Theo yêu cầu mục tiêu của Giai đoạn 7, hệ thống đã tiến hành đánh giá khả thi về lưu trữ Video:
1. **Rào cản hạ tầng miễn phí**:
   - Cụm **MongoDB Atlas Free (M0)** có tổng dung lượng cố định là **512 MB** cho cả Data và Indexes, không được cộng thêm theo tháng.
   - Nền tảng **Vercel Serverless Function** giới hạn kích thước Request Body tối đa là **4,5 MB**.
2. **Đặc thù tệp video**:
   - Một đoạn video ngắn 15–30 giây từ điện thoại thông minh thường có kích thước từ **15 MB đến 60 MB**, vượt ngưỡng 4,5 MB của Vercel (yêu cầu phải cắt chunk phức tạp) và chỉ cần 8–10 video là làm cạn kiệt 100% dung lượng 512 MB của cluster.
   - Video yêu cầu hỗ trợ HTTP Range Requests (`206 Partial Content`) để tua/phát mượt mà, điều này gây tải CPU và băng thông lớn trên Serverless Function.
3. **Quyết định kỹ thuật**:
   - **Giữ nguyên trạng thái TẮT (`MEDIA_VIDEO_ENABLED=false`)**.
   - Giao diện và API thông báo rõ ràng chỉ chấp nhận định dạng ảnh chuẩn (`image/jpeg`, `image/png`, `image/webp`) với dung lượng tối đa **3 MiB/ảnh**.
   - Không tự ý mua gói trả phí hoặc phát sinh chi phí ngoài kế hoạch.

---

## 4. Quản lý hạn mức và quy trình giám sát (Capacity Monitoring)

* **Hiện trạng cụm MongoDB Atlas**:
  - Tổng số tệp đang hoạt động (`attached`): **8 tệp**
  - Tổng dung lượng lưu trữ: **~4,66 MiB**
  - Tỷ lệ chiếm dụng: **0,91%** trên hạn mức 512 MiB (còn trống hơn **507 MiB**).
* **Quy trình giám sát định kỳ**:
  - Quản trị viên có thể kiểm tra dung lượng và số lượng tệp bất kỳ lúc nào bằng lệnh:
    ```bash
    node scripts/test/check_atlas_storage.cjs
    ```
  - Nếu dung lượng vượt ngưỡng cảnh báo 80% (~400 MiB), hệ thống có cơ chế tự động khóa upload mới (`media_quota_exceeded`, mã `54000`) để bảo toàn dữ liệu cũ mà không gây sập hệ thống.

---

## 5. Hướng dẫn kích hoạt lên Môi trường Thật (Production Cutover Guide)

Hệ thống hiện tại ở local và Preview đã hoàn chỉnh 100%. Khi bạn sẵn sàng đưa tính năng tải ảnh lên trang chính thức (`pawpalgr3.vercel.app`), các bước thực hiện như sau:

### Bước 1: Cấu hình biến môi trường trên Vercel Production Dashboard
Vào **Project Settings** $\rightarrow$ **Environment Variables** trên Vercel (chọn môi trường **Production**):
1. `MEDIA_UPLOAD_ENABLED`: đặt giá trị `true`.
2. `MONGODB_URI`: điền chuỗi kết nối MongoDB Atlas (đã bảo mật).
3. `MONGODB_DB`: điền tên database (ví dụ: `pawpal_media`).
4. `MONGODB_MEDIA_BUCKET`: điền `pawpalMedia`.
5. `MEDIA_ALLOWED_ORIGINS`: điền `https://pawpalgr3.vercel.app`.

### Bước 2: Triển khai mã nguồn
Sau khi cấu hình xong biến môi trường trên Vercel:
* Bạn chỉ cần thực hiện lệnh `git push origin main` (hoặc nhánh triển khai chính thức của bạn).
* Vercel sẽ tự động build và phát hành bản cập nhật.
* Lúc đó, toàn bộ nút "Tải ảnh lên" trong Admin và Khách hàng trên trang chính sẽ hoạt động mượt mà, lưu ảnh thật vào MongoDB GridFS.

---

## 6. Kết luận
* Toàn bộ 44/44 bài kiểm thử hồi quy `npm run test:media` đều đạt (PASS 100%).
* Toàn bộ 7/7 Giai đoạn theo Kế hoạch lưu trữ ảnh/video PawPal đã hoàn tất mỹ mãn, an toàn, tuân thủ nghiêm ngặt nguyên tắc bảo vệ băng thông Supabase Cloud và tối ưu dung lượng cụm MongoDB Atlas Free.

