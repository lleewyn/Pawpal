# Nghiệm thu giai đoạn 4 trên Vercel Preview

Cập nhật 08/11/2026. **Hoàn thành triển khai và nghiệm thu hai luồng ưu tiên trên Preview bằng Admin thật.** Không phải phát hành Production hay nghiệm thu toàn bộ các nhóm media của website.

## Cấu hình đã được người dùng chốt

- Tổng quota media: **100 MiB**, mỗi ảnh tối đa **3 MiB**, JPEG/PNG/WebP; video tắt.
- Chỉ bật cờ upload ở deployment Preview riêng. Không thay env project lâu dài, không deploy Production và không push Git.
- Gate quota chung trong Supabase đã được bật với `max_storage_bytes=104857600`. Gate này là dùng chung; lớp API chỉ cho upload tại các Preview được cấp cờ riêng. Không được triển khai Production với cờ true khi chưa có yêu cầu phát hành.
- [Cấu hình quota](phase4-preview-quota.txt), [Preview đầy đủ](phase4-full-preview.txt).

## Bằng chứng thực tế đã đạt

- Người dùng đăng nhập Admin thật trong Chrome kiểm thử; quyền được xác minh bởi ứng dụng hiện có.
- API Preview không có token: upload trả **401**; file không tồn tại trả **404**; bearer sai trả **401**; phương thức sai trả **405**. Response private đều `private, no-store`.
- Upload một ảnh đang dùng của sản phẩm có sẵn, kích thước **1.385.797 byte**: prepare **200**, upload **201**; ảnh nháp đọc bằng Admin **200**, không có bearer **404**, hash byte gốc khớp. Retry upload cùng session trả **200** và cùng asset.
- Mở modal sản phẩm thật và Lưu khi giữ URL cũ đạt; giữ nguyên ba ảnh cũ. Đối chiếu không đổi các cột nghiệp vụ sản phẩm.
- Đổi sang upload, chọn lại ảnh sản phẩm thực tế đang có và bấm Lưu trong modal: upload **201**, modal đóng sau lưu thành công. Asset được gắn qua RPC; không tạo sản phẩm giả.
- Catalog thật trả `/api/media?action=read&id=...`; đọc công khai **200** và cache public. Trang `/shop` lọc đúng sản phẩm, có ảnh API, giải mã thành công với chiều rộng **2000px**.
- Sau một lần build/deploy mới được cấp đầy đủ biến môi trường riêng, đọc lại cùng asset trả **200**, đủ **1.385.797 byte**. Đây là file lưu trong Atlas, không nằm trên filesystem runtime Vercel.
- Đối chiếu sản phẩm và biến thể không đổi dữ liệu nghiệp vụ (ngoại trừ `updated_at` của lần lưu). Sau bài thử, khôi phục chính xác ba tham chiếu ảnh cũ, gồm ID và dữ liệu gốc. Xem [bằng chứng khôi phục](phase4-product-restoration.txt). File mới bị gỡ được xếp vào retention; không xóa bằng chứng hay asset có tham chiếu.

Các giá trị thời gian ghi nhận trong lần thử gồm khoảng 7,6 giây cho prepare/upload ảnh 1,3 MiB; đây là một lần chạy qua mạng và không phải cam kết SLA. Chưa có kết quả stress/concurrency để đánh dấu nghiệm thu vận hành.

Lưu ý triển khai: một lần dùng CLI `redeploy` theo mặc định đã build được nhưng API media trả 503; chưa coi đó là bài thử thành công. Đã tạo deployment mới với biến môi trường riêng được cấp tường minh và kiểm tra đọc lại file đạt. Không dựa riêng vào trạng thái READY để xác nhận runtime media có cấu hình đúng.

## Nhật ký private — đã đạt

Sau khi người dùng yêu cầu agent tự thực hiện, đã tạo một **nhật ký kỹ thuật có mã MEDIA-ACCEPTANCE riêng** trên ca có sẵn, ghi rõ không phải thao tác chăm sóc thật, dùng ảnh minh họa có sẵn trong repo. Không tạo ca hoặc khách hàng mẫu. Ảnh hồ sơ ca từ nguồn ngoài không tải được nên không dùng nó làm bằng chứng. Nhật ký kỹ thuật và file thử đã được dọn sau nghiệm thu.

