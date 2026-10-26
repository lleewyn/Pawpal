# Audit component Bán hàng — 24/10/2026

## Phạm vi và trạng thái

Giai đoạn A: audit và lập bảng đối chiếu trước khi sửa mã ứng dụng. Phân hệ đầu tiên là Bán hàng, vì nhánh hiện tại đã có nền component và hai modal được chuyển đổi, nhưng tài liệu vẫn ghi các phần còn thiếu. Không chuyển sang phân hệ tiếp theo và không coi Bán hàng đã hoàn thành.

Nguồn kiểm tra: nhánh `main`, commit `15f69d3e`. Trước audit không có thay đổi tracked; các tệp HTML và thư mục prototype chưa tracked của người dùng được giữ nguyên. Audit chỉ thêm tài liệu này. Công cụ đo và ảnh nằm trong thư mục `scratch/orders-audit` đã được Git ignore.

Không thay đổi Khách hàng, CSS dùng chung, mã ứng dụng, API, Supabase, schema, dữ liệu, quyền hay handler. Các số liệu dưới đây là computed styles của stylesheet stack hiện tại, không suy ra từ một file CSS riêng lẻ.

## Các nguồn đã đọc và đối chiếu

- `AGENTS.md`, yêu cầu đính kèm của người dùng, `docs/admin/html-css-coding-standards.md`.
- `docs/admin/component-standardization-mapping.md`, `docs/admin/orders-pos-modal-standard-review.md`.
- `pages/admin/index.html`: thứ tự nạp toàn bộ CSS, script modal và nền component.
- `pages/admin/admin.js`: khai báo module và subtabs, nạp HTML/script, bộ xử lý modal toàn cục.
- `pages/admin/admin-components.css`, các rule hiệu lực từ `admin.css` và `admin-shell-v7.css` qua trình duyệt.
- Khách hàng: `customers.html`, các phần KPI/bảng/hồ sơ trong `customers.css`, `customers-v7.css`, `customer-modal-v7.css`.
- Bán hàng: `orders.html`, `orders-v8.css`, `orders-pos.css`, các khai báo component/hồ sơ/modal trong `orders.css`, `order-modal-v8.js`.
- `orders.js`: adapter dữ liệu, cache, điều phối tải dữ liệu, render, điều hướng, breadcrumb.
- Cả bốn controller: `tab-order-list.js`, `tab-order-detail.js`, `tab-order-products.js`, `tab-order-promos.js`; đặc biệt các template render và handler tương ứng.
- Test hiện có: `admin_component_standards_ui.cjs`, `admin_orders_pos_modal_standard_ui.cjs`, `admin_orders_receipt_standard_ui.cjs`, `admin_orders_pos_search_ui.cjs`, và giới hạn của `admin_orders_modal_ui.cjs`.

## Bảng đối chiếu trước khi code

