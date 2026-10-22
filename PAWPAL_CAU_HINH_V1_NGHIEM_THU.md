# Cấu hình V1 — triển khai và nghiệm thu

Cập nhật ngày 22/10/2026. Đã hoàn thiện mã và kiểm tra trên bản phục hồi; migration 057 đã lên Cloud. Đang xác minh giao diện Production trước khi chốt kết quả cuối.

## Phạm vi

- Bốn tab: Banner và khuyến mãi, Bài viết, Cấu hình, Nhật ký.
- Cửa hàng, phương thức thanh toán, biểu phí theo hình thức giao hàng, giờ mở cửa và chính sách tham chiếu, Pawpoint, thông báo website.
- Không triển khai thanh toán/giao vận thật, gửi Zalo/SMS/email thật, upload tệp hoặc camera. Không tự thu/hoàn tiền, cộng điểm, đổi lịch hoặc sửa đơn cũ khi thay cấu hình.
- Voucher chưa có quan hệ giới hạn theo hạng trong V1 nên ô này khóa ở “Tất cả khách hàng”, không cho chọn rồi bỏ qua âm thầm.

## Lưu dữ liệu

- `save_admin_setting_record` kiểm tra tài khoản, quyền đọc/ghi bảng và quyền nhật ký. Chỉ nhận trường cho phép; khóa bản ghi, so sánh snapshot khi mở form, UUID chống gửi lặp. Dữ liệu và nhật ký cùng giao dịch.
- Thu hồi ghi trực tiếp đối với banner, bài viết, voucher, thiết lập và hình thức giao hàng. Luồng API banner cũ ở server local trả 410. Nhật ký cấu hình được bảo vệ khỏi giả mạo từ trình duyệt.
- Không nhầm Auth ID với staff ID, không có ID nhân viên giả. Không lấy cấu hình cũ từ localStorage làm dữ liệu vận hành. Form sửa bản sao; lưu lỗi giữ nháp và không đổi trạng thái đang dùng.
- Thiếu dữ liệu để trống hoặc báo chưa cấu hình, không tự điền thông tin cửa hàng, phí hoặc giờ mẫu. Token vận chuyển giả đã bỏ; bí mật không được lưu trong cấu hình này.

## Các luồng

| Phần | Hành vi |
| --- | --- |
| Banner | Thêm, sửa, bật/tắt, gia hạn, xóa qua RPC; URL an toàn, làm mới sau lưu. Khách chỉ đọc banner đang bật và đúng thời gian |
| Voucher | Tạo, sửa, tăng lượt, bật/tắt, xóa; đúng kiểu `percentage`, `fixed`, `shipping` và phạm vi chuỗi V1; giữ giới hạn 0; số lượt từ `voucher_redemption`; không xóa voucher đã có lịch sử |
| Bài viết | Tạo, sửa, công khai/tạm ẩn, xóa; tác giả từ phiên máy chủ; không gán ảnh/danh mục giả; chặn nội dung nguy hiểm; khách không đọc được nháp hoặc bài ẩn |
| Tri thức | Nút đồng bộ tạo/cập nhật FAQ thật từ bài công khai, tối đa 8.000 ký tự văn bản. Không giả báo có hàng đợi hoặc vector index. Khi sửa, ẩn hoặc xóa bài, tri thức bị tắt đến lần đồng bộ tiếp theo |
| Cửa hàng | Lưu thông tin nhập thật, trường phụ có thể trống, giữ nháp khi lỗi |
| Thanh toán | Lưu và cập nhật trạng thái phương thức trong `payment_method_config` cùng giao dịch; chỉ bắt nhập ngân hàng nếu bật chuyển khoản. Bật phương thức không đồng nghĩa đã tích hợp thanh toán tự động |
| Giao hàng | Sửa phí/trạng thái từng hình thức thật trong `delivery_option_config`, là nguồn tính đơn mới của Bán hàng. `save_admin_shipping_settings` lưu cả nhóm và thông tin đối tác nguyên tử; một dòng xung đột thì không lưu dở. Không tự ánh xạ ba mức phí mẫu vào các hình thức khác nhau |
| Giờ và chính sách | Lưu giờ hợp lệ, phí/số lượng không âm, giữ đúng 0. Chính sách tham chiếu không tự thi hành thu phí, hoàn tiền hoặc đổi lịch cũ |
| Pawpoint | Lưu mức tham chiếu; tỷ lệ đổi đồng bộ `sales_point_redemption_value` mà Bán hàng đọc. Không tự cộng điểm hoặc tính lại số dư cũ |
| Thông báo | Thêm, sửa, bật/tắt, xóa và tải lại; khách đọc trường công khai của thông báo đang bật qua RPC riêng. Dải đầu trang và hộp thông báo dùng chữ an toàn, không lấy từ cache nghiệp vụ cũ |
| Nhật ký | Đọc đủ vượt giới hạn 50 cũ; 10 dòng/trang; tìm/lọc người và phân hệ; xem thay đổi khi cần; không giả báo đồng bộ thành công |

