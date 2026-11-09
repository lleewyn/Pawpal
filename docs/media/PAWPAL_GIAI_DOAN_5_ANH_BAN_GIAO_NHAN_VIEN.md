# Giai đoạn 5 — Ảnh bàn giao của nhân viên

Cập nhật 08/11/2026: đã tích hợp bộ ảnh riêng tư vào `staffHandoverModal`. Dùng migration 194 và API sẵn có, không thêm migration hoặc thay đổi quyền nghiệp vụ trong lượt này.

## Chức năng

- Chọn ảnh, xem trước, gỡ ảnh nháp; bằng chứng đã lưu chỉ đọc. Giới hạn 10 ảnh trong bộ chọn, mỗi ảnh 3 MiB, quota chung 100 MiB; video vẫn tắt.
- Mã biên bản được cấp khi mở modal, dùng chung cho session upload và lệnh lưu. Khi lưu lỗi, thử lại giữ mã biên bản và asset đã xác minh.
- Kiểm tra lại quyền và trạng thái modal sau upload, trước khi gửi lệnh bàn giao. Đóng hoặc Hủy trong lúc upload hủy nháp và không ghi tiếp biên bản.
- Chỉ cho lưu sau khi tải đủ dữ liệu ca, biên bản tiếp nhận đã được khách xác nhận và ảnh bàn giao cũ. Ba xác nhận chất lượng, tư trang và khách hàng vẫn bắt buộc.

## Kiểm chứng

- `npm run test:media`: 29/29 đạt. Kiểm thử SQL bàn giao chạy lại đạt, gồm RPC dưới role STAFF trong PostgreSQL riêng, kiểm tra quyền và rollback fixture.
- Harness dùng nguyên closure modal STAFF và editor ảnh thực tế. Dữ liệu/endpoint mô phỏng chỉ nằm trong `scripts/test/media_staff_handover_visual_server.cjs`, không dùng làm dữ liệu fallback trong ứng dụng hoặc artifact Vercel.
- Đã kiểm tra: thiếu xác nhận chặn upload/lưu; tiếp nhận chưa được khách xác nhận chặn lưu; lỗi nạp metadata ảnh cũ chặn lưu.
- Hai lần lưu lỗi: modal giữ nháp, chỉ một upload, cùng UUID biên bản và asset; session đúng ca và mục đích `handover_image`; không gửi lại bằng chứng cũ. Endpoint kiểm thử trả thành công thì modal đóng.
- Giữ upload đang chạy rồi bấm Hủy: không gọi RPC ghi bàn giao, ảnh nháp được hủy sau khi upload kết thúc.
- Đã xem [desktop](staff-handover-media-desktop.png) và [điện thoại](staff-handover-media-mobile.png): ảnh cũ không có nút xóa, ảnh nháp có nút xóa, không tràn modal hoặc trang.
- Đã cập nhật [Preview](https://pawpalgr3-v9rsx5g8j-llwyns-projects.vercel.app/admin). Đây là bằng chứng triển khai mã; chưa phải bằng chứng đăng nhập STAFF thật, upload lên Atlas hoặc lưu bàn giao thật trên Vercel.

## Trạng thái môi trường

- Lượt này không tạo dữ liệu nghiệp vụ hoặc upload file thử lên Supabase/Atlas Cloud; không hoàn tất ca thật để nghiệm thu giao diện.
- Không thay deployment/env Production và không push. Preview tiếp tục dùng giới hạn và cờ upload đã được chọn; Preview cũ cùng phạm vi được dọn. Không tạo bypass truy cập mới.
- Đã dừng server kiểm thử riêng sau khi hoàn tất.

## Còn lại

- [ ] Đăng nhập STAFF thật, ghi bàn giao có ảnh trên một ca đủ điều kiện, tải lại hồ sơ và kiểm tra quyền chủ nuôi. Giữ mục này trong nghiệm thu Preview và giai đoạn 7.
- [ ] Triển khai ảnh phụ phí trong modal riêng.