| Component | Chuẩn Khách hàng đang chạy | Hiện trạng Bán hàng và nguyên nhân | Cách xử lý dự kiến |
| --- | --- | --- | --- |
| KPI | `.customers-kpi-grid`, `.kpi-card`: padding 10px 14px, gap 4px, min-height 62px. Nhãn 11px/500, line-height 13,2px; số 23px/650, line-height 25,3px | `.orders-kpi-grid .kpi-card`: padding 12px 16px, gap 5px, min-height 78px. Nhãn 12px/500, số 25px/700. `orders-v8.css:3–7` và inline màu/cỡ số trong HTML giữ hệ riêng | Bổ sung component KPI dùng chung có phạm vi opt-in; giữ số chỉ tiêu, ID và số cột nghiệp vụ. Gỡ khai báo trùng trong Bán hàng sau khi đối chiếu các nơi sử dụng |
| Bảng | `#customerDataTable`: th 11px/650, td 12px/550 và letter-spacing -0,2px. Ô dữ liệu thường padding dọc 10px, ngang 11px; ô đầu 15px | Ba bảng danh sách đã opt-in. Font-size và padding dọc khớp, nhưng td vẫn 400/normal. Một số rule theo ID giữ padding ngang 12px. Tên `.user-name-link` còn 13,5px/600 thay vì 12px/650 | Hoàn thiện typography và thông tin chính/phụ trong nguồn chung, gỡ rule module mâu thuẫn; đối chiếu riêng cột checkbox, mã, số tiền và tác vụ. Không ép độ rộng bảng bằng Khách hàng |
| Bộ lọc | `.table-toolbar-section` không padding; hai hàng tự quản lý khoảng cách. Input thực tế cao 38px, radius 9px | Input đã khớp kích thước chính. Toolbar ngoài còn padding 14px 18px và border-bottom 1px, trong khi các hàng tiếp tục có padding riêng. Nguyên nhân là selector global `.table-toolbar-section` trong `orders.css:87` và stylesheet nạp sau Khách hàng | Chuyển shell toolbar sang nguồn chung có opt-in; giữ filter và event ID. Không đổi thứ tự nạp CSS toàn hệ thống để chữa một phân hệ |
| Nút | Nút toolbar 12px/600, cao thực tế 38px, radius 9px | Các nút toolbar đã khớp các thuộc tính chính; min-height Khách hàng 32px, nền chung đang đặt 38px. Nút hồ sơ/modal ngoài opt-in còn dựa vào các rule riêng | Tách vai trò nút toolbar/modal/nút text trong component, giữ trạng thái disabled và selector nghiệp vụ; không gán một kích thước cho mọi loại nút |
| Trạng thái | `.admin-badge` trong bảng là chữ phẳng 11,5px/500, không nền, không padding; màu theo ngữ nghĩa | Trạng thái tích cực của ba bảng đã khớp. `orders-v8.css:19` vẫn ép toàn module bằng ba `!important`; rule cũ và shared cùng tồn tại. Hồ sơ, modal và loại trạng thái khác chưa được test đủ | Giữ chữ phẳng theo yêu cầu mới. Chuyển dần về một nguồn scoped và chỉ xóa rule cũ sau khi mọi nơi dùng đã được kiểm tra; không thêm `!important` |
| Hồ sơ | `.data-pair-row`, `.data-key`, `.data-val`, `.drawer-subtabs-bar` cung cấp nhãn–giá trị, nhóm thông tin và tab | `#subtab-tab-order-detail` chưa opt-in. Dùng `.info-pair`, `.order-items-table`, `.financial-summary-list`, timeline và grid 2:1 riêng; có nhãn kết thúc bằng dấu hai chấm và nhiều inline style | Dùng chung typography/nhãn/nút/bảng nhỏ. Giữ bố cục đơn hàng, tài chính, vận chuyển, timeline, RMA; không thêm tab không có nghiệp vụ tương ứng |
| Modal | `customer-modal-v7.css`: card 26px 30px, form gap 16px, title 20px/650, input 40px, footer không viền | Có 19 modal tĩnh: 2 đã opt-in, 17 chưa. Phần lớn card đã cùng padding nhưng body cũ gap 14px và `.form-row-2col` 12px. `orders-v8.css` sửa `.form-row-two-col`, không khớp tên class này. Phiếu đóng gói bị inline padding 24px 28px | Chuyển từng modal theo cấu trúc thật, thêm class header/body/footer phù hợp. Không bật `.admin-modal-standard` hàng loạt vì có form bao header/footer, body cuộn và textarea khác nhau |
| Loading/Empty/Error | Skeleton, placeholder hồ sơ, empty/error do controller render | Loading có skeleton; empty/error trong nhiều controller vẫn chứa inline padding/cỡ chữ khác nhau. Ví dụ khuyến mãi dùng 28px khi lỗi và 36px khi rỗng. Skeleton td đo được padding 16px 14px, khác ô dữ liệu thường | Tạo component trạng thái dùng chung, giữ nguyên thông điệp và hành động hiện có. Tách CSS skeleton khỏi hàng dữ liệu. Không thay trạng thái trống bằng dữ liệu mẫu |

