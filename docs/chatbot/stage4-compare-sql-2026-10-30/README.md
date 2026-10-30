# G4.2 — Đối chiếu SQL thật cho so sánh thực thu

Ngày 30/10/2026. Chạy `node scripts/test/chat_stage4_compare_local.cjs --local-fixtures` trên bản sao database riêng có marker sở hữu, Auth và REST chỉ ở loopback. Không đọc credentials Cloud, không gọi Gemini hoặc áp migration Cloud.

## Kết quả

5 nhóm kiểm tra đạt, chi tiết tại [local-results.txt](local-results.txt):

- Luồng `answer()` dùng JWT/RLS/RPC thật, so hôm nay với hôm qua tại thời điểm cố định 10 giờ Việt Nam: hiện tại thu 100, hoàn 25, thực thu 75; kỳ trước thu 50, hoàn 10, thực thu 40; chênh lệch 35 và tăng 87,5%.
- Tiền thu đúng đầu kỳ được tính, đúng cuối kỳ bị loại. Giao dịch pending không tính. Hai khoản hoàn thành công của một payment được cộng đúng; khoản hoàn thuộc kỳ trước vẫn tính theo thời điểm hoàn, dù payment thu ở kỳ khác. Hai kỳ khớp truy vấn tổng hợp SQL độc lập với RPC.
- Handler API và xác thực thật tiếp nhận một câu mới, đọc đúng hai nguồn `revenue.summary`, lưu phản hồi, không gọi model.
- Gửi lại request đã lưu không đọc lại nguồn nghiệp vụ.
- Nhân viên có quyền thu nhưng thiếu quyền hoàn bị từ chối 403 trước khi gọi nguồn số liệu.

Hồi quy sau đó: 40 kiểm tra offline của bốn luồng giai đoạn 4 và 40 ca nghiệp vụ đạt. Không thay đổi runtime, migration, giới hạn bytes, số nguồn hoặc cơ chế cập nhật.

## Phạm vi và giới hạn

Oracle tích hợp mới kiểm chứng cặp ngày với dữ liệu ranh giới cố định; API thật chạy cặp ngày tại thời điểm gửi. Ranh giới tuần/tháng và tháng trước ngắn hơn tiếp tục có kiểm tra offline, chưa được chứng minh bằng fixture SQL riêng trong đợt này. Không coi kết quả này là kiểm thử tải hoặc chứng nhận triển khai Production. Các lỗi nguồn từng phần vẫn có bằng chứng offline riêng.

Lượt chuẩn bị đầu gặp PostgreSQL đang khởi động; lượt fixture đầu thiếu giá trị đơn và bị ràng buộc số tiền chặn. Đã sửa fixture có dòng hàng, sửa tham số lease của harness và chạy lại trên clone mới. Các lần thử không sửa database nguồn hoặc mã nghiệp vụ để bỏ qua ràng buộc.

Database thử, fixture, hai container và tệp cấu hình riêng đã được dọn; database nguồn được giữ nguyên. Xem [local-environment.txt](local-environment.txt). Chạy lại cần tạo clone mới bằng script setup với evidence-dir của thư mục này. Script sẽ từ chối chạy nếu môi trường chưa READY hoặc marker không khớp.
