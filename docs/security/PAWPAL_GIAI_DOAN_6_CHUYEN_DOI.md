# Giai đoạn 6 — Chuyển đổi và bàn giao

**Hoàn thành chuyển đổi Cloud ngày 06/11/2026**, commit giao diện đang chạy `36c602c0d22ff1cffe05364a6fd4fe34132c9718`, website https://pawpalgr3.vercel.app. Không phát hành lại giao diện hoặc git push trong giai đoạn này: bốn file client trọng yếu đang chạy đã khớp nguồn được nghiệm thu; sửa đổi giai đoạn 5 và điều kiện chuyển đổi mới đều là SQL/harness/tài liệu.

## Trạng thái sau triển khai

- Danh mục hai vai trò `ADMIN` và `STAFF`; giữ đúng một Quản lý hoạt động từ trước chuyển đổi.
- Giữ đủ 17 hồ sơ nhân viên gốc. 16 hồ sơ trước đó chưa được gán vai trò vẫn chưa được gán; không tự mở khóa, đặt lại mật khẩu hoặc suy đoán ai được làm Nhân viên.
- CSDL có gateway công việc, trợ lý STAFF/lịch sử riêng, hạn mức và kiểm tra nguồn; nhật ký đổi quyền có vai trò trước/sau; sửa cấp tài khoản có SĐT và bộ chọn người nhận phân công.
- Realtime giữ INSERT/UPDATE, ngừng DELETE/TRUNCATE thô và thêm tín hiệu riêng theo Auth ID.
- Đã dọn tài khoản STAFF thử, hồ sơ và Auth của nó; giữ nhật ký quản trị bất biến phát sinh khi cấp tài khoản/đổi quyền/khóa thử. Không tạo thanh toán, hoàn tiền, đơn hàng hoặc tin nhắn tới khách thật.
- Cấu hình và mật khẩu/ban của Auth gốc vẫn khớp hash trước chuyển đổi. Không đọc Logs Cloud, không gửi email/Slack hoặc chạy Gemini.

## Trình tự đã thực hiện

1. Đọc metadata có phạm vi trên đúng Supabase project đã cấu hình. Cloud chưa có migration 165; danh mục chỉ có ADMIN, không có quyền cá nhân hoặc nhiều vai trò, 31 fingerprint hàm nền khớp. Metadata Storage hiện vẫn không có bucket hoặc policy.
2. Xác nhận Vercel production READY tại commit `36c602c0`, bốn client quan trọng khớp hash nguồn và có đủ biến môi trường quản trị. Không ghi giá trị biến môi trường/khóa máy chủ vào báo cáo.
3. Sao lưu schema `public`, `pawpal_private`, `storage` và dữ liệu nhân viên/ánh xạ quyền, lưu ngoài repository/webroot. Giữ manifest SHA-256, snapshot Auth hash và ánh xạ tài khoản riêng tư. Con trỏ local `phase6/cutover.private.txt` bị Git ignore; các báo cáo có thể chia sẻ chỉ lưu checksum và số lượng.
4. Diễn tập nguyên giao dịch chuyển đổi trên CSDL riêng có marker; kiểm tra không sửa dữ liệu nghiệp vụ, mật khẩu/ban hoặc vai trò đã gán, và vẫn còn Quản lý hoạt động.
5. Lần áp dụng đầu gặp `duplicate_staff_phone` khi chuẩn hóa trạng thái `ACTIVE` thành `active`; giao dịch bị hủy hoàn toàn. Không ghi đè hoặc xóa SĐT trùng của hồ sơ thật.
6. Bổ sung migration 187 làm điều kiện tiên quyết: trigger trùng SĐT bỏ qua việc chỉ đổi kiểu chữ của cùng một trạng thái và không đổi SĐT. Vẫn chặn đổi sang SĐT trùng hoặc kích hoạt lại nhân viên bị trùng. Tái hiện dữ liệu legacy trùng trên bản sao, diễn tập lại và kiểm tra cả hai nhánh bị chặn.
7. Áp dụng **187 → 165 → … → 186** trong một transaction repeatable-read. Snapshot trước/sau so sánh các bảng nghiệp vụ gốc, vai trò đã gán và Auth; chỉ cho phép chuẩn hóa chữ của trạng thái nhân viên và cập nhật version. Mọi kiểm tra cuối transaction đạt mới commit.
8. Chạy kiểm tra trên website/Supabase thật bằng một tài khoản STAFF tạm và phiên Quản lý gốc, rồi dọn tài khoản thử. Xác minh lại metadata, số lượng người dùng và hash Auth sau dọn.

Migration 187 có số lớn hơn nhưng là **prerequisite trước 165** khi chuyển từ baseline cũ có trạng thái viết hoa và SĐT legacy trùng. Không chạy chuỗi số tăng dần một cách máy móc. Không thay đổi nội dung các migration đã nghiệm thu ở giai đoạn 5.

## Bằng chứng