Kết quả kiểm tra ở 1280, 1440 và 1680px đều xác nhận các khác biệt typography/padding nêu trên. Chiều cao toàn toolbar và toàn hàng có thể khác hợp lệ do số bộ lọc, số cột và xuống dòng; không dùng chúng làm mục tiêu bằng nhau tuyệt đối. Số đo chiều cao khi có skeleton không dùng để kết luận chiều cao KPI sau khi tải dữ liệu.

Chuẩn mới yêu cầu radius 9px; một số khối Khách hàng hiện còn radius 0px trong lớp V7. Audit ghi nhận thực tế này, không sửa Khách hàng và không tự sao chép radius 0px sang component mới.

## Các nguyên nhân và điểm cần xử lý riêng

1. **Chồng lớp định nghĩa:** `orders.css` chứa selector chung không scope; `orders-v8.css` định nghĩa lại font, bảng, control, modal; `admin-components.css` thêm một lớp opt-in. Specificity theo ID, inline style và `!important` tiếp tục thắng một phần rule chung. Vì vậy test font-size/padding dọc pass vẫn có thể còn lệch font-weight, chữ phụ, padding ngang và toolbar.
2. **Phạm vi opt-in chưa đầy đủ:** `.admin-ui-standard` chỉ có ở danh sách đơn, sản phẩm, khuyến mãi; `.admin-modal-standard` chỉ có tại POS và phiếu thu. Hồ sơ và modal còn lại chưa chuyển đổi.
3. **Cấu trúc modal không đồng nhất:** có modal dùng form làm body; có modal dùng form bao cả header/body/footer. Thu ngân đặt footer trong form. Dùng một selector cuộn cho tất cả có thể làm mất footer hoặc cắt gợi ý autocomplete.
4. **Nhãn được sửa lúc chạy:** nhiều form tĩnh chưa có `for`; `order-modal-v8.js` tự nối label khi mở. Không coi số nhãn thiếu trong HTML tĩnh là bằng chứng tất cả nhãn bị thiếu sau khởi tạo. Cần test sau khi mở và sau khi render thêm field/biến thể.
5. **Nhiều tầng đóng modal:** handler toàn cục trong `admin.js:1510`, capture handler trong `order-modal-v8.js`, `PawpalOrdersModule.closeModal` ở `tab-order-list.js:1234`, cộng với onclick trong HTML. Không thay các tầng này chỉ để chuẩn hóa CSS. Wrapper dùng `dataset.saving` để khóa đóng; một số controller dùng biến `busy` riêng. Chưa có bằng chứng tất cả luồng đang lưu đều được khóa đóng đúng.
6. **HTML động không chỉ ở bảng:** `tab-order-detail.js:276` tạo `modalSalesReturnReceipt`, rồi append trong `.orders-module`; tổng phạm vi là 19 modal tĩnh cộng ít nhất modal động này. Modal động dùng inline layout, chưa opt-in. Khối RMA, dòng biến thể, autocomplete, phiếu in và thông báo cũng tạo DOM riêng.
7. **Placeholder hồ sơ có nội dung mẫu:** `orders.html:206–325` còn mã đơn, ngày, tên, địa chỉ, ghi chú, số tiền mẫu trong `#orderDetailData` đang ẩn. Luồng không tìm thấy đơn tại `tab-order-detail.js:29` chỉ xóa một phần trường rồi cho content hiện; có nguy cơ lộ thông tin placeholder hoặc thông tin từ hồ sơ trước. Cần testcase riêng trước khi thay đổi; không coi nội dung này là dữ liệu Supabase thật.
8. **An toàn template:** tên sản phẩm và timeline trong controller detail đã qua escape; các chuỗi `onclick` tạo từ `order.id` vẫn cần audit theo đúng ngữ cảnh chuỗi JavaScript. Không thay handler bằng bản demo hoặc kết luận an toàn chỉ vì một số ô dùng `escapeHtml`.

