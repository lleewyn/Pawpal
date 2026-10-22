# Bán hàng V1 — triển khai và nghiệm thu

## Cổng khách hàng — đang hoàn thiện

Phần này tách biệt với các mục nghiệm thu Admin bên dưới. Chưa nghiệm thu toàn bộ phân hệ mua hàng của khách.

- [x] Danh mục và phân loại bán lấy từ Cloud mới; giá và tồn khả dụng theo từng SKU, không tạo phân loại hoặc phụ phí giả.
- [x] Giỏ hàng lưu nguyên tử qua `own_customer_cart`; máy chủ lấy lại giá và kiểm tra tồn, không tin giá gửi từ trình duyệt.
- [x] Migration `061` và `062` đã áp lên Cloud mới. Lần cập nhật nhật ký giữ nguyên dữ liệu public, thông tin Auth và 17 nhân viên; có bản sao lưu riêng trước khi áp.
- [x] Kiểm thử độc lập giỏ hàng đạt 26 trường hợp; giao dịch thử trên bản phục hồi kiểm tra giá, rollback, tạo đơn lặp, thanh toán chờ xác nhận và hủy giải phóng tồn. Đã bổ sung claim vai trò Auth để kiểm thử cả trigger nhật ký.
- [x] Kiểm thử trình duyệt với mã giao diện đang phát triển: giỏ hàng → đặt đơn → khoản thu ở trạng thái chờ nhân viên xác nhận → hủy đơn và giải phóng giữ tồn. Dữ liệu thử được dọn sau kiểm tra; không xuất kho hoặc ghi khoản thu thành công. Kiểm thử quyền cũng chặn xem/hủy đơn của khách khác và tự xác nhận khoản thu.
- [x] Máy chủ tiếp nhận yêu cầu đổi trả qua `request_own_sales_return`: đúng chủ đơn, đúng dòng bán, số lượng không vượt phần đã mua và gửi lặp không tạo thêm phiếu. Khách không được truyền xác nhận nhận hàng/nhập kho; phiếu mới chỉ ở trạng thái chờ duyệt. Đã kiểm thử giao dịch trên bản phục hồi và gửi từ form với đơn thử riêng trên Cloud, sau đó dọn dữ liệu thử.
- [x] Form đổi trả được kiểm tra trực quan trên trình duyệt, đóng bằng Escape và nút Đóng không bị thanh đầu trang che. Trang theo dõi đọc tên/giá từ dòng đơn gốc, hiển thị chờ duyệt; đã nhận hàng trả không đồng nghĩa đã hoàn tiền. Đã bỏ hàm tự trừ điểm cũ khỏi trang theo dõi.
- [x] Sửa bộ lắng nghe cập nhật cho bảng con không có `customer_id`; quyền đọc vẫn do RLS theo đơn gốc kiểm soát. Bộ kiểm thử giỏ hàng/quyền truy cập và đăng ký kênh hiện đạt 27 trường hợp.
- [x] Trang chi tiết đơn đọc Cloud mới, tổng tiền phía máy chủ và phương thức theo cấu hình thực tế. Bỏ tự hoàn tất sau 3 ngày, tự cộng điểm, kho và QR/thanh toán giả của trang cũ. Hộp hủy yêu cầu lý do, giữ phiên bản đơn, đã thử Escape và hủy thành công từ trình duyệt.
- [x] Xác nhận nhận hàng qua RPC chỉ cho đơn đã bàn giao; kiểm thử trên bản phục hồi xác nhận gửi lặp không xuất kho lần hai, không tự ghi thu tiền hoặc thưởng điểm.
- [x] `063_customer_sales_reviews.sql`: gửi đánh giá nguyên tử, đúng chủ và dòng đã nhận, mức 1–5, nội dung bắt buộc, chống gửi lặp và trạng thái chờ duyệt. Form đã thử lỗi thiếu dữ liệu, gửi thực tế và tải lại còn nội dung; không ảnh/tệp và không thưởng điểm.
- [x] Kiểm thử đánh giá công khai ở trang sản phẩm: chỉ đánh giá đã duyệt, đúng SKU, nội dung được mã hóa khi hiển thị, không đọc hồ sơ khách. Đã thử ẩn khi chờ duyệt, công bố sau duyệt và hiển thị thực tế trên trình duyệt. Bỏ ảnh sản phẩm tự gắn vào đánh giá trống và nút đếm hữu ích giả.
- [x] Rà soát ngày 23/10/2026: bỏ mô phỏng VNPay, tự xác nhận thanh toán qua tham số URL và cập nhật trạng thái trực tiếp từ API cũ. Trang callback/mô phỏng cũ chỉ mở đơn từ Cloud. Trình duyệt đã thử URL giả `vnp_ResponseCode=00` và số tiền tùy ý; đơn vẫn chờ xác nhận, khoản thu vẫn pending.
- [x] `064_customer_checkout_address.sql` đã áp Cloud mới sau sao lưu, đối soát không đổi dữ liệu nguồn/Auth/17 nhân viên. Thêm/sửa người nhận và địa chỉ qua RPC, chặn phiên bản cũ và địa chỉ khách khác; đặt mặc định/xóa giữ đúng một mặc định. Trình duyệt đã thêm hai địa chỉ, tải lại, đổi mặc định, xóa mặc định và đóng form bằng Escape; đã xem ảnh form/sổ địa chỉ.
- [x] Ưu đãi: bỏ voucher cá nhân trong bộ nhớ cũ, bỏ suy đoán trần giảm từ mô tả và nhóm hàng. Áp voucher cần quote máy chủ; số dư điểm lấy từ quote, lựa chọn điểm tách theo tài khoản và không cộng dồn với voucher. Bản phục hồi đã thử giảm theo cấu hình và chặn voucher cần quyền sở hữu khi khách chưa đổi.
- [x] Dọn mã đặt đơn/khách tạm, QR, bộ đếm tự hủy, điểm và lịch sử đơn chỉ ghi trình duyệt ở checkout. Yêu cầu hóa đơn được lưu đủ thông tin vào ghi chú đơn để nhân viên xử lý, không báo tự phát hành; đã thử lưu và đọc lại ghi chú thực tế.
- [x] Hoàn thiện chi tiết đơn, đổi trả và đánh giá. Trình duyệt với Cloud thật đã kiểm tra Realtime cho trạng thái đơn, khoản thu, đổi trả và duyệt đánh giá; giữ bản nháp khi cập nhật. Đã sửa phản hồi đổi trả đến sau khi đóng trang; kiểm tra không còn lỗi JavaScript chưa xử lý. Bộ kiểm thử hồi quy đạt 82/82; giao dịch giỏ hàng và thú cưng trên bản phục hồi đều đạt.
- [ ] Triển khai mã giao diện mới lên Vercel và kiểm tra lại bản đã triển khai.

