# Điểm và voucher — tiến độ 26/10/2026

## Phân trang server — đã áp dụng Cloud

Cập nhật sau xác nhận cụ thể “áp dụng lên cloud”: migration104 đã commit trên Cloud; metadata xác minh overload `(integer,integer,integer)` và zero-argument RPC cũ cùng tồn tại. Không sửa/xóa ledger, customer_voucher hoặc voucher. UI local bật mặc định (`PAWPAL_LOYALTY_PAGING_ENABLED=false` mới tắt để rollback). Chrome phân trang, 7 test Node và loyalty service PASS sau bật. Frontend mới chưa push/deploy; không tuyên bố website đang deploy đã dùng phân trang mới hoặc E2E/Auth/Realtime đã đạt.

Migration104 thêm overload `own_loyalty_snapshot(integer,integer,integer)` cho ba trang độc lập: history tối đa10, wallet/catalog tối đa6; count và balance tính toàn owner, page clamp khi dữ liệu giảm, validate tham số. Giữ nguyên RPC cũ và thuật toán đổi điểm. `sync_loyalty_page_cloud_rollback.cjs --cloud`: **14 kiểm tra PASS/113 SQL statements**, DDL/fixture đều rollback. Nhánh 12 dòng ledger xác minh trang10/2 không trùng, tổng balance111 từ toàn ledger, chặn page0; các kiểm tra đổi điểm/quyền/phiên bản trước vẫn PASS. [Kết quả](loyalty-page-cloud-rollback.txt).

`user_loyalty_page_ui.cjs`: Chrome offline PASS với HTML/module thật: history10/2, wallet/catalog6/1, page args độc lập và balance giữ999 ở cả hai trang. Không gọi Cloud. UI đã bật mặc định sau apply; đặt `PAWPAL_LOYALTY_PAGING_ENABLED=false` mới dùng RPC cũ/client pagination để rollback. Sửa cả aria-label tiếng Việt lỗi mã hóa của nút phân trang.

Lịch sử duyệt: auto-review từ chối apply104 lần đầu vì chỉ nhận xác nhận cho103; sau khi người dùng đồng ý cụ thể, lệnh đã được duyệt và áp dụng. Trạng thái hiện tại theo đoạn cập nhật ở đầu mục này. Không dùng test rollback/mock để thay nghiệm thu website đã deploy.

Đợt này gồm sửa mã local, test offline và RPC/RLS Cloud với fixture luôn hoàn tác; không Logs/stress-test, chưa push/deploy hoặc nghiệm thu E2E.

## Thay đổi

- `loyalty.js` trước đây nghe ba bảng `paw_point_transaction`, `customer_voucher`, `customer_membership` không có bộ lọc khách hàng và gọi tải ngay mỗi sự kiện. Đã thêm `customer_id=eq.<owner>` cho từng bảng.
- Bộ điều phối `loyalty-sync.mjs` dùng chung một snapshot request đang chạy, gom sự kiện 200 ms, ghi nhận thay đổi khi tab ẩn và tải khi hiện lại. Sự kiện tới trong lúc đọc tạo một lượt bù; không polling.
- Dispose dọn timer, channel và listener. Thay phiên auth/storage đóng dialog và xóa nội dung điểm/ví/lịch sử cũ. Kết quả snapshot khác owner hoặc trả về sau khi dispose/đổi owner không được render.
- Reconnect sau lần subscribe đầu yêu cầu cập nhật bù. Kiểm tra owner trước đổi voucher và sau xác nhận để kết quả phiên cũ không cập nhật giao diện mới. Helper RPC kiểm tra owner không đổi trong lúc xác thực.

## Bằng chứng offline

