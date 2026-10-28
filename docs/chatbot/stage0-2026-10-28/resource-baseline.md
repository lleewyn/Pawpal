# Baseline tài nguyên và ngân sách — 28/10/2026

**Cập nhật mới nhất:** Có [baseline UI/API có xác thực](authenticated-baseline.md) và [transcript/workload local cùng ngân sách thiết kế](local-baseline-and-budget.md). Đã đo guest/member có chủ sở hữu trên test và 20 mẫu/2 tác vụ đồng thời. Các phần “chưa đo” bên dưới mô tả baseline ban đầu; workload/headroom Production đại diện vẫn chưa được nghiệm thu, giữ là điều kiện trước phát hành.

## Số đo Cloud thật, một mẫu mỗi truy vấn

Chạy trong transaction `REPEATABLE READ READ ONLY`, timeout mỗi statement 5 giây, lock timeout 1 giây; mô phỏng claims của ADMIN active hiện hữu và `SET LOCAL ROLE authenticated`. Không dùng service role để bỏ quyền facts. Đây là kiểm tra SQL, không phải đăng nhập bằng JWT/HTTP.

| Nguồn | Tổng | Dòng | Bytes nội dung nguồn trước nén | Thời gian vòng SQL |
|---|---:|---:|---:|---:|
| SKU dưới ngưỡng | 0 | 0 | 266 | 431,54 ms |
| Spa chờ phục vụ ngày 28/10/2026 | 0 | 0 | 335 | 335,78 ms |
| Khiếu nại chưa kết thúc | 21 | 20 | 4.250 | 368,70 ms |

Cả ba khớp truy vấn oracle độc lập trong cùng snapshot. Hai nguồn trống chưa chứng minh truy vấn hiệu quả khi nhiều dữ liệu. Bytes không gồm overhead PostgreSQL/TLS/HTTP/Realtime/Auth; thời gian gồm network round-trip, không phải execution time SQL thuần. Không tính p50/p95 từ ba mẫu thuộc ba tác vụ khác nhau.

## Chi phí nhìn từ mã, chưa phải số đo trình duyệt thật

| Luồng | Chi phí có thể phát sinh | Giới hạn/phát hiện |
|---|---|---|
| Inbox cold có thành viên | 1 inbox RPC + tối đa 3 SELECT batch enrich | 10 hội thoại/trang, cache trang 30 giây; enrich vẫn cần kiểm tra khi quay trang |
| Chọn ca thành viên chưa tải context | 1 messages RPC + 6 nguồn hồ sơ | Pets chưa limit; đơn/lịch gần nhất 1, ticket 5, số dư/hạng maybeSingle |
| Câu mẫu lần đầu | SELECT từng trang 500 đến hết | Không có trần tổng số mục/bytes; có cache/dedup |
| Rules cold | Một trang đang xem + các count bảng chưa có cache | Count exact không trả dòng vẫn có chi phí DB; không gọi là miễn phí |
| Admin hỏi facts mới đơn giản | Auth getUser + login context + prior request + 1 facts + lưu trao đổi | Khoảng 5 lượt Auth/DB ở nhánh không replay, không context; một facts RPC không phải toàn HTTP chỉ có một DB call |
| Admin hỏi hai ngày | Hai facts RPC; phần auth/history vẫn có | Hiện có Promise.all; chưa có trần tổng công cụ toàn cục |
| Khách đọc có thay đổi | Thành viên: getUser + customer + conversation + messages + feedback | Khoảng 5 lượt Auth/DB; guest khoảng 4; mỗi lần lấy tối đa 30 tin |
| Khách đọc revision không đổi | Thành viên: getUser + customer + conversation; guest: guest_session + conversation | Khoảng 3 hoặc 2 lượt dù response nhỏ |
| Khách hỏi FAQ | Moderation 2 nguồn + FAQ tối đa 500 + 8 tin context + key pool + lưu transaction, ngoài auth/owner/prior | Chưa có trần bytes FAQ; không gọi AI khi nhánh chuyển nhân viên xác định |
| Cập nhật nền khách | Poll 10 giây khi hiện/mở/có ca, không busy | Tối đa lý thuyết khoảng 6 poll/phút/phiên: revision không đổi vẫn khoảng 18 lượt Auth/DB/phút thành viên hoặc 12 guest; chưa tính heartbeat và tác vụ khác, chưa phải tải quan sát |
| Cập nhật Admin | Realtime + fallback 45 giây khi kênh lỗi và active | Cần đo burst/debounce và cleanup trên phiên thật |

Các con số suy từ đường code là dự toán có điều kiện, không gồm nội bộ hàm SQL/RLS/subquery; cache, dữ liệu rỗng và nhánh replay làm kết quả khác nhau. Auth requests phải ghi riêng với truy vấn PostgreSQL. Không dùng chúng làm bằng chứng đã đạt ngân sách.

## Ngân sách tạm để thiết kế, chưa phê chuẩn năng lực hệ thống

- Giữ trần đề xuất mục 17 của checklist: một nguồn tối đa 20 dòng/32 KiB; kết hợp tối đa 3 lượt nguồn/64 KiB và 2 lượt đồng thời mỗi tác vụ; FAQ tối đa 5 mục/8.000 ký tự; UI 10 dòng và timeline 30 tin.
- Trước thêm mỗi công cụ phải phân tích plan/index trên test, đo tổng Auth/DB, rows/bytes, thời gian, cold/warm và lỗi. Timeout SQL cụ thể cần chốt theo công cụ; timeout 5 giây của harness không tự áp sang ứng dụng.
- Ngân sách tổng theo giây/phút, đồng thời toàn ứng dụng, pool connections, tải sẵn có, p50/p95 và headroom **chưa chốt** vì chưa có phép đo đại diện.
- Khi chưa chốt, không mở thêm phân tích nặng hoặc công bố chịu được nhiều người dùng. Tiếp tục các phép đo nhỏ trên test; không stress Production hay đọc Logs.

## Phép đo tiếp theo để đóng baseline

| Kịch bản | Bằng chứng cần bổ sung |
|---|---|
| Mở Live cold/warm, đổi trang, đổi ca, chuyển ba tab | Auth/DB HTTP count, bytes, cache, handler/channel/timer; fixture có thành viên và guest |
| Khách gửi/nhận/chuyển/đóng và idle | Hai danh tính thật; thay đổi và không thay đổi; revision, Realtime/poll và bytes toàn chuỗi |
| Admin hỏi đơn giản/liên nguồn/lỗi | API payload và DB calls không lộ PII, nguồn/quyền, cancel/retry, token AI nếu có |
| Rules mở/sửa/xung đột | Count và page request cold/warm; không tải hết rules |
| Tải nhỏ trên test | Cùng tác vụ lặp đủ mẫu cho phân vị; số phiên được chốt theo tài nguyên test; không suy từ một request |

Không bổ sung telemetry bằng cách tạo query nặng để giám sát chính query. Chỉ số HTTP/DB/AI/Realtime đo riêng và ghi giới hạn phần không quan sát được.
