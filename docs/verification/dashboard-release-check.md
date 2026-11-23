# Kiểm tra phạm vi Dashboard — cập nhật 22/11/2026

Đối chiếu mã hiện tại với `docs/dashboard-development-plan.md`, gồm phần tiếp tục sau gián đoạn ngày 21/11. Đây là kiểm tra tiến độ và giới hạn của mã local/CSDL, không phải nghiệm thu toàn bộ M0–M5 hoặc xác nhận frontend đã phát hành.

## Phần đã có trong mã hiện tại

- Hai tab dùng nền tảng giao diện chung theo trang Khách hàng hiện tại; bỏ ghi đè header, thống nhất thẻ, KPI, nút, bộ lọc, bảng và phân trang. Có kiểm thử computed styles với toàn bộ thứ tự CSS trong `index.html`.
- Tab Vận hành ưu tiên danh sách việc, gom lý do theo hồ sơ, lọc nhóm/khẩn cấp/chưa phân công/chờ lâu, phân trang 10 dòng, giữ bộ lọc và hiển thị lịch bắt đầu hôm nay.
- Giữ lịch cũ còn mở, cập nhật ngưỡng theo đồng hồ và khi chuyển ngày; nhận biết lỗi nguồn, thiếu quyền và kết quả bị cắt. Có kiểm tra đường dẫn hỗ trợ dùng loader của router, đồng bộ ID cho phân hệ được cache.
- Kinh doanh bổ sung phân tích số giao dịch và giá trị dòng/bình quân riêng cho đơn bán hàng và ca dịch vụ đã hoàn thành. Tiền thu/hoàn so sánh kỳ trước cùng thời lượng đã trôi qua; giá trị dòng theo ngày hoàn tất, chưa trừ voucher và hoàn tiền, không phải tiền thực thu/doanh thu ghi nhận/lợi nhuận.
- Bổ sung khách lần đầu trong lịch sử quan sát và khách từng giao dịch trước kỳ nay quay lại; phân biệt với khách có từ hai giao dịch trong kỳ và hồ sơ khách mới. Tỷ lệ hủy/vắng dùng hồ sơ tạo trong kỳ làm mẫu số, trình bày rõ đây là trạng thái hiện tại của nhóm đó.
- Có danh sách giao dịch hoàn thành, khoản thu và khoản hoàn qua RPC phân trang 10 dòng; mở hồ sơ có liên kết rõ ràng, chặn kết quả trả về muộn khi đổi kỳ/đóng danh sách. Giữ cơ cấu nguồn thu, xếp hạng, thành viên, voucher và điểm. Kế hoạch thu/chi vẫn là giả định.
- Migration 259 đã có trên Cloud từ lượt làm trước. Xác minh trực tiếp các RPC/bảng lịch sử đang tồn tại; mốc bắt đầu ghi nhận là **12:33:21 ngày 21/11/2026, giờ Việt Nam**. Migration 260 đã áp dụng trong lượt tiếp tục, chỉ sửa tuổi cảnh báo ca quá giờ; không sửa migration 259 đã triển khai.
- Thêm lịch lưu trú, nhận/trả phòng và các chặng đưa đón dự kiến; lịch sử hồ sơ đang mở; bảng việc được tổng hợp/phân trang tại server. Không có dữ liệu mẫu trong Admin. Dữ liệu giả chỉ nằm trong kiểm thử cô lập và bảng tạm có hoàn tác.
- Sửa lỗi render chi tiết đơn hàng khi kết quả đọc về sau lúc đã rời module; khởi tạo lại tab chi tiết Dịch vụ khi quay lại module đã cache. Các thay đổi nghiệp vụ Khiếu nại khác trong workspace được giữ nguyên, không thuộc gói Dashboard.

## Còn thiếu, theo thứ tự ưu tiên

### 1. SLA và nghĩa của thời gian chờ — đã sửa phần sai lệch