## Kiểm kê modal

Chiều rộng đo tại desktop 1440px; đây là baseline hiện tại, không phải xác nhận mọi modal đã đạt chuẩn. Hai modal opt-in đã có test chuyên biệt. Mọi modal còn lại cần kiểm tra nội dung dài, trường có điều kiện, trạng thái lỗi/đang lưu và bàn phím với handler thật trước khi nghiệm thu.

| Modal ID | Rộng hiện tại | Trạng thái và điểm giữ lại |
| --- | --- | --- |
| `modalCreateOrder` | 760px | Đã opt-in; giữ cart, quote, chọn khách, giao nhận, chặn gửi trùng |
| `modalPosReceipt` | 760px | Đã opt-in; giữ generator và chức năng in |
| `modalShipOrder` | 520px | Chưa opt-in; vận chuyển, mã vận đơn, ghi chú |
| `modalCancelOrder` | 500px | Chưa opt-in; lý do và điều kiện hủy |
| `modalPackingSlip` | 960px | Chưa opt-in; inline padding 24px 28px; giữ tài liệu in |
| `modalBatchDispatch` | 760px | Chưa opt-in; form bao header/body/footer, danh sách đơn |
| `modalDispatchManifest` | 960px | Chưa opt-in; giữ bảng kê và chức năng in/xuất |
| `modalReturnRefund` | 740px | Chưa opt-in; form bao header/body/footer, cuộn và kiểm định |
| `modalAdjustStock` | 560px | Chưa opt-in; trường có điều kiện và lý do điều chỉnh |
| `modalAddProduct` | 1000px | Chưa opt-in; nhiều field/tab/biến thể và autocomplete |
| `modalCreateVoucher` | 580px | Chưa opt-in; điều kiện, hạn dùng, giới hạn lượt |
| `modalVoucherAction` | 540px | Chưa opt-in; trạng thái và hạn dùng |
| `modalStockLogs` | 1000px | Chưa opt-in; bảng dài, phân trang và cuộn body |
| `modalGoodsReceipt` | 1000px | Chưa opt-in; form cuộn, danh sách hàng, nhà cung cấp |
| `modalStocktake` | 1000px | Chưa opt-in; ma trận kiểm kê, chênh lệch và lý do |
| `modalConfirmToggleProductStatus` | 500px | Chưa opt-in; xác nhận ngừng/bật bán |
| `modalConfirmOrderAction` | 480px | Chưa opt-in; callback xác nhận nghiệp vụ |
| `modalProductReviews` | 740px | Chưa opt-in; trạng thái tải/rỗng/lỗi và phân trang |
| `modalSalesCashier` | 760px | Chưa opt-in; footer trong form, thu/hoàn tiền |
| `modalSalesReturnReceipt` | Inline 600px | Tạo động; kiểm định/nhận/từ chối hàng trả; chưa đo trong fixture HTML tĩnh |

## Danh sách file dự kiến sửa ở giai đoạn B