Đặt đơn và nhận hàng không tự xác nhận đã thu tiền, không tự cộng điểm hoặc nâng hạng. Yêu cầu đổi trả không tự nhập kho hoặc hoàn tiền.

Ngày cập nhật: 22/10/2026. Đã chuyển các luồng Admin Bán hàng sang V1, áp migration trên Cloud mới và triển khai Vercel. Nghiệm thu ghi dữ liệu thực hiện trên bản phục hồi riêng; Production được kiểm tra đọc, không tạo đơn hoặc thanh toán thử.

## Quy tắc đã chốt

- Tạo đơn giữ tồn; xuất hàng mới ghi sổ trừ kho. Hủy đơn chưa xuất giải phóng tồn.
- Hàng trả chỉ nhập lại sau khi nhân viên xác nhận đã nhận đủ và kiểm định còn bán được.
- Thu một phần hoặc toàn bộ và hoàn tiền là giao dịch thực tế được nhân viên xác nhận, có lý do. Không tự cộng điểm hoặc xét hạng.
- Tiếp tục dùng 105 bảng V1 đã chốt. Không thêm chi nhánh, kho, thương hiệu, phiếu nhận hàng hay bảng phân bổ đã loại khỏi thiết kế.
- Dữ liệu thiếu trong nguồn giữ trạng thái thiếu; không tạo tồn kho, khách, địa chỉ, vận đơn hoặc dòng thanh toán giả.

## Đã kiểm tra trên bản phục hồi riêng