Dashboard đọc `support_ticket.sla_due_at`, dùng hạn gốc để cảnh báo quá hạn giải quyết, báo rõ phiếu thiếu hạn. Giữ riêng ngưỡng chưa phản hồi lần đầu 4 giờ. Không còn tự gán hạn giải quyết 24/48 giờ theo ưu tiên ở giao diện. Ngưỡng phản hồi và các ngưỡng nghiệp vụ còn lại vẫn cần người phụ trách chốt.

Tuổi đơn đang chuẩn bị lấy từ sự kiện chuyển trạng thái đã quan sát. Hồ sơ cũ thiếu sự kiện được báo thiếu mốc; sửa ghi chú không làm đổi tuổi cảnh báo. Migration 260 tính độ quá giờ của ca đang phục vụ từ `scheduled_end_at`, đồng nhất với `buildAlerts()`; không dùng toàn bộ thời gian từ đầu ca làm thời gian trễ.

### 2. Hoàn thành điều hành và vòng đời công việc — phần còn lại của M1

- Đã có lịch sử chuyển trạng thái và phân công cấp hồ sơ cho bốn nhóm lịch hẹn, đơn hàng, hỗ trợ, đổi trả. Bản ghi khởi tạo xác định số tồn tại mốc bắt đầu; không tạo lịch sử hoàn tất quá khứ. Bảng đối chiếu tồn đầu + mới mở + mở lại − kết thúc − đã xóa = tồn cuối đếm **hồ sơ nghiệp vụ còn mở**, không phải vòng đời từng cảnh báo. Còn thiếu thời điểm nhận việc, người thực hiện, lịch sử phân công cấp dòng dịch vụ và số đo xử lý đúng hạn theo loại việc.
- Có người phụ trách ở lịch hẹn và hỗ trợ; chưa có nguồn giao việc đáng tin cậy cho đơn hàng, tồn kho và mọi loại đổi trả. Chưa có hạn xử lý và ảnh hưởng xác minh được cho từng việc.
- Đã có hàng đợi riêng cho khách đang lưu trú, nhận/trả phòng và chặng đưa đón dự kiến từ `hotel_booking`/`taxi_trip`. Chưa có trạng thái hoàn tất độc lập cho từng chặng và mô hình điều phối đầy đủ. Danh sách lịch bắt đầu hôm nay vẫn giữ nghĩa riêng theo `scheduled_start_at`.
- Mức tải nhân sự còn là số lịch đồng thời/ca và thời lượng; chưa đủ mô hình kỹ năng, loại dịch vụ, phòng hoặc tài xế để kết luận năng lực chuyên biệt.
- Chưa có đầy đủ hàng chậm luân chuyển, vốn tồn, hàng sắp hết hạn, hàng đang về và thời gian nhập bổ sung. Chỉ mở khi nguồn có thật và đủ định nghĩa.

### 3. Giải thích biến động kinh doanh — M2

- Đã có số giao dịch, giá trị dòng/bình quân và phân rã chênh lệch; chỉ phân rã khi cả hai kỳ đủ giao dịch/dòng chi tiết. Đơn dùng `delivered_at`, ca dịch vụ dùng `check_out_time`; các hồ sơ thiếu ngày hoàn tất được báo để đối soát, không tự đặt ngày thay thế.
- Đã có nhóm khách lần đầu trong lịch sử quan sát, khách giao dịch trước kỳ quay lại và khách lặp trong kỳ, cùng danh sách chứng minh riêng từng nhóm. Cần nghiệm thu phạm vi lịch sử; chưa mở chỉ số giữ chân theo cửa sổ 30/60/90 ngày.
- Đã có tỷ lệ hủy/vắng với mẫu số theo ngày tạo hồ sơ và danh sách chứng minh ở cả tử số/mẫu số, cùng giao dịch/thu/hoàn. Còn chốt định nghĩa tỷ lệ hoàn tiền; không dùng giá trị tiền hoàn/tiền thu để tự coi là tỷ lệ giao dịch hoàn.
- So sánh thu thuần và giao dịch hoàn thành đã dùng kỳ trước cùng thời lượng đã trôi qua. Các bảng xếp hạng cũ vẫn dùng ngày tạo đơn/giờ bắt đầu lịch, có cơ sở ngày riêng; không dùng chúng để tự giải thích biến động tiền thu.

