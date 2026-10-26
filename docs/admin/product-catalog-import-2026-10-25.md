# Nạp sản phẩm ngày 25/10/2026

Nguồn chuẩn: `data/San_pham_final.csv`, thực tế phân tách bằng tab và có ô nhiều dòng.

SHA-256: `0577b19c363d3d601134044efd221e90902a7bfac0330f8565fd715f0aa8cf67`.

## Kết quả Cloud

- Đã COMMIT 38 sản phẩm, 65 biến thể theo CSV; tổng tồn vật lý 4.028, tổng tồn tối thiểu 422.
- Người dùng đã xác nhận lấy tồn CSV làm chuẩn. Số tồn được điều chỉnh bằng giao dịch kho bù chênh lệch; không ghi đè/xóa sổ giao dịch cũ. Tổng ledger khớp từng biến thể với `inventory`.
- Giữ nguyên đơn hàng, dòng hàng, thanh toán, đánh giá, phiếu nhập và các lượt giữ hàng đang có; đối chiếu hash trước/sau nhập. Không nhập các mã khách hàng, giỏ hàng, nhân viên, phiếu nhập hoặc giao dịch cũ từ CSV thành nghiệp vụ mới.
- Không kích hoạt lại các lượt giữ hàng đã hết hạn trong CSV. Tồn khả dụng cho khách vẫn trừ lượt giữ hàng thật còn hạn trên hệ thống. Khi kiểm tra, tồn vật lý 4.028 và tồn khả dụng 4.027 do một đơn vị của `DD-BAT-18-V1` đang được giữ.
- Chỉ hiển thị đánh giá thực tế đã công bố; không tạo đánh giá từ số trung bình và số lượt điền sẵn.
- Các sản phẩm tương ứng giữ UUID cũ. Bổ sung mã sản phẩm chuẩn, tên biến thể, quy cách, nhãn, đặc tính, khối lượng/dung tích nguyên bản, mô tả/thành phần riêng và nguồn tham chiếu. Biến thể cũ không còn trong CSV được chuyển `inactive` và đánh dấu `catalog_retired`, vẫn giữ tham chiếu lịch sử.
- Ánh xạ mã đổi tên: `DD-BAT-02` tương ứng sản phẩm bát đôi cũ `DD-BAT-01`; `TP-BANH-15` tương ứng `TP-SUP-15`; `VS-KEM-02` tương ứng `VS-KIM-02`. Bát inox Basic mới `DD-BAT-01` được tạo riêng, không ghi đè bát đôi.
- Giá vốn chỉ dùng cho admin, không trả qua RPC danh mục công khai. Giá gốc và giá bán lấy đúng từng biến thể từ CSV.
- Các chuỗi `S/M/L` được giữ nguyên như nguồn, không tự tạo thêm ba SKU.
- Màu có tên nhưng không có mã HEX chính xác được lưu tên với HEX NULL, không tự đoán màu.

## Ảnh và nội dung nguồn

Nhiều URL ảnh trong CSV là trang bán hàng HTML. Chúng được lưu vào `source_url`; chỉ các URL dạng tệp ảnh được đưa vào media. Các ảnh minh họa có sẵn trong dự án được lưu liên kết vào Supabase cho những sản phẩm tương ứng. Không tải JSON làm nguồn dữ liệu.

`DD-BAT-01-V0` khai báo đường dẫn Storage `product-images/P-BOWL-001/PV-BOWL-001-BLUE-M/front.webp` nhưng kiểm tra không truy cập được. Không dùng ảnh của bát đôi cũ để giả làm bát Basic; sản phẩm này dùng placeholder khi chưa có ảnh đúng.

Một URL ảnh King's Pet nằm trong cột không tên của dòng Whiskas `TP-HAT-04-V1`. Không gán ảnh sai thương hiệu đó cho Whiskas; giữ nguyên trong CSV để đối chiếu.

### Sửa ảnh balo theo màu

Sau phản hồi của người dùng, đã tách media của `PK-BALO-05-V1` (Xanh) sang `PK-BALO-05.png` và `PK-BALO-05-V2` (Hồng) sang `pk-balo-05.jpg`, sau khi xem trực tiếp các ảnh. Theo yêu cầu tiếp theo, gallery chung giữ đủ cả 5 ảnh: khi đổi màu chỉ chuyển ảnh lớn và thumbnail active, không thu hẹp gallery. Khách vẫn bấm xem mọi ảnh minh họa; không tạo thêm SKU cho các màu chỉ xuất hiện trong ảnh. Không đổi giá hay số tồn. Ánh xạ được giữ tại `product_variant_artwork.cjs` để lần nhập lại không ghi đè bằng gallery chung. Bản chụp media trước lần khôi phục gallery nằm ngoài webroot tại `%TEMP%/pawpal-backpack-media-1792916954978.private.txt`. `scripts/test/backpack_gallery_ui.cjs` đã xác nhận giữ đủ 5 thumbnail khi chọn Xanh/Hồng/Xanh và vẫn bấm xem từng ảnh được.