- Đọc đúng V1: sản phẩm, biến thể, ảnh, tồn kho, đơn, dòng đơn, tổng tiền, thu/hoàn, đổi trả, số điện thoại và điểm khách. Cloud mới đọc được 37 sản phẩm, 23 đơn, 35 khách; số lượng trong môi trường kiểm thử tăng do dữ liệu kiểm thử riêng.
- Bỏ bộ sản phẩm POS giả và việc phục hồi dữ liệu nghiệp vụ từ bộ nhớ phiên trong lõi Bán hàng. POS chọn từng biến thể thực tế.
- `019_admin_sales_stock.sql`: điều chỉnh sổ kho có dấu, chống gửi lặp, chống sửa đồng thời, không xuất dưới phần tồn đã giữ; thay đổi giá và trạng thái đi cùng giao dịch và nhật ký.
- `020_admin_sales_fulfillment.sql`: giữ tồn khi xác nhận, giải phóng khi hủy, xuất kho đúng một lần khi bàn giao/nhận hàng; giao thành công không tự tạo thanh toán. Xác nhận, hoàn tất, bàn giao và hủy đã nối RPC.
- `021_admin_sales_catalog.sql`: lưu sản phẩm và biến thể nguyên tử; giữ ID SKU khi sửa; ngừng bán biến thể bỏ khỏi danh mục thay vì xóa lịch sử; tồn đầu chỉ ghi một lần; điều chỉnh tồn của biến thể cũ phải đi qua sổ kho riêng. Đã thử lưu sửa từ trình duyệt.
- `022_admin_sales_cashier.sql`: số dư từ tổng đơn và giao dịch thành công, thu một phần/toàn bộ, hoàn từ khoản thu gốc, mã ngân hàng không trùng, kiểm tra phiên bản và quyền. Modal thu ngân dùng lựa chọn từ CSDL và xác nhận thực nhận/thực hoàn.
- `023_admin_sales_returns.sql`: yêu cầu trả gắn đúng dòng bán, chặn tổng trả quá số đã mua; xác nhận nhận/kiểm định mới ghi nhập lại, không tự hoàn tiền. Đã thử tạo yêu cầu trên trình duyệt. Giao diện xử lý tiếp yêu cầu đã lập còn đang triển khai.

Các kiểm thử hiện có trong `scripts/test/sales_*_v1.cjs` và `sales_*_browser_v1.cjs`. Chỉ chạy thử ghi dữ liệu trên cơ sở dữ liệu phục hồi và API cổng 8011; không dùng làm kiểm thử ghi lên Cloud.

## Danh sách nghiệm thu

- [x] Tạo đơn POS nguyên tử, tính giá phía máy chủ, giữ tồn; phí giao và địa chỉ thật, không tự ghi đã thanh toán. Đã thử API và trình duyệt trên bản phục hồi.
- [x] Người dùng chốt dùng cấu hình CSDL. Giảm hạng lấy `membership_tier.discount_percent`; quy đổi điểm cần khóa cấu hình `sales_point_redemption_value` là số nguyên dương. Thiếu cấu hình thì không áp dụng và không trừ điểm. Không tự tạo giá trị mặc định. Mỗi đơn chọn một cách giảm: theo hạng, voucher hoặc điểm; chưa tự cộng dồn các loại giảm.
- [x] Bàn giao đơn lẻ/hàng loạt và hủy qua RPC. Đã thử rollback cả đợt, chống gửi lặp, xuất đúng một lần, hoàn tiền trước khi hủy. Không đánh dấu hàng loạt đã thu tiền. Đã chạy thao tác gửi từ modal đơn lẻ và hàng loạt trên trình duyệt.
- [x] Nhập hàng và kiểm kê từng biến thể, nhà cung cấp thật, sổ kho nguyên tử. Đã thử API và trình duyệt, giữ số đếm qua phân trang; lịch sử gồm tất cả SKU của sản phẩm, tối đa 10 dòng/trang.
- [x] Lưu danh mục, trạng thái qua RPC; đánh giá và phản hồi theo dòng đơn V1. Đã thử sửa sản phẩm, giữ ID biến thể, tạo mới nhiều biến thể trên trình duyệt, phản hồi và chống nội dung HTML thực thi.
- [x] Lập và tiếp tục xử lý yêu cầu trả; chỉ nhập lại sau xác nhận đã nhận và còn bán được. Không tự hoàn tiền. Đã thử API và trình duyệt.
- [x] Tạo/ngừng/gia hạn voucher, lượt dùng từ lần áp dụng thực tế. Đã thử API và trình duyệt; không dùng `usage_count` giả.
- [x] Kiểm tra các lỗi dữ liệu, tranh chấp, quyền và gửi lặp trong bộ test API; kiểm tra biểu mẫu, lịch sử, phân trang, chuyển tab và tải lại trên trình duyệt. Realtime kết nối thành công; các bảng Bán hàng chính có trong publication. Chưa tạo giao dịch Production để kích hoạt thử sự kiện Realtime.
- [x] Sao lưu Cloud, áp migration đã thử, đối chiếu số liệu và quyền, kiểm thử trình duyệt trên Cloud và triển khai Vercel.

Chưa được xóa bản Docker hoặc dữ liệu cách ly. Không nhập cưỡng bức các đơn nguồn có tổng không khớp dòng hàng.

## Bổ sung kiểm thử và lưu ý chuyển hệ thống