### 4. Dữ liệu tài chính và báo cáo thực tế — M3/M4

Đã bổ sung sổ tài chính và kết quả có điều kiện trong Dashboard → Kinh doanh bằng migrations 263–266; chi tiết kiểm tra ở phần cuối tài liệu. Số dư đầu, chi phí và giá vốn lịch sử vẫn cần người quản lý nhập theo chứng từ thật. Phần chưa đủ nguồn hoặc chưa xác nhận đủ chi phí không công bố kết quả hoạt động. Lịch thu chi là kịch bản theo quỹ/công nợ đã khai báo, không phải dự báo bằng mô hình hoặc kết luận khả năng chi trả toàn doanh nghiệp. Các RPC kế hoạch `246/247` vẫn là giả định riêng.

### 5. Nghiệm thu và hiệu năng — M0/M5

- Còn xác nhận định nghĩa/ngưỡng nghiệp vụ, quyền theo vai trò và nguồn chuyên biệt; kiểm tra Realtime đầu cuối khi nghiệp vụ thật thay đổi ở môi trường thử nghiệm.
- Kiểm thử với tài khoản Admin thật đã mở và xác minh nội dung năm hồ sơ đơn hàng/dịch vụ/khách hàng từ Dashboard, gồm quay lại và mở hồ sơ khác trong module đã cache. Không thay thế nghiệm thu mọi màn hình đích, vai trò và trường hợp hồ sơ không còn quyền.
- Sáu KPI đã tổng hợp tại server bằng migration 262; bảng việc, lưu trú/đưa đón và các danh sách chứng minh đã phân trang tại server. Các biểu đồ và một số danh sách chi tiết vận hành vẫn đọc từng trang 500 dòng, giới hạn 5.000 dòng mỗi nguồn ở trình duyệt (`readPaged()`), có báo bị cắt. Còn tối ưu nguồn tổng hợp cho phần này và đo theo quy mô dữ liệu phù hợp; chưa được coi toàn Dashboard đã hết giới hạn tải.
- Cần đối chiếu mã đang phục vụ sau phát hành; việc push Git thành công không tự chứng minh Vercel đã triển khai xong.

## Kiểm tra lần tiếp tục