## Kiểm tra bản phục hồi

Đã chạy đạt:

- `settings_rpc_v1.cjs`: nhật ký nguyên tử, đúng nhân viên, gửi lại/xung đột, chặn ghi trực tiếp, URL, tác giả, voucher.
- `settings_policies_v1.cjs`: thanh toán/tỷ lệ điểm, biểu phí và hoàn tác cả nhóm khi có dòng lỗi; chặn giờ, bí mật, phí và liên kết không hợp lệ; không cộng điểm.
- `settings_store_v1.cjs`: modal cửa hàng, thanh toán, giao hàng, đặt lịch và Pawpoint; thiếu dữ liệu, số 0, giữ nháp khi lỗi. Không ghi CSDL trong kiểm tra này.
- `settings_banner_v1.cjs`: lưu banner từ trình duyệt, nhật ký, danh sách sau lưu.
- `settings_voucher_v1.cjs`: tạo/sửa từ trình duyệt, phần trăm/phạm vi và giới hạn 0.
- `settings_article_v1.cjs`: tạo/sửa/xuất bản/ẩn, cô lập nháp, FAQ thật, gửi lại, vô hiệu hóa tri thức, modal tri thức.
- `settings_notices_v1.cjs`: thêm/sửa, RPC công khai, header hiển thị chữ an toàn và tải lại. Dùng component header thật vì preview local ưu tiên Admin.
- `settings_audit_v1.cjs`: đủ số dòng, phân trang, lọc người thực hiện và giao diện.
- Hồi quy `sales_checkout_v1.cjs` và `chat_security_v1.cjs` đạt sau thay đổi quyền/cấu hình.

Đã xem ảnh từng modal và nhật ký. Ảnh/log ngoài webroot trong thư mục hạ tầng riêng. Bản ghi thử được dọn hoặc khôi phục ban đầu; giữ nhật ký kiểm tra.

## Cloud và Production

- Áp 057 bằng `node scripts/database/v1/apply_chat_cloud.cjs apply-settings`. Backup bản đầy đủ: `D:/Aboutme/Pawpal-infra/supabase-local/backups/settings-cloud-2026-10-22T13-11-04-324Z`.
- Đối chiếu trong giao dịch xác nhận mọi dòng public, danh tính/mật khẩu/trạng thái khóa Auth và cấu trúc cột không đổi. Vẫn 17 nhân viên; không mở khóa tài khoản để thử.
- Có RPC lưu cấu hình, lưu nhóm giao hàng, đồng bộ tri thức và lấy thông báo công khai; publication đủ bảy bảng thiết lập/nội dung liên quan.
- Kiểm tra có chủ ý: `node scripts/test/settings_production_v1.cjs run`. Chỉ tạo banner tương lai, voucher tương lai giới hạn 0 và bài nháp riêng; dọn trong `finally`; không đổi cấu hình vận hành hoặc phát ưu đãi dùng được cho khách thật.
- Kết quả Production và commit triển khai sẽ bổ sung sau khi bản mới sẵn sàng.
