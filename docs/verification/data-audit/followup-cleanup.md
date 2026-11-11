# Đợt xử lý dữ liệu kiểm thử còn lại

Phạm vi đúng theo mã đã rà sâu; không mở rộng theo tên tương tự hoặc bản ghi quá hạn.

## Danh sách thực hiện

- Hai lịch `BKG-E2E12-1249` và `BKG-5b927c05-5abd-482f-b96c-8385ba133d78`, cùng hai dòng dịch vụ.
- Thú cưng `PET-TEST001`, sau khi kiểm tra không còn lịch ngoài nhóm được chọn.
- Ba media_asset và ba media_upload_session đều đã có trạng thái deleted. Không xóa thêm tệp bên MongoDB, không sửa tệp sản phẩm/dịch vụ.
- Đơn `SO-0f79ee72ee124df0a9399efd8fbf1c8e`, chưa có bản ghi thanh toán, gồm ba dòng hàng, ba giữ hàng và một lượt dùng voucher công khai. Không sửa định nghĩa voucher hoặc số tồn thực.
- Nhân viên Test `490fec43-0971-46f1-a193-1420a742c1ae`, tài khoản đăng nhập riêng và auth.identities tương ứng: tổng ba bản ghi. Tài khoản đang bị khóa, không có vai trò, session, dấu thời gian đăng nhập hoặc liên kết nghiệp vụ khác.

Tổng cộng: 22 bản ghi trong 12 bảng.

## Các kiểm tra bắt buộc

- Đối chiếu đầy đủ khóa ngoại thực tế, chặn phụ thuộc ngoài danh sách cho phép.
- Chặn nếu xuất hiện thanh toán, quyền truy cập, đăng nhập mới, biên bản đã ký hoặc tệp chưa ở trạng thái deleted.
- Sao lưu riêng ngoài webroot và Git, có SHA-256.
- Thử xóa rồi ROLLBACK trước; chỉ COMMIT nếu dữ liệu nguồn vẫn đúng như kế hoạch.
- Giữ nguyên khách, hồ sơ, điểm, thanh toán, hoàn tiền, danh mục sản phẩm/dịch vụ, số tồn thực và dữ liệu không được chọn.
- Không tắt trigger hay khóa ngoại. Không thêm bản ghi nghiệp vụ.

## Nhóm tiếp tục giữ

Sáu khách cùng sáu bút toán điểm chuyển đổi (1.701 điểm), đơn có thanh toán thành công và nhân viên Test còn đứng tên 28 tin nhắn. Không thay đổi các quy tắc sổ điểm/tiền để xóa nhóm này.

Trạng thái: COMMIT thành công ngày 11/11/2026 lúc 10:25:37 giờ Việt Nam.

Đã chạy thử ROLLBACK thành công rồi mới xóa đúng 22 bản ghi. Đối chiếu trước COMMIT xác nhận toàn bộ dữ liệu được giữ lại, danh mục, số tồn thực, sổ điểm và tiền không đổi. Không tắt trigger hoặc khóa ngoại.

Ba lượt giữ hàng kiểm thử đã xóa có số lượng lần lượt 2, 1 và 1 sản phẩm. Số tồn thực không thay đổi; dữ liệu giữ hàng của đơn kiểm thử được loại bỏ.

Bản sao lưu ngoài webroot/Git: D:/Aboutme/Pawpal-infra/supabase-local/backups/test-cleanup-followup-2026-11-11T03-19-59-561Z/before-delete.private.json, kèm SHA-256. Không công khai nội dung bản sao lưu, đặc biệt thông tin khôi phục tài khoản Test đã xóa.

Kiểm tra trên bản deploy sau COMMIT: không có lỗi tải tài nguyên Dashboard, Realtime live, bộ lọc 7 ngày đạt. Số lịch hôm nay là 1 và khớp truy vấn trực tiếp; đơn cần xử lý giảm từ 12 còn 11. Lỗi 404 có sẵn của RPC thông báo phản hồi khiếu nại vẫn được ghi nhận riêng, không có lỗi mới trong dữ liệu Dashboard.

Cộng với đợt trước: đã xóa 197 bản ghi kiểm thử/phụ thuộc. Chưa xóa sáu khách vướng sổ điểm, thanh toán đã thành công và tài khoản Test có lịch sử 28 tin nhắn.