- `dashboard_admin_style_ui.cjs`: đạt, đối chiếu Khách hàng và hai tab ở 1440/820/390/320px, modal kế hoạch và header chung.
- `dashboard_business_ui.cjs`, `dashboard_finance_ui.cjs`, `dashboard_operations_workboard_ui.cjs`, `dashboard_completion_ui.cjs`: đạt. Bổ sung kiểm tra danh sách thu ngắn ở trang cuối, đổi tên bé/nhân viên qua sự kiện Realtime giả lập, phân rã biến động, nhóm khách, bằng chứng thu/hoàn, đổi kỳ khi đang tải và màn hình 1440/820/390/320px. Ảnh tại `artifacts/dashboard-workboard/`, `artifacts/dashboard-completion/`, `artifacts/dashboard-admin-style/` (artifact local được ignore).
- `dashboard_operations_metrics.cjs`: 26 kiểm thử đạt; `dashboard_business_metrics.cjs`: 10; `dashboard_completion_metrics.test.cjs`: 4. Tổng 40 ca tính toán đạt.
- `admin_orders_detail_refresh.cjs` và `complaint_service_navigation_ui.cjs`: đạt cho phản hồi muộn sau rời Bán hàng và mở lại tab chi tiết Dịch vụ đã cache. Không thay đổi nội dung modal trong lượt tiếp tục này.
- `apply_dashboard_completion_259.cjs`: đạt trong giao dịch hoàn tác; kiểm tra quyền Admin/anon/chưa đăng nhập, RLS và cấm ghi trực tiếp nhật ký, idempotency, truy vấn độc lập về giao dịch/tiền thu/số hồ sơ còn mở. Sáu tình huống thời gian dùng đối số SQL thuần so với bộ tính toán giao diện; sự kiện tạo/giao việc/đóng/mở lại/xóa thử qua bảng tạm và hoàn tác.
- Đã áp dụng **chỉ migration 260** bằng `node scripts/database/v1/apply_dashboard_completion_259.cjs --apply-cloud --followup-only`; không sửa hoặc tái áp dụng migration 259 trong bước này. Giữ nguyên mốc bắt đầu thu lịch sử; không thay đổi hồ sơ nghiệp vụ gốc.
- `dashboard_workboard_cloud_readonly.cjs`: đạt bằng tài khoản Admin thật, dùng mã Dashboard/router/Dịch vụ/Bán hàng local trên phiên ứng dụng hiện có; đọc được nguồn vận hành, logistics/lịch sử/bảng việc, phân tích và chứng minh thu/hoàn. Số lịch hôm nay khớp truy vấn độc lập, ba hồ sơ đích hiển thị đúng, không có lỗi JavaScript hoặc yêu cầu ghi nghiệp vụ. Chỉ cho phép danh sách RPC đọc đã xác minh, gồm đọc ảnh tiếp nhận/bàn giao; không truy vấn Supabase Logs.

## Bổ sung ngày 22/11/2026

- Áp dụng migration 261 bằng `node scripts/database/v1/apply_dashboard_analysis_261.cjs --apply-cloud`, sau khi kiểm tra hoàn tác đạt. Chín nhóm chứng minh khớp số tổng trong cùng snapshot/cùng mốc chốt; nhóm khách còn được so với truy vấn độc lập hợp nhất hai nguồn, không ghép payment hoặc dòng hàng để đếm khách. Kiểm tra mã nhóm/ngày không hợp lệ, Admin, anon và chưa đăng nhập; phân trang, chống trùng và liên kết nguồn đều đạt. Không sửa hồ sơ nghiệp vụ gốc.
- `dashboard_completion_ui.cjs` bổ sung kiểm tra bốn nhóm khách và năm nhóm theo ngày tạo/trạng thái, phân trang, chống chèn HTML từ tên khách, router hồ sơ khách, thiếu quyền riêng danh sách và thử lại. Vùng chứng minh không gây tràn ngang ngoài trang trên desktop/điện thoại.
- `dashboard_workboard_cloud_readonly.cjs` đạt với RPC mới: danh sách nhóm khách và hủy/vắng tải được; năm hồ sơ đích đơn/dịch vụ/khách hiển thị đúng; 38 đường dẫn API đọc, không lỗi JavaScript, không yêu cầu ghi nghiệp vụ. Các sửa đổi đang có của người dùng được giữ lại và kiểm tra cùng mã mới.
- Cache mã/CSS Dashboard đổi sang `20261122_dashboard_evidence`. Đối chiếu computed styles với Khách hàng và các kiểm tra kinh doanh/kế hoạch thu chi vẫn đạt.

## Sáu KPI không phụ thuộc giới hạn trình duyệt — 22/11/2026

