# Giai đoạn 5 — Ảnh đánh giá

## Đã triển khai

- Migration 197 sửa quyền đọc metadata; 199 bổ sung ảnh đánh giá sản phẩm/dịch vụ; 200 buộc ảnh đánh giá kiểm tra quyền mỗi lần tải. Cả ba đã áp dụng Cloud sau kiểm thử, không tạo đánh giá giả trên Cloud.
- Mỗi đánh giá gắn đúng dòng mua hàng hoặc dòng dịch vụ và đúng chủ sở hữu. Tối đa 5 ảnh JPEG/PNG/WebP, 3 MiB/ảnh. Lưu đánh giá và ảnh trong cùng giao dịch.
- Ảnh chờ duyệt chỉ chủ đánh giá và Admin đọc được. Công bố thì mở đọc công khai; ẩn thì thu hồi đọc metadata và binary. STAFF không được mở quyền quản lý đánh giá qua API media.
- Không được upload thêm ảnh cho đánh giá đã gửi. RPC retry chỉ chấp nhận ảnh đã gắn đúng đánh giá; không dùng retry để chèn ảnh qua kiểm duyệt.
- Ảnh công khai của đánh giá trả `Cache-Control: private, no-store`, không trả ETag/304; sản phẩm/dịch vụ giữ chính sách cache hiện có. API không bỏ qua quyền khi có `If-None-Match`.
- Form khách đánh giá sản phẩm và dịch vụ giữ mã/ảnh khi gửi lỗi; ảnh tách theo từng dòng. Sau lưu xác nhận, đọc lại ảnh bằng bearer. Đóng/đổi trang giải phóng blob và hủy nháp chưa lưu.
- Admin xem ảnh riêng tư trong modal đánh giá sản phẩm và phản hồi dịch vụ. Trang chi tiết sản phẩm/dịch vụ hiển thị ảnh đã công bố qua bộ đọc metadata có lọc trạng thái.
- Link ảnh cũ giữ nguyên. Không lưu binary/Base64/blob URL vào Supabase.

## Kiểm thử

- [SQL](phase5-review-database.txt): giao dịch sản phẩm/dịch vụ, ảnh sai phạm vi rollback đánh giá, retry không trùng, chủ sở hữu/chặn người khác, chờ duyệt/công bố/ẩn, không thêm ảnh sau gửi, rollback/reapply, không cache ảnh đánh giá.
- [Cloud migration 199](phase5-review-cloud.txt), [Cloud cache 200](phase5-review-cache-cloud.txt), [quyền metadata 197](phase5-review-privacy-database.txt).
- Giao diện riêng dùng mã form thật: hai lần gửi lỗi chỉ một upload; cùng UUID và asset; thành công đọc lại được ảnh. Đã xem ảnh chụp desktop/mobile của form sản phẩm và dịch vụ, không tràn ngang.
- Hai modal Admin đã đọc ảnh bằng bearer trong kiểm thử riêng; ảnh chụp `admin-product-review-media-mobile.png` và `admin-service-review-media-mobile.png`.
- Kiểm tra PostgREST Cloud bằng anon: projection metadata mới cùng lọc `review_status` tương thích, không ghi dữ liệu.
- `media_public_review_reader.test.cjs` kiểm tra bộ đọc thật: lọc công bố, giữ URL cũ hợp lệ, loại URL nguy hiểm và nguồn kép. Bộ API có kiểm tra riêng không cache/304 đối với ảnh chịu kiểm duyệt.

## Còn phải nghiệm thu

- Đăng nhập Admin/chủ nuôi thật và thử ảnh trên Preview tổng hợp, bao gồm lưu, tải lại, duyệt/ẩn và truy cập anonymous.
- Chưa dùng fixture SQL/giao diện riêng để gọi là đã nghiệm thu Auth thật trên Vercel.
- Production deployment/env chưa đổi; chưa push. Cloud có schema additive, các thao tác cũ không kèm ảnh vẫn được hỗ trợ.