- `node --test scripts/test/loyalty_sync.test.mjs scripts/test/test_loyalty_summary.mjs`: **7/7 PASS**, trong đó bốn test mới kiểm tra bộ điều phối: 10 đọc song song dùng chung một lượt, 10 sự kiện gom một lượt; tab ẩn/đọc bù; snapshot sai owner/lỗi; dispose/đổi owner khi request đang chạy. Ba test cũ kiểm tra tiến trình chi tiêu và quy tắc loại đơn chưa đủ điều kiện.
- `node scripts/test/test_customer_loyalty.cjs`: PASS điểm quy đổi chỉ lấy cấu hình hợp lệ; request thiếu dữ liệu bị từ chối.
- Kiểm tra cú pháp module và `git diff --check` đạt. Test bộ điều phối dùng hàm load và đồng hồ giả, không phải browser hay WebSocket thật.

## Chưa hoàn tất

Đã tiếp tục kiểm tra áp voucher/hủy COD ở lớp RPC: [kết quả 10 kiểm tra](voucher-order.md). Phần checkout nêu dưới đây đã có bằng chứng SQL riêng, còn nghiệm thu UI/HTTP và hoàn tiền.

Snapshot vẫn trả toàn bộ history/wallet/catalog: phân trang giao diện chưa giới hạn payload server. Chưa kiểm tra apply voucher tại checkout, đường Admin sửa điều kiện voucher, hủy/hoàn tiền hoặc giao dịch đồng thời. Chưa kiểm tra trọn luồng UI/Auth/HTTP/commit/reload hay browser modal đổi voucher sau sửa. Cần xác minh publication/RLS và delivery thật của ba kênh bảng; không coi đọc source SQL là bằng chứng Cloud.

Các case SYNC-07 toàn chuỗi giữ trống. Không chạy script Cloud cũ tự tạo tài khoản/ghi giao dịch đã commit.

## RPC/RLS Cloud — 26/10/2026

**13 kiểm tra PASS, 98 SQL statements** trong lượt thành công; [kết quả máy đọc](loyalty-cloud-rollback.txt). Một voucher, một cộng 100 điểm qua RPC Admin và một đổi voucher 40 điểm; hai customer và một staff tổng hợp. Mọi fixture nằm trong transaction, đã rollback và kiểm tra không còn customer/auth/staff/voucher/wallet/ledger test. Không thu tiền, không tạo đơn thật, không đổi schema/RPC/policy.

| Kiểm tra | Kết quả |
|---|---|
| Admin cộng 100 điểm và retry cùng request | Một dòng ledger; User snapshot thấy 100 điểm |
| User gọi RPC điều chỉnh Admin hoặc chèn trực tiếp ledger | Bị từ chối 42501 |
| Đổi 40 điểm và retry cùng request | Một wallet item, một debit -40, số dư và tổng history đều 60; Admin đọc đúng liên kết wallet |
| Gửi lại request với nội dung khác | PT409, không trừ thêm |
| Voucher đổi sang 80 điểm | Version cũ PT409; version mới nhưng chỉ có 60 điểm bị chặn 23514 |
| Voucher vô hiệu/hết hạn | Không đổi được; voucher vô hiệu không xuất hiện trong catalog |
| B đọc snapshot hoặc replay request A | Ví/history B rỗng, số dư 0; replay bị chặn |
| Guest gọi snapshot/đổi voucher | Bị từ chối 42501 |
| Sau các lượt bị từ chối | A vẫn 60 điểm, hai dòng ledger, một wallet item |

Có một lượt trước gặp 42501 vì harness thử sửa trực tiếp bảng voucher bằng role Admin; transaction đã rollback. Harness được sửa để bước **chuẩn bị điều kiện fixture** dùng kết nối kiểm thử, không mở quyền production. Vì vậy phần đổi điều kiện xác minh server từ chối cấu hình cũ, chưa chứng minh UI/RPC sửa voucher của Admin. Các lần chạy đều luôn rollback, timeout statement 8 giây/lock 3 giây. Không Logs/stress-test; SQL statement count không phải số request portal, chưa đo egress.

Tái hiện khi cần: `node scripts/test/sync_loyalty_cloud_rollback.cjs --cloud`; không có cờ thì không kết nối. Test role/JWT claims mô phỏng, chưa xác minh Auth/HTTP/WebSocket thực, commit/reload hoặc đồng thời nhiều transaction.