| File | Mục đích | Rủi ro cần kiểm tra |
| --- | --- | --- |
| `pages/admin/admin-components.css` | Nguồn chung cho KPI, toolbar, thông tin bảng, trạng thái và hồ sơ; hoàn thiện modal khi cần | Ảnh hưởng các workspace/modal đã opt-in, đặc biệt POS và phiếu thu |
| `pages/admin/modules/orders/orders.css` | Gỡ các khai báo trùng đã xác minh; giữ layout/cột nghiệp vụ | Selector global đang có thể được các module khác sử dụng; không xóa theo tên class đơn thuần |
| `pages/admin/modules/orders/orders-v8.css` | Gỡ các lớp sửa đè sau khi component đã được chuyển | Chữ trạng thái, surface và modal chưa opt-in vẫn phụ thuộc lớp này |
| `pages/admin/modules/orders/orders.html` | Class opt-in, cấu trúc header/body/footer, label và tách inline tĩnh | ID, data attribute, form, nút tác vụ, scroll container, vùng in |
| `pages/admin/modules/orders/orders-pos.css` | Chỉ giữ bố cục nghiệp vụ POS/phiếu thu | Bảng giỏ hàng, số tiền, cuộn ngang và bản in |
| `pages/admin/modules/orders/subtabs/tab-order-list.js` | Chỉ template trình bày và class của bảng/modal/phiếu | Tìm kiếm, chọn khách, quote, cart, giao nhận, chọn nhiều đơn và thu ngân |
| `pages/admin/modules/orders/subtabs/tab-order-detail.js` | Template hồ sơ, RMA và modal tạo động | Dữ liệu cũ khi không tìm thấy đơn; thao tác trả hàng và liên kết khách |
| `pages/admin/modules/orders/subtabs/tab-order-products.js` | Template sản phẩm, biến thể, lịch sử kho, gợi ý | CRUD sản phẩm, nhập kho, kiểm kê và bảo toàn số liệu |
| `pages/admin/modules/orders/subtabs/tab-order-promos.js` | Template khuyến mãi và các trạng thái | Tạo/sửa mã, hạn dùng, hiệu lực và giới hạn |
| `scripts/test/admin_component_standards_ui.cjs` và test chuyên biệt liên quan | Bổ sung tiêu chí còn thiếu, không chỉ font-size/padding dọc | Test pass hiện tại không đại diện toàn bộ nghiệp vụ |
| `pages/admin/index.html` | Cập nhật phiên bản asset nếu mã CSS/JS thay đổi | Giữ thứ tự stylesheet để không làm lệch Khách hàng |

Chưa có lý do sửa `orders.js`, `admin.js`, `order-modal-v8.js` hoặc file Khách hàng để xử lý riêng các lệch CSS ở bảng đối chiếu. Những vấn đề handler, dữ liệu cũ và an toàn template cần testcase và đánh giá riêng; không tự gộp thay đổi nghiệp vụ vào một lần dọn CSS.

## Kiểm tra baseline đã chạy

| Kiểm tra | Kết quả | Giới hạn |
| --- | --- | --- |
| `admin_component_standards_ui.cjs` | PASS tại 1280/1440/1680; các thuộc tính Khách hàng được test không đổi khi thêm shared CSS; kiểm tra ID/scope/label/cuộn ngang pass | Dữ liệu fixture; chỉ so một tập thuộc tính, chưa so weight/letter-spacing/thông tin phụ/KPI/hồ sơ |
| `admin_orders_pos_modal_standard_ui.cjs` | PASS tại 1280/1440/1680 và mobile; validation, chọn nhanh, quote/cart, focus, khóa đóng khi gửi, chống gửi trùng, giữ dữ liệu khi lỗi | Transport giả lập trong test; không tạo đơn hoặc khách thật |
| `admin_orders_receipt_standard_ui.cjs` | PASS; title, Escape, focus restore, biên mobile, escape nội dung và scope cột | Handler đóng trong fixture được gắn riêng; không chứng minh toàn bộ shell/modal khác |
| `admin_orders_pos_search_ui.cjs` | PASS; debounce, text safety, chỉ tải chi tiết khách được chọn, tự điền địa chỉ, chọn biến thể, trạng thái rỗng | Transport giả lập; không xác minh quyền/CRUD production |
| Đo CSS với toàn bộ link stylesheet trong `index.html` | Đã đo 1280/1440/1680, 19 modal tĩnh; không trùng ID trong fragment Khách hàng/Bán hàng; không có `pageerror` trong fixture | Không chạy toàn bộ script shell/module; ảnh/font mạng bị chặn; label được wrapper gắn lúc chạy chưa phản ánh ở kiểm kê HTML tĩnh |
| `node --check` | PASS cho `orders.js`, `order-modal-v8.js` và cả bốn controller | Chỉ kiểm tra cú pháp |