| Báo cáo | Kết quả |
|---|---|
| `phase6/cloud-preflight-results.txt` | Baseline, 31 hàm, vai trò, publication và metadata Storage trước chuyển đổi |
| `phase6/website-readiness.txt` | Production READY tại commit đã xác minh; 4/4 client khớp nguồn |
| `phase6/cloud-backup-results.txt` | Schema 1.678.662 byte và dữ liệu quyền/hồ sơ 55.746 byte, manifest SHA-256; dữ liệu riêng nằm ngoài webroot |
| `phase6/cloud-rehearse-results.txt` | Nguyên giao dịch trên clone đạt; tình huống SĐT trùng legacy được tái hiện; đổi SĐT trùng/kích hoạt lại vẫn bị chặn; đã dọn clone |
| `phase6/cloud-apply-results.txt` | 23 migration trong một transaction đã commit; dữ liệu nghiệp vụ/role/Auth gốc được bảo toàn |
| `phase6/cloud-smoke-results.txt` | **7 nhóm production PASS**, xác nhận dọn tài khoản thử |
| `phase6/cloud-verify-results.txt` | **PASS**: 17 hồ sơ gốc, ADMIN hoạt động 1, quyền cá nhân 0, hai vai trò, publication an toàn, hàm mới đúng và Auth hash không đổi |

Kiểm tra production gồm: xác thực Quản lý hiện có mà không đổi mật khẩu hoặc gửi email; cấp STAFF qua API đang triển khai; đăng nhập/bắt đổi mật khẩu lần đầu; bộ quyền cố định; đọc hồ sơ riêng và chặn bảng tiền; bộ chọn phân công nhận STAFF; API trợ lý trả hồ sơ riêng, chặn doanh thu và xóa lịch sử thử; giao diện điện thoại; đổi STAFF → ADMIN → STAFF qua Realtime thật; khóa tài khoản làm mất quyền và gỡ kênh ngay; token cũ bị từ chối; danh mục dịch vụ anonymous vẫn đọc được. Không dùng kết quả này để tuyên bố đã chạy lại 314 nhóm trên dữ liệu production hoặc gọi provider AI thật.

## Hướng dẫn vận hành

- Trong **Nhân sự**, Quản lý chọn đúng một vai trò **Quản lý** hoặc **Nhân viên**. Chức danh công việc lưu riêng; không cấp quyền riêng hoặc dùng chức danh để suy ra quyền.
- Với 16 hồ sơ chưa có vai trò, chỉ gán sau khi người vận hành xác nhận đúng nhân sự và trạng thái cho phép đăng nhập. Bản chuyển đổi không tự kích hoạt các hồ sơ này.
- Tài khoản cấp mới phải có SĐT hợp lệ và đổi mật khẩu lần đầu. Những SĐT legacy trùng chưa bị sửa tự động; khi đổi SĐT/kích hoạt lại, CSDL vẫn áp dụng quy tắc chống trùng.
- STAFF chỉ làm nghiệp vụ được phép; thao tác hoàn tiền, điều chỉnh kho, phân công và phê duyệt dành cho Quản lý. Trợ lý STAFF đọc cùng phạm vi với phiên hiện tại, nháp không tự gửi cho khách.
- Đổi quyền hoặc khóa tài khoản có hiệu lực tại API/CSDL ngay; giao diện và kênh nhận tín hiệu để cập nhật. Nếu xác minh thất bại, dùng Thử lại/Đăng nhập lại, không sửa role trong browser storage.
- Xem nhật ký đổi quyền để đối chiếu người thực hiện, đối tượng, thời điểm và vai trò trước/sau. Nhật ký thử triển khai được giữ đúng nguyên tắc bất biến.

## Khôi phục khi cần

Ưu tiên sửa tiến vì source dữ liệu và danh tính đã được bảo toàn. Không chạy rollback tự động trên production. Bản sao schema/quyền gốc và manifest nằm trong thư mục backup riêng được chỉ bởi `phase6/cutover.private.txt`; giữ chúng ngoài Git và site.

Trước rollback phải xác định các tài khoản mới được gán STAFF, phiên đang mở, thay đổi quyền/nhân sự sau chuyển đổi và backup mới. Không tự đổi STAFF thành ADMIN, mở khóa hoặc ghi đè Auth bằng dữ liệu cũ. Nếu đã có thay đổi vận hành, cần một kế hoạch ánh xạ tài khoản cụ thể trước khi quay về baseline chỉ có ADMIN.

Thứ tự ngược của lần áp dụng là **186 → … → 165 → 187**. Các script rollback đã được kiểm tra trên clone; bản sao production không được nạp thẳng bằng lệnh ghi đè/truncate. Restore bản sao vào môi trường riêng để trích đúng định nghĩa/cấu hình cần phục hồi; giữ mọi audit và ledger mới phát sinh.

**Không được làm lộ lại DELETE thô.** Rollback 183 mặc định khôi phục publication cũ có DELETE/TRUNCATE, nên không chạy độc lập khi còn người dùng kết nối. Nếu bắt buộc rollback toàn bộ, phải chuẩn bị giao dịch rollback đã rà soát, bảo vệ các phiên STAFF và đặt lại publication `publish='insert,update'` trước cùng một COMMIT; kiểm tra lại các client cần tải lại dữ liệu. Chấp nhận vận hành thủ công việc làm mới trong thời gian khôi phục thay vì mở lại payload DELETE ngoài quyền. Thử giao dịch khôi phục đó trên clone trước khi áp dụng.

Giai đoạn 6 không tự git push. Sau khi hoàn tất chuyển đổi, người dùng yêu cầu push rõ ràng ngày 06/11/2026: migration 185–187, công cụ chuyển đổi và báo cáo giai đoạn 5–6 thuộc đợt commit/push này. Các backup, cấu hình riêng tư và con trỏ local không vào Git. Thay đổi hotline/Zalo riêng trong `components/fab/fab.html` vẫn giữ nguyên ở local.