- `019`–`028` đã áp và kiểm tra trên bản phục hồi, local và Cloud mới. Không có dữ liệu kiểm thử được ghi lên Cloud. Backup trước áp Cloud: `D:\Aboutme\Pawpal-infra\supabase-local\backups\sales-cloud-2026-10-22T01-26-42-096Z`.
- Cloud đọc đối chiếu còn 37 sản phẩm, 23 đơn, tồn 4382 và điểm 7964. Trong 23 đơn có 18 đơn đang giao từ nguồn cũ. `020` ghi ranh giới nguồn trong nhật ký khi kích hoạt: số tồn hiện tại đã được chuyển bằng số dư đầu. Hoàn tất các đơn đang giao này không xuất kho hoặc giữ tồn lần nữa; xác minh băm dòng hàng trước khi cho phép. Đơn mới vẫn phải có bút toán xuất đúng một lần.
- `028` bàn giao tối đa 100 đơn mỗi đợt, cần mã vận đơn thực tế riêng từng đơn; một đơn lỗi thì toàn bộ giao dịch rollback. Không kết nối API hãng vận chuyển hay tự phát sinh vận đơn.
- Phiếu bán hàng hiển thị tổng, giảm giá, phí giao, đã thu sau hoàn, đã hoàn và còn phải thu. Phiếu đóng gói và bảng kê bỏ địa chỉ/hotline/vận đơn giả. Nội dung đưa vào phiếu được escape. Hộp thoại in dùng trình duyệt; chưa phải hóa đơn điện tử có mã thuế.
- Bộ kiểm thử đã đạt trên bản phục hồi: kho, danh mục, bàn giao, thu/hoàn, trả hàng, voucher, nhập/kiểm kê, phản hồi đánh giá, tính giá/POS; gồm chống gửi lặp, dữ liệu cũ, tranh chấp tồn, rollback và trình duyệt.
- Cloud sau áp giữ nguyên số khách, đơn, sản phẩm, biến thể, thu/hoàn, tồn 4382 và điểm 7964; cấu trúc 105 bảng / 906 cột / 160 FK / 105 RLS, không mở quyền bảng cho anon.
- Kiểm tra Cloud trên giao diện mới đạt 23 đơn, 37 sản phẩm; tổng từng biến thể có dữ liệu tồn khớp nguồn. Một số biến thể nguồn thiếu bản ghi tồn: hiện dấu thiếu dữ liệu, không tính giá trị tồn hoàn chỉnh và không tự tạo số tồn. Số giữ hàng đọc trực tiếp `stock_reservation`, không suy từ trạng thái đơn hoặc trùng tên sản phẩm.
- Bản kiểm thử API/CSDL tạm trên cổng 8011 đã dọn sau khi đối chiếu định nghĩa hàm với local; giữ backup đầy đủ. Không xóa Supabase Docker gốc.
- Kiểm tra chéo Production: Khách hàng 35 hồ sơ/7964 điểm; Thú cưng 82 hồ sơ; Dịch vụ 71 lịch/22 dịch vụ/3 đánh giá. Lần kiểm tra Dịch vụ đầu gặp REST 500; chạy lại đạt đầy đủ, chưa sửa mã Dịch vụ trong đợt này.
- Phạm vi là Admin Bán hàng. Trang gian hàng phía khách, tích hợp tạo vận đơn tự động, hóa đơn điện tử, tải ảnh/file và cộng điểm/xét hạng tự động chưa được triển khai trong đợt này. Xuất Excel giữ cách xuất dữ liệu đọc hiện tại; chưa tự động kiểm tra hộp thoại lưu/in của hệ điều hành.
- Đã gom mã JavaScript về đúng cấu trúc có sẵn: `orders.js` và 4 file `tab-order-list.js`, `tab-order-detail.js`, `tab-order-products.js`, `tab-order-promos.js`. Bỏ 9 file tách thêm và cập nhật loader. Kiểm tra bản gom trên local với Cloud thật đạt đọc dữ liệu, thu ngân, Realtime, tải lại và mở các modal; không ghi dữ liệu nghiệp vụ thử. Bản gom đã triển khai Vercel và kiểm tra Production đạt.
- Vercel Production: [Admin Pawpal](https://pawpalgr3.vercel.app/admin/login), deployment `dpl_FB5ztavgkWNGzH1qZ1wJpWHK4hjo`. Lượt kiểm tra cuối trên deployment này đạt danh sách/giá trị đơn/tồn/đánh giá/lịch sử kho/thu ngân/chuyển tab/Realtime/reload; không gọi Cloud cũ, tunnel, JSON dữ liệu hoặc ghi nghiệp vụ thử.