## Giao diện

- Customer: cửa hàng tải 38 sản phẩm/65 biến thể thật; trang chi tiết hiển thị tên phân loại tự nhiên. Đổi phân loại cập nhật SKU, giá bán, giá gốc, giảm giá, số tồn khả dụng, giới hạn số lượng, gallery, mô tả và thành phần tương ứng.
- Không lấy giá vốn làm giá gạch ngang; không tự dựng hạn sử dụng hoặc bảo quản khi thiếu thông tin.
- Admin: chỉ đưa biến thể thuộc danh mục mới vào bảng sản phẩm và lựa chọn kiểm kho; giữ các biến thể cũ cho lịch sử. Form có nhóm “Phân loại” để giữ tên/quy cách độc lập với màu, kích thước, hương vị. Giữ đúng tổ hợp có trong CSV, không tự nhân thành các tổ hợp mới.
- Lưu giá qua RPC đã được cập nhật để giữ tên biến thể và metadata riêng, không thay đổi tồn kho khi chỉ sửa giá. Giữ gallery nhiều ảnh khi người quản trị không đổi ảnh đại diện của biến thể.
- Modal sản phẩm hiển thị một cột ở điện thoại để tránh cắt nhãn/ô nhập.

Các tệp giao diện đang ở local, **chưa git push hoặc deploy**. Bài kiểm tra trình duyệt đè tài nguyên local lên trang đang chạy và đọc dữ liệu Cloud thật. Website cần triển khai các tệp mới để nhận đầy đủ chức năng hiển thị/quản lý vừa bổ sung.

## Kiểm chứng

- Import thử toàn bộ trong transaction rồi ROLLBACK trước COMMIT.
- Đối chiếu mọi SKU, tên biến thể, giá bán/giá gốc, số tồn, tồn tối thiểu, ledger và gallery với nguồn.
- Thử quyền admin sửa giá `TP-HAT-01-V1` rồi ROLLBACK: giá lưu đúng, tên 400g được giữ, số tồn và lịch sử kho không đổi.
- Kiểm thử trình duyệt xác nhận tổng 38/65, đúng giá và tồn từng biến thể. Royal Canin 1kg: 295.000đ, giá gốc 310.000đ, 29 đơn vị; Ciao hải sản: đúng mô tả và thành phần riêng.
- Admin mở sản phẩm 2 và 4 biến thể, giữ đúng các hàng SKU/tồn; kiểm tra modal desktop và điện thoại. Không thực hiện lệnh ghi CSDL trong kiểm tra UI.
- Không có lỗi JavaScript hoặc tải file dữ liệu JSON trong bài kiểm tra UI.

Ảnh bằng chứng: `docs/verification/products-final/`.

## Công cụ

- `node scripts/database/v1/import_product_catalog_final.cjs --validate`: kiểm tra CSV, không kết nối CSDL.
- Chạy importer không cờ: transaction rồi ROLLBACK. `--apply`: COMMIT; chỉ chạy khi muốn áp lại CSV làm chuẩn và điều chỉnh lại tồn.
- Migration `099_product_catalog_final.sql` và `100_product_catalog_admin.sql` được áp trong transaction của importer.
- `scripts/test/product_catalog_final_rollback.sql`: chạy trong transaction ngoài và ROLLBACK; không để lại fixture.
- `node scripts/test/product_catalog_final_ui.cjs`: đọc Cloud và kiểm tra UI local qua resource overrides.
- Kết nối dùng cấu hình riêng hiện có, thư viện pg và CA Supabase ở thư mục tạm theo `service_import_connection.cjs`; vẫn bật xác thực TLS, không ghi khóa vào mã nguồn.

Bản chụp trước COMMIT và báo cáo nhập nằm ngoài webroot tại `%TEMP%/pawpal-product-final-9bb27fd1-8615-4b31-ac07-ba12c6ed1d99/`. Đây là dữ liệu đối chiếu để phục hồi có kiểm tra, không phải script tự động ghi đè CSDL.
