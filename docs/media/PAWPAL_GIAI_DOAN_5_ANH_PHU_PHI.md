# Giai đoạn 5 — Ảnh phụ phí

Đã triển khai modal đề xuất phụ phí của quản lý và bộ đọc bằng chứng trong hồ sơ ca. Migration 195 bổ sung FK thật `appointment_adjustment_media`, session ràng buộc đúng ca và UUID đề xuất.

- Ảnh riêng tư chỉ upload; giữ gốc và legal hold. Ảnh nháp có thể gỡ, thay đổi chỉ được gắn cùng giao dịch đề xuất phụ phí.
- Không tự duyệt, không tự xác nhận đồng thuận hoặc thu tiền. SQL kiểm tra sai đề xuất rollback toàn bộ phụ phí; đề xuất hợp lệ vẫn pending.
- SQL riêng, rollback/reapply đạt; 31/31 bài `test:media` đạt. Giao diện riêng thử hai lần lưu lỗi giữ UUID/asset, chỉ upload một lần; mock save thành công đóng modal.
- Đã xem [desktop](adjustment-media-desktop.png), [điện thoại](adjustment-media-mobile.png), không tràn modal.
- Migration đã áp dụng Cloud; không tạo đề xuất nghiệp vụ giả hoặc upload file thử vào Atlas trong lượt này. Bản Preview tổng hợp và nghiệm thu phụ phí thật còn được theo dõi trong checklist giai đoạn 5.