Test đã được chạy với đường dẫn lưu ảnh chuyển vào `scratch/orders-audit`, không sửa file test gốc. Fixture dùng dữ liệu kiểm thử trong trình duyệt cô lập; không thêm mock hoặc JSON fallback vào Admin. Không kết nối hoặc ghi Supabase trong audit. Không sử dụng kết quả này để khẳng định CRUD production hay số request của toàn ứng dụng đã được nghiệm thu.

Đã xem ảnh baseline Bán hàng 1440px và đo các viewport còn lại. Chưa hoàn tất kiểm tra trực quan mọi trạng thái, mọi modal và hồ sơ ở cả ba viewport. Không coi bước đo tự động là thay thế cho việc này.

## Thứ tự triển khai và phần chưa hoàn thành

1. Chuẩn hóa KPI, rồi toolbar và từng vai trò chữ trong bảng; mỗi component có nguồn chính trong CSS chung và testcase so đầy đủ thuộc tính.
2. Chuẩn hóa loading/empty/error và menu tác vụ, giữ nguyên tìm kiếm/lọc/phân trang/xuất file.
3. Chuẩn hóa hồ sơ đơn và HTML động, kiểm tra không tìm thấy đơn, dữ liệu dài và RMA; giữ bố cục nghiệp vụ.
4. Chuyển từng modal theo kiểm kê, chạy handler thật với transport cô lập; giữ input/validation/pending/permission và hành động in.
5. Chạy lại baseline Khách hàng, POS, phiếu thu và test nghiệp vụ phù hợp. Chỉ chuyển phân hệ sau khi mọi khác biệt còn lại có lý do nghiệp vụ và các tiêu chí nghiệm thu được xác minh.

**Kết luận audit:** đã hoàn thành bảng đối chiếu của phân hệ đầu tiên và danh sách thay đổi/rủi ro trước khi code. Chưa triển khai giai đoạn B và chưa nghiệm thu Bán hàng hoặc toàn Admin.

## Giai đoạn B — đã sửa component KPI

Sau khi người dùng đồng ý triển khai KPI, đã sửa riêng dải chỉ tiêu tại ba tab Đơn hàng, Sản phẩm và Khuyến mãi:

- `pages/admin/admin-components.css`: thêm component `.admin-kpi-grid` trong phạm vi `.admin-ui-standard`; nhãn 11px/500, số 23px/650, line-height và letter-spacing theo Khách hàng, padding 10px 14px, gap 4px, min-height 62px. Giữ vỏ nền bán trong suốt và radius 9px theo quy chuẩn; phần tử bên trong không chồng nền.
- `pages/admin/modules/orders/orders.css`: giữ định nghĩa số cột và breakpoint nghiệp vụ; chuyển số cột Sản phẩm/Khuyến mãi từ inline sang modifier. Gỡ ba block KPI global trùng với CSS Khách hàng sau khi kiểm tra tác động trước/sau.
- `pages/admin/modules/orders/orders-v8.css`: gỡ các định nghĩa KPI cũ về cỡ chữ, khoảng cách và surface đã chuyển sang component chung.
- `pages/admin/modules/orders/orders.html`: ba dải opt-in vào component mới; gỡ màu và cỡ chữ inline cùng class màu tiện ích chỉ trong KPI để số liệu có cùng màu chữ theo tham chiếu. Giữ đủ 14 ID, nhãn, skeleton và class nghiệp vụ. Số tiền dài được phép xuống dòng; không cắt mất giá trị.
- `pages/admin/index.html`: tăng phiên bản ba stylesheet thay đổi, giữ nguyên thứ tự nạp.
- `scripts/test/admin_orders_kpi_ui.cjs`: thêm kiểm tra so với Khách hàng ở ba viewport, đủ ID/loading, số cột và nội dung dài.