- Migration 262 đã áp dụng bằng `node scripts/database/v1/apply_dashboard_operation_totals_262.cjs --apply-cloud`, sau kiểm tra hoàn tác. Cả sáu số tổng khớp truy vấn nguồn độc lập; kiểm tra khử trùng nhân viên có nhiều ca, nguồn tồn khả dụng và các vai trò RPC đạt. Không sửa dữ liệu nghiệp vụ gốc.
- `dashboard_operations_workboard_ui.cjs`: đạt với 5.001 lịch, số tổng đầy đủ, lỗi KPI không để lại số cũ/không biến thành 0, thử lại riêng KPI và thiếu quyền từng nguồn. Kiểm tra style theo Khách hàng, đồng hồ, chuyển ngày và gỡ kênh vẫn đạt. JavaScript dùng cache `20261122_dashboard_totals`; CSS giữ `20261122_dashboard_evidence`.
- Hướng tài chính sau phản hồi người dùng: bổ sung nơi ghi nhận từ phát sinh mới vì chưa xác định được nguồn chi phí/giá vốn/số dư/công nợ đủ đối soát. Chưa triển khai nơi ghi nhận này; chưa công bố lãi/lỗ, số dư khả dụng hay dự báo thiếu tiền thực tế.

Các phần điều phối/lịch sử còn thiếu ở mục 2, nghiệm thu P05 và tối ưu biểu đồ/danh sách bị giới hạn vẫn còn mở. Nền ghi nhận tài chính đã bổ sung theo mục bên dưới. Giao diện vẫn ở local, chưa push; schema Cloud không chứng minh Vercel đang phục vụ mã giao diện mới. Các kiểm tra Realtime ở trình duyệt cô lập chỉ chứng minh phản ứng với sự kiện giả lập, chưa chứng minh chuyển phát đầu cuối khi nghiệp vụ thật thay đổi.

## Sổ tài chính trong Dashboard → Kinh doanh — 22/11/2026

