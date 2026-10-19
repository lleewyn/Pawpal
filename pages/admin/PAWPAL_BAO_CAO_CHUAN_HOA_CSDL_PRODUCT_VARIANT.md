# BÁO CÁO KẾT QUẢ & LỘ TRÌNH CHUẨN HÓA CSDL — PRODUCT & PRODUCT_VARIANT

> **Phạm vi xử lý:** Khắc phục triệt để hiện tượng trùng lặp thuộc tính (`sku`, `cost_price`, `sale_price`) giữa bảng 25 `product` (Sản phẩm gốc) và bảng 27 `product_variant` (Biến thể sản phẩm).  
> **Cơ sở kiến trúc:** Chuẩn hóa theo mô hình bán lẻ quốc tế (Parent Product / SPU ⇄ Child Variant / SKU).  
> **Thời gian thực hiện:** 19/10/2026.

---

## 1. HIỆN TRẠNG TRƯỚC KHI XỬ LÝ
* **Trùng lặp 3 thuộc tính:** Cả 2 bảng `product` và `product_variant` đều cùng chứa `sku`, `cost_price`, `sale_price`.
* **Lệch pha dữ liệu thực tế trong DB:**
  * Bảng `product` có **37 sản phẩm**.
  * Bảng `product_variant` trước đây chỉ có **5 biến thể** (tất cả đều thuộc về duy nhất 1 sản phẩm `TP-HAT-01`).
  * Có tới **36 sản phẩm** chưa hề có bản ghi nào trong `product_variant`. Nếu xóa ngay 3 cột ở bảng `product`, 36 sản phẩm này sẽ bị mất toàn bộ giá vốn, giá bán và mã SKU.
* **Mã nguồn (Frontend & Admin):**
  * Các file `data-loader.js` (dùng cho toàn bộ Shop), `orders.js`, `tab-order-products.js` trước đây chỉ truy vấn trực tiếp vào 3 cột của `product`.

---

## 2. CÁC HẠNG MỤC ĐÃ TRIỂN KHAI HOÀN TẤT

### Giai đoạn 1: Đồng bộ dữ liệu CSDL (Data Backfill Migration)
* **Tạo và thực thi script:** `scripts/database/migrate_products_to_variants.js`.
* **Kết quả:**
  * Đã quét toàn bộ 37 sản phẩm trong bảng `product`.
  * Tự động sinh **36 biến thể mặc định** (Default Variants) tương ứng cho 36 sản phẩm đơn lẻ vào bảng `product_variant` với đầy đủ `sku_variant`, `cost_price`, `sale_price` và trạng thái `dang_ban`.
  * **Hiện tại: 100% (37/37) sản phẩm đều đã có ít nhất 1 biến thể hợp lệ trong `product_variant` (Tổng cộng 41 biến thể).**

### Giai đoạn 2: Nâng cấp cơ chế đọc dữ liệu thông minh (Unified Catalog Loader)
* **File:** `scripts/shared/data-loader.js` (Shop Storefront, Giỏ hàng, Chi tiết sản phẩm):
  * Cập nhật câu truy vấn: `client.from('product').select('*, product_category!inner(category_name), inventory(quantity_in_stock), product_variant(*)')`.
  * Ưu tiên đọc `sku_variant`, `sale_price`, `cost_price` từ `product_variant`. Nếu sản phẩm có nhiều biến thể, tự động nạp danh sách biến thể vào `variants` để hỗ trợ chọn Màu/Size/Vị.
  * Giữ fallback an toàn nếu cột cũ ở bảng `product` còn tồn tại hoặc đã xóa.
* **File:** `pages/admin/modules/orders/orders.js` (Quản trị Đơn hàng & POS):
  * Cập nhật `fetchProductsData` để JOIN `product_variant(id, sku_variant, cost_price, sale_price, status)`.
  * Tính toán `effectiveSku`, `effectiveSalePrice`, `effectiveCostPrice`, cờ `hasVariants` và mảng `variants` động từ CSDL.

### Giai đoạn 3: Đồng bộ hai chiều khi Thêm / Sửa sản phẩm (Admin Inventory & Orders)
* **File:** `pages/admin/modules/orders/subtabs/tab-order-products.js`:
  * Khi Admin cập nhật sản phẩm: Tự động cập nhật song song biến thể tương ứng trong bảng `product_variant`.
  * Khi Admin tạo mới sản phẩm: Tự động khởi tạo đồng thời 1 biến thể mặc định trong `product_variant` với mã SKU và giá bán vừa nhập.

### Giai đoạn 4: Kiểm thử tích hợp tự động (Automated Verification)
* Đã chạy bộ test suite chuyên sâu 16 tiêu chí `scripts/test/test_ord_f01_f16_suite.js`: **Đạt 16/16 test (100% PASS)**.
* Đã chạy bộ test hỗ trợ chat realtime `scripts/test/test_user_admin_support_chat_sync.js`: **Đạt 6/6 test (100% PASS)**.
* Đã soạn thảo file migration SQL lưu trữ tại `scripts/database/20261019_normalize_product_and_variant.sql`.

---

## 3. KẾT LUẬN & ĐỀ XUẤT TIẾP THEO

* **Dữ liệu hiện tại:** Đã an toàn 100%. Mọi sản phẩm đều có đầy đủ giá và SKU ở bảng `product_variant`.
* **Hệ thống code:** Đã chuyển sang đọc và ghi đồng bộ vào `product_variant`.
* **Quyết định về 3 cột cũ (`sku`, `cost_price`, `sale_price` trên bảng `product`):**
  * *Tùy chọn A (An toàn cao nhất - Đang áp dụng):* Giữ nguyên 3 cột cũ làm trường đệm (cached fields), code luôn ghi đồng bộ 2 bảng để các tính năng cũ không bao giờ bị lỗi.
  * *Tùy chọn B (Xóa sạch dứt điểm):* Có thể chạy lệnh SQL `ALTER TABLE product DROP COLUMN sku, cost_price, sale_price;` bất kỳ lúc nào mà không lo bị mất dữ liệu giá/SKU, vì 100% biến thể đã được chuyển dọn sang `product_variant`.