Khác biệt nghiệp vụ giữ lại: 6 chỉ tiêu đơn hàng, 5 chỉ tiêu kho và 3 chỉ tiêu khuyến mãi; tab đơn hàng vẫn chuyển thành 3 cột khi viewport không quá 1400px; cách tính, dữ liệu thiếu và các handler cập nhật theo ID không đổi. Không sửa JavaScript ứng dụng, API hay truy vấn Supabase.

Kết quả kiểm tra sau sửa:

| Kiểm tra | Kết quả |
| --- | --- |
| `node scripts/test/admin_orders_kpi_ui.cjs` | PASS tại 1280/1440/1680; so font-family, size, weight, line-height, letter-spacing, màu, padding/gap/min-height; giữ 14 ID/skeleton/số cột; số 0, chuỗi số rất dài, số tiền lớn, `Chưa đủ dữ liệu` và `—` không tràn |
| `admin_component_standards_ui.cjs` qua runner lưu ảnh trong workspace | PASS; bảng, control, trạng thái, label/scope và cuộn ngang vẫn đạt các kiểm tra hiện có |
| So sánh baseline trước/sau bằng `scratch/verify-kpi-isolation.cjs` | PASS ở cả ba viewport: các thuộc tính giao diện được đo của mọi phần tử Khách hàng và KPI của Dashboard, Thú cưng, Dịch vụ, Nhân sự, Khiếu nại, Chatbot, Cài đặt không đổi |
| `node --check scripts/test/admin_orders_kpi_ui.cjs` | PASS |
| `git diff --check` | PASS |
| Kiểm tra ảnh | Đã xem Đơn hàng 1280px, Sản phẩm 1440px và Khuyến mãi 1680px; ảnh của cả ba tab ở cả ba viewport lưu tại `scratch/orders-kpi-verification` |

Các kiểm tra dùng trình duyệt cô lập và dữ liệu fixture, không kết nối Supabase. Chưa kiểm thử CRUD production; phần thay đổi này không chỉnh sửa logic CRUD. Chưa sửa bộ lọc, bảng, hồ sơ hoặc modal; các tồn tại trong audit giai đoạn A của những component đó vẫn còn và chưa được nghiệm thu.

### Đính chính sau đối chiếu ảnh của người dùng

Bản KPI đầu tiên chưa đạt tương đồng thị giác: vẫn giữ breakpoint 1400px chia 6 chỉ tiêu đơn thành hai hàng và giữ vỏ bo góc/nền bán trong suốt. Các test ban đầu chỉ so typography và spacing, thậm chí xác nhận lại breakpoint cũ, nên không phát hiện hai sai khác này. Kết luận trước đó về mức độ đồng bộ KPI là chưa đầy đủ.

Đã sửa lại component chung theo dải Khách hàng thực tế: nền trắng, viền `#DCE4DE`, góc vuông, margin/padding ngoài bằng 0. Sáu chỉ tiêu đơn ở cùng một hàng tại 1280/1440/1680px; chỉ chuyển ba cột khi màn hình không quá 700px. Quyết định này thay thế việc giữ breakpoint 1400px được ghi ở phần triển khai đầu tiên. Số chỉ tiêu và ID nghiệp vụ không đổi.

Test `admin_orders_kpi_ui.cjs` đã bổ sung so trực tiếp toàn bộ surface với Khách hàng và kiểm tra tọa độ cạnh trên của mọi ô cùng hàng; không còn dùng breakpoint cũ làm tiêu chí nghiệm thu. Test KPI, test component hiện có, so sánh cô lập Khách hàng/bảy phân hệ khác và `git diff --check` đều PASS sau sửa. Đã xem ảnh Đơn hàng 1280px sau sửa để xác nhận dải sáu ô một hàng, góc vuông. Bộ lọc và khối bảng bên dưới vẫn thuộc các bước chuẩn hóa tiếp theo, không được coi là đã giống Khách hàng.