- Form quản lý tạo nhật ký: upload **201**, RPC lưu **200**; file WebP **29.234 byte**.
- Modal sửa thêm ảnh thứ hai: upload **201**, RPC lưu **200**, giữ asset thứ nhất. RPC metadata xác nhận đủ hai ảnh.
- Mỗi ảnh private: không có bearer **404**, Admin thật **200**, `private, no-store`, đủ **29.234 byte**.
- Reload trang, xác minh lại phiên Admin và nạp lại ca: tìm được đúng ID nhật ký, đủ hai ảnh, cả hai giải mã thành công.
- Phát hiện và sửa lỗi sau realtime: thẻ trên timeline còn hiện nhưng booking trong bộ nhớ đã được thay mới và mất danh sách hydrated; mở modal theo index không hoạt động. Đã đổi sang ID ca/nhật ký, nạp lại qua API; kiểm tra lại trên Preview mới đạt, thêm hai regression test.

## Dọn dữ liệu và cấu hình cuối

- [x] Khôi phục đúng ba tham chiếu ảnh sản phẩm ban đầu, gồm ID và dữ liệu gốc; không đổi giá, biến thể hoặc các cột nghiệp vụ sản phẩm. `updated_at` và audit của những lần lưu nghiệm thu được giữ đúng lịch sử.
- [x] Xóa vật lý đúng hai file thử sản phẩm/chunks: [kết quả](phase4-test-file-cleanup.txt).
- [x] Dọn đúng nhật ký kỹ thuật có marker và hai file/chunks của nó: [kết quả](phase4-care-file-cleanup.txt). Chỉ giải phóng legal hold của hai fixture kỹ thuật đã xác nhận phạm vi, không mở chức năng gỡ hold cho bằng chứng nghiệp vụ.
- [x] [Đối chiếu cuối](phase4-final-database-verify.txt): hash/số lượng media cũ không đổi, không còn nhật ký kỹ thuật, không còn asset/session hoạt động, quota giữ chỗ **0 byte**; metadata trạng thái deleted và audit được giữ để đối soát.
- [x] [Preview cuối](phase4-preview-finalized.txt): giữ bản sửa realtime, xóa ba Preview dư và thu hồi bypass kỹ thuật; hai deployment cleanup một lần cũng đã xóa. Không tắt Deployment Protection. Người xem Preview cần quyền Vercel của dự án.

**Preview giữ lại:** [Mở Admin](https://pawpalgr3-eykwvu0s0-llwyns-projects.vercel.app/admin). Cờ upload chỉ bật ở deployment này, quota 100 MiB. Shared Supabase đã được dùng cho các thao tác nghiệm thu tạm thời và khôi phục; câu "Production không đổi" ở các báo cáo nghĩa là không thay deployment/env Production, không có nghĩa mọi audit hoặc `updated_at` trong Cloud không thay đổi.

## Giới hạn kiểm thử và việc tiếp theo

- Phiên đăng nhập thật đã thử là **ADMIN**. Scope nhân viên/chủ nuôi, staff bị khóa/thu hồi phân công và sai chủ đã chạy với RPC/role SQL thật trong database riêng. Chưa đăng nhập trực tiếp STAFF/chủ nuôi trên Preview; giữ bước này ở kiểm tra phát hành giai đoạn 7, không khẳng định đã thử password login hoặc UI end-to-end của hai vai trò đó.
- Modal nhân viên và các tình huống lỗi/đóng/retry đã thử trong browser harness; không coi harness là dữ liệu chăm sóc thật.
- `npm run test:media`: **23/23 đạt**; hai bài hồi quy tra cứu nhật ký và kiểm thử SQL nhật ký đạt. Không chạy Supabase Logs.
- Hồ sơ thú cưng, biến thể và các nhóm media khác thuộc giai đoạn 5; chưa coi mọi màn hình đều đã hỗ trợ asset mới.
- Load test nhiều phiên, timeout dài, lịch cleanup định kỳ, phục hồi cả hai CSDL và phát hành Production vẫn thuộc checklist vận hành/giai đoạn 7. Video tắt.

Các báo cáo giai đoạn 3 và phần đầu giai đoạn 4 mô tả trạng thái lịch sử "upload tắt"; trạng thái mới nhất là **chỉ Preview được bật theo lựa chọn 100 MiB của người dùng**.