- Áp dụng migrations **263–266** bằng `apply_dashboard_finance_263_266.cjs --apply-cloud` sau kiểm tra hoàn tác. Có 14 bảng tài chính bật RLS; RPC yêu cầu Admin và quyền `finance.read`/`finance.write` tương ứng, kèm quyền nguồn. Không cấp ghi trực tiếp. Tại bước kiểm tra sau cài đặt, số quỹ, khoản ghi nhận, giao dịch tiền và dấu vết thao tác đều bằng 0; không giữ dữ liệu kiểm thử.
- Mốc bắt đầu cơ chế thu giá vốn/doanh thu: **21:24:30 ngày 22/11/2026, giờ Việt Nam** (`2026-11-22T14:24:30.531Z`). Đã xác minh một trigger nhập/xuất và sáu trigger nguồn doanh thu. Tồn cũ thiếu vốn giữ trạng thái chưa xác định; hồ sơ cũ cần xác nhận từ chứng từ. Không lấy giá vốn danh mục hiện tại để suy lại lịch sử.
- Quỹ có số dư đầu và thời điểm được nhập rõ ràng. Ghép khoản thu/hoàn theo tiền và ngày giao dịch gốc; khoản đã nằm trong số dư đầu dùng xác nhận riêng, không cộng tiền lần nữa. Chuyển quỹ hai vế nguyên tử, hủy cùng nhau; đối soát yêu cầu đúng số thực tế và khóa ghi lùi vào kỳ đã chốt.
- Ghi chi phí riêng với thanh toán; hỗ trợ trả nhiều lần, công nợ bổ sung và liên kết khách/nhà cung cấp/phiếu nhập. Công nợ từ đơn/ca đã hoàn tất dùng hóa đơn, thanh toán và phân loại hoàn/đổi trả gốc; không yêu cầu nhập lại số nợ. Có hạn thu/hoàn và liên kết hồ sơ gốc.
- Hoàn tiền phân biệt phần giảm thêm doanh thu, phần đã giảm trên hồ sơ/chứng từ, hoàn tiền nhận trước và bồi thường. Phiếu đổi trả cần xác nhận phần giảm thêm, cho phép số 0 có căn cứ. Chặn giảm trừ trùng; phần chưa phân loại khiến công nợ chưa xác định thay vì tự coi bằng 0.
- Giá vốn bình quân dùng giá mua thực tế và chụp tại xuất kho; hoàn kho theo vốn gốc. Xác nhận vốn tồn chỉ áp dụng lượng còn lại. Điều chỉnh vốn dòng bán có lý do, phiên bản và dấu vết; yêu cầu kiểm tra lại vốn tồn liên quan. Chi phí trực tiếp từng ca cho phép nhập 0 rõ ràng sau kiểm tra.
- Kết quả chỉ hiện khi đủ nguồn và người quản lý xác nhận đủ chi phí trong kỳ; dữ liệu mới làm mất hiệu lực xác nhận cũ. Bảo toàn kết quả âm, không gắn nhãn lợi nhuận sau thuế. Kỳ đang chạy ghi rõ tạm tính. Xuất CSV giữ trống kết quả chưa đủ căn cứ, có thời điểm số dư và mục còn thiếu.
- Lịch thu chi 7/30/60/90 ngày theo quỹ/công nợ đã khai báo. Mặc định không tính khoản phải thu; bật riêng để xem kịch bản. Khoản phải trả quá hạn xếp hôm nay, khoản phải thu quá hạn không tự giả định thu ngay; khoản thiếu hạn được báo riêng. Chưa có quỹ thì không dựng số dư dự kiến.
- Giao diện dùng đúng nền tảng Khách hàng, biểu mẫu nội tuyến, chọn thực thể bằng popover thuần chữ. Không thêm tab chính. Danh sách 10 dòng tại server, phân trang ngoài thẻ, tìm kiếm không tải lại báo cáo tổng, lưu vị trí sổ trong sessionStorage; dữ liệu nghiệp vụ vẫn chỉ lấy Supabase. Gộp sự kiện cập nhật và chỉ tải định kỳ khi màn hình đang hiện.
- Kiểm tra SQL hoàn tác đạt: chống gửi trùng, trả một phần/vượt nợ, hủy chuyển quỹ hai vế, khóa kỳ, xác nhận khoản trong số dư đầu không cộng tiền, khách/nhà cung cấp, phân loại hoàn và công nợ có dấu, hạn và phiên bản, xác nhận đổi trả 0, giá vốn gốc/hoàn kho/điều chỉnh, doanh thu một lần và biến động nối tiếp, xác nhận kỳ hết hiệu lực khi dữ liệu đổi, quyền và RLS. Bảng tạm chỉ kích hoạt hàm nguồn; không sửa hồ sơ nghiệp vụ thật.
- `dashboard_finance_register_ui.cjs` đạt: kiểm tra số để trống, số 0 có chủ đích, mất phản hồi và thử lại cùng mã yêu cầu, độ chính xác phiên bản, chọn/bỏ chọn thực thể, đặt hạn/hoàn/đổi trả/điều chỉnh vốn, phân trang/tìm kiếm/khôi phục vị trí, lịch tiền, CSV, lỗi nguồn và quyền đọc. Kiểm tra 1440/820/390/320px; ảnh biểu mẫu và sổ tại `artifacts/dashboard-finance-register/` (local, được ignore).
- 40 ca tính toán và các bộ kiểm tra kinh doanh, kế hoạch, bằng chứng, bảng việc, style Khách hàng đều đạt. JavaScript/CSS dùng cache `20261122_dashboard_finance_v1`. Chưa push hoặc phát hành frontend. Việc nhập dữ liệu thật và nghiệm thu tài chính của người quản lý vẫn còn; không đánh dấu toàn M3/M4 hoặc toàn Dashboard hoàn thành.
- Kiểm tra Admin thật bằng `dashboard_workboard_cloud_readonly.cjs` đạt: báo cáo/sổ tài chính, tra cứu nhà cung cấp, số tiền biểu mẫu để trống, nền thẻ khớp computed styles của Khách hàng; năm hồ sơ nguồn hiển thị đúng. Tổng 42 đường dẫn API đọc; không lỗi JavaScript và không có yêu cầu ghi nghiệp vụ. Chỉ cho phép ba RPC tài chính đọc; `admin_finance_post` bị chặn trong kiểm tra trình duyệt này.
- Migration **267** bổ sung khóa hóa đơn chung giữa phân loại hoàn và giảm trừ đổi trả; giới hạn tổng giảm trừ qua các phiếu theo giá trị hóa đơn. Không sửa migrations 263–266 đã áp dụng. `apply_dashboard_finance_267.cjs` kiểm tra bằng hai kết nối: sau ghi phân loại trong giao dịch hoàn tác, kết nối khác không lấy được khóa hóa đơn; mọi dữ liệu thử được hoàn tác trước khi cài hàm. Không cần tạo hoặc sửa khoản hoàn/hóa đơn thật.

