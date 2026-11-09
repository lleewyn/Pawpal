# Giai đoạn 5 — Ảnh hồ sơ thú cưng

- Migration 196 thêm FK avatar, CHECK một nguồn và RPC lưu ảnh riêng có kiểm tra phiên bản hồ sơ. Quản lý thay ảnh; ảnh riêng tư được đọc bởi Admin, chủ nuôi và nhân viên còn quyền trên ca liên quan.
- URL/Base64 cũ được giữ khi chưa thay ảnh; không chuyển hàng loạt dữ liệu cũ. Chuyển đổi dữ liệu cũ vẫn thuộc giai đoạn 6.
- Modal ảnh có ba lựa chọn giữ/tải mới/bỏ ảnh. Một ảnh mới tối đa 3 MiB; ảnh cũ giữ đến khi lưu thành công. Bỏ ảnh đưa file vào hàng chờ dọn, không xóa ngay.
- SQL riêng rollback/reapply đạt: chặn ảnh sai thú cưng, chủ nuôi khác và anon; gắn/gỡ đúng FK. 32/32 kiểm thử media đạt.
- Giao diện riêng thử lưu lỗi và retry giữ cùng asset, chỉ upload một lần; [desktop](pet-avatar-desktop.png), [điện thoại](pet-avatar-mobile.png) đã kiểm tra, không tràn.
- Bộ đọc ảnh MongoDB được nối vào trang hồ sơ và nhật ký chăm sóc thú cưng; không ghi Blob URL vào CSDL.
- Migration đã áp dụng Cloud. Ngày 09/11/2026 đã nghiệm thu bằng Admin thật trên Vercel: dùng lại đúng file ảnh gốc của hồ sơ, lưu qua modal, FK được gắn và URL cũ được bỏ; tải private 200 khớp SHA-256, anonymous 404. Đã khôi phục chính xác toàn bộ bản ghi và phiên bản gốc, dọn file/chunks thử, không push hoặc thay deployment/env Production. Xem `phase5-admin-live-media-cleanup.txt` và biên bản chốt kiểm tra Admin.
