# Sửa runtime Trợ lý AI trên Vercel

Ngày31/10/2026. Người dùng phát hiện tab Trợ lý AI vẫn báo không tải được lịch sử và nguồn chưa sẵn sàng. Các lượt sửa trước chỉ đối chiếu RPC gọi trực tiếp từ ba module trình duyệt, bỏ sót RPC gọi trong API và gateway chọn từ registry. Kiểm tra Cloud xác nhận thiếu lịch sử Copilot, acquire/release và toàn bộ gateway mới.

## Gói đã áp

`forward.sql` là một transaction gồm136/141 (hai request slot, rate10 lượt/phút/nhân viên và bốn source slot dùng chung),146 (phân trang nguồn cũ),149 (bản stage3 cuối),147 (đọc chi tiết/ghi continuation),151 (FAQ hướng dẫn Admin riêng),153/154 (liên hệ khách qua UUID). Bổ sung riêng hai hàm lịch sử từ139 và snapshot benchmark từ143. Không áp lại phần public chatbot đã sửa trước, không áp135 hoặc FAQ công khai150/152/157.

Preflight yêu cầu các hàm/bảng/index mới chưa tồn tại và các hàm gốc cần thiết đã có. Lưu định nghĩa `admin_copilot_extended_facts` trước khi thay bởi151. Hash từng nguồn, kết quả và quyền nằm ở `cloud-apply.txt`. Có `rollback.sql` và định nghĩa cũ; cần đưa API về bản tương thích trước rollback và đối chiếu FAQ nội bộ nếu sau này được chỉnh sửa.

Không sửa đơn hàng, khách, thanh toán, lịch hẹn, cấu hình kinh doanh hoặc FAQ công khai.151 tạo kho hướng dẫn Admin riêng có RLS và ba dòng hướng dẫn đã chuẩn bị trước. Admission chỉ dùng bảng slot/rate có giới hạn. Hàm đọc giữ quyền caller/RLS, permission nguồn, cap/timeout; hàm ghi continuation chỉ service_role, kiểm ownership/idempotency như hàm lưu gốc.

## Kiểm chứng

- **37 kiểm tra Cloud SQL PASS**: sessions/history và toàn bộ35 intent trong registry hiện hành, gồm gateway danh sách/phân trang/stage3/chi tiết/liên hệ khách. Chạy bằng role authenticated với danh tính Admin đang hoạt động, không xuất payload nghiệp vụ. Lease/rate phát sinh trong transaction kiểm tra được rollback. Kết quả trong `cloud-read-checks.txt`; truy vấn không khớp có thể trả danh sách rỗng hợp lệ, không phải nghiệm thu đủ mọi bản ghi/biên dữ liệu.
- Kiểm kê **24 tên RPC của API/admission và gateway động**: không còn thiếu. Đây là kiểm tra sự tồn tại, không chứng nhận mọi phân quyền/hành vi.16 tên RPC phía trình duyệt đã được rà soát ở lượt sửa Quy định.
- **Vercel UI thật** với phiên đăng nhập, tab kiểm tra riêng: lịch sử không còn dòng lỗi; tạo đoạn chat mới, gửi “Có bao nhiêu SKU dưới ngưỡng?” qua giao diện nhận HTTP200, `ok:true`, câu trả lời136 ký tự. Câu hỏi này đi tuyến tra cứu xác định, không gọi Gemini. Đóng đúng tab kiểm tra sau đó. Phát sinh một phiên hỏi đáp chẩn đoán thông thường, giữ nguyên lịch sử; không xóa lịch sử của người dùng.
- GET history thật trả200/ok. Lần probe sessions đầu dùng nhầm `action=sessions` nên thực chất kiểm tra history; sau đó đã kiểm tra đúng `view=sessions`, nhận200/ok và tìm thấy một phiên khớp câu hỏi chẩn đoán, xác nhận đã lưu.
- **45 test offline PASS** về registry/stage3/staff/parts/liên hệ khách và **40 ca nghiệp vụ PASS**. Không gọi Cloud Logs hoặc model bên ngoài.

Phạm vi hoàn thành là sửa dependency runtime của bản triển khai hiện tại và smoke tra cứu. Chưa chứng nhận chất lượng Gemini, toàn bộ thao tác ghi, mọi danh tính/quyền hoặc tải Production; Gate2 và các mục nghiệm thu rộng vẫn mở.