## Rà thiết kế bằng ảnh thật — 22/11/2026

- Đối chiếu Khách hàng và cả hai tab Dashboard bằng phiên Admin thật, dùng mã local và dữ liệu Supabase hiện tại. Chụp 1440/1138/390px, cuộn qua toàn bộ các khối ở hai tab trên desktop/điện thoại. Ảnh trước/sau tại `artifacts/dashboard-live-design/before/` và `artifacts/dashboard-live-design/final/` (artifact local được ignore).
- Đổi thuật ngữ hiển thị “Quỹ tiền” thành “Tiền mặt và ngân hàng”, “Khai báo số dư”, “Chuyển tiền”; sửa nhãn và thông điệp trong các biểu mẫu nội tuyến cho đồng nhất. Không đổi cấu trúc hoặc dữ liệu tài chính.
- Gom tìm kiếm, bộ chọn danh sách và nút thao tác vào một thanh công cụ trong thẻ; dùng nút chuẩn Khách hàng. Các mục cần đối soát xuống hàng theo từng liên kết, không nối dấu phân cách rối mắt. Giảm cỡ trạng thái chưa đủ dữ liệu để không gãy nhiều dòng; thêm khoảng đệm trạng thái trống và bỏ khoảng trống từ phân trang rỗng.
- Sửa CSS bỏ qua thuộc tính `hidden` ở tab Vận hành: cảnh báo thiếu quyền KPI không còn hiện khi tất cả số tổng đã tải thành công. Không che lỗi quyền thật. Tên dịch vụ trong biểu đồ xếp hạng được đặt trên thanh để đọc đầy đủ, không bị ép vào cột 78px.
- Header điện thoại có hai hàng cho điều hướng và các nút chung; sửa tại `admin-shell-v7.css`, áp dụng đồng nhất Khách hàng và Dashboard. Desktop giữ cấu trúc cũ; không thêm ghi đè header riêng cho Dashboard. Kiểm tra hình học bảo đảm các nút nằm trong chiều cao header, không đè lên bộ lọc.
- Các bộ kiểm tra style Khách hàng (1440/820/390/320px), sổ tài chính/biểu mẫu, bảng việc và chứng minh kinh doanh đều đạt. Mã/CSS Dashboard dùng cache `20261122_dashboard_visual_v2`, shell dùng `20261122_mobile_header`. Không ghi dữ liệu nghiệp vụ, không đổi schema và chưa push trong lượt sửa giao diện này.

## Chụp và kiểm tra riêng từng khối Dashboard

- Chụp riêng **12 khối Vận hành và 9 khối Kinh doanh** tại 1440px và 390px; khối cao có ảnh nối tiếp. Ảnh cuối tại `artifacts/dashboard-live-design/panels-reviewed/`, danh sách tương ứng trong `operations-cards.txt` và `business-cards.txt`. Bộ chụp dùng đúng vùng thẻ trong viewport thật, không kéo giãn bố cục để lấy ảnh; vẫn có ảnh tổng quan ở 1138px.
- Phân tích kinh doanh: tách nhóm khách và tỷ lệ hủy/vắng thành các hàng nhãn–giá trị trên nền phẳng. Các số vẫn mở đúng danh sách chứng minh. Giữ cảnh báo thiếu ngày hoàn tất; chuyển định nghĩa dài và mốc quan sát vào “Cơ sở đối chiếu”, không đổi công thức hoặc nghĩa chỉ số.
- Tài chính: số dư theo sổ và hai chiều công nợ thành ba mục rõ ràng; bỏ các số 0 cảnh báo không cần thiết. Các nguồn thiếu nằm trong mục mở rộng có số nhóm, trạng thái “Chưa đủ dữ liệu” vẫn hiện. Mở mục này không bị mất trạng thái khi tải lại số liệu. Thanh tìm kiếm có chiều rộng giới hạn, nằm gần bộ chọn danh sách và giữ nhãn cùng hàng.
- Phát hiện qua ảnh điện thoại: các nhóm biểu đồ vẫn giữ hai cột, làm cắt số trong biểu đồ tròn và thu nhỏ biểu đồ so sánh. Đã xếp nhóm thành một cột ở màn hình hẹp. Bảng sản phẩm/dịch vụ cho phép tên xuống dòng và giữ số lượng/giá trị trong chiều rộng khung, không phải cuộn ngang chỉ để thấy số.
- Xác minh bằng ảnh sau sửa và hình học DOM: biểu đồ so sánh đủ rộng, số trong biểu đồ tròn không tràn, ba cột bảng xếp hạng nằm trong khung. Các bảng nghiệp vụ nhiều cột vẫn cuộn riêng. Đối chiếu style với Khách hàng và kiểm thử tại 1440/820/390/320px đạt.
- Bộ kiểm tra Admin thật đạt với 42 đường dẫn API đọc, năm hồ sơ nguồn mở đúng, không lỗi JavaScript và không yêu cầu ghi nghiệp vụ. Các kiểm tra phân tích/chứng minh, sổ tài chính, style và bảng việc đạt. Cache giao diện đổi thành `20261122_dashboard_panels_v3`; không thay đổi CSDL và chưa push.


## Kiểm tra Dashboard ngày 24/11/2026

- Kiểm thử trình duyệt dùng mã giao diện trong workspace với Supabase thật qua tài khoản Admin. Điều hành, bảng việc, Kinh doanh và Sổ tài chính thu gọn đều đạt. Đã mở năm hồ sơ nguồn qua 42 đường dẫn API đọc. Bài kiểm thử chặn ghi nghiệp vụ.
- Kiểm tra mã Kinh doanh đang phục vụ trên Vercel cho thấy bản công khai chưa có Sổ tài chính thu gọn. Kết quả kiểm thử mã trong workspace chưa xác nhận phát hành frontend.
- Điều hành kiểm tra thêm dòng 5.001 trong lượt đọc cuối để xác định dữ liệu bị cắt. Bài kiểm thử trình duyệt xác nhận đúng 5.000 dòng không báo thiếu, 5.001 dòng có báo thiếu ở danh sách và KPI tổng hợp tại máy chủ vẫn giữ tổng đầy đủ. Các truy vấn còn chờ trong hàng đợi được bỏ qua nếu yêu cầu đã lỗi thời.
- Bảng việc dùng phân công từ hồ sơ lịch hẹn và hỗ trợ. Đơn hàng, việc tồn kho và đổi trả vẫn cần nguồn giao việc phù hợp với quy trình. Ngưỡng SLA nghiệp vụ cần người phụ trách xác nhận. Kiểm thử Realtime với nghiệp vụ thật cần môi trường thử nghiệm cho phép ghi dữ liệu.
- Chuyển các biểu đồ còn tổng hợp từ danh sách giới hạn ở trình duyệt sang nguồn tổng hợp tại máy chủ và đo độ trễ trên tập dữ liệu đại diện vẫn là đầu việc mở.
