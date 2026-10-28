# Bổ sung baseline có xác thực — 28/10/2026

## Phương pháp và phạm vi

- Đăng nhập tài khoản QA Admin hiện có bằng cấu hình private, không xuất email/password/token. Auth tạo phiên đăng nhập thông thường; không cấp/reset/khóa hoặc sửa tài khoản.
- Mount nguyên HTML/JS module local trong Chrome cô lập, dùng Supabase SDK và JWT thật để đọc Cloud. Chặn toàn bộ ghi nghiệp vụ; chỉ cho phép các RPC đọc được liệt kê trước. Không chạy toàn app Admin, không đồng nhất kết quả này với full-portal E2E.
- UI Copilot local gọi GET API Production để đọc lịch sử; đây là baseline kết hợp hai phiên bản có ghi rõ. Phép đo handler local riêng bên dưới kiểm tra đúng code local và quan sát các lượt DB/Auth phía server.
- Guest dùng browser context riêng, token mới chưa đăng ký và không tạo hội thoại. Chỉ mở widget/xem lịch sử trống. Không đo transcript của guest/thành viên có hội thoại bằng cách mượn token người dùng khác hoặc tạo fixture Cloud ngoài phạm vi đọc.
- Chỉ lưu route không có query string, status, thời gian và bytes đã giải mã. Không lưu body, tên khách, IDs, nội dung chat, HAR hoặc ảnh màn hình có dữ liệu cá nhân.
- Trần harness: 80 request đo được mỗi page, settle timeout 25 giây, network timeout 15 giây ở mẫu GET; 5 mẫu GET tuần tự/đường. Không stress-test hoặc gọi AI.

## Kết quả UI thực đọc Cloud

| Tác vụ | Request dữ liệu | Response bytes đã giải mã | Diễn giải |
|---|---:|---:|---|
| Live cold | 4 | 9.985 | Một RPC inbox và ba SELECT enrich thành viên |
| Inbox warm | 3 | 1.262 | RPC page được cache, ba SELECT enrich vẫn chạy lại |
| Context ca thành viên cold | 7 | 2.494 | Timeline và sáu nguồn hồ sơ; timeline mẫu này trống, không đại diện ca nhiều tin |
| Context cùng ca warm | 0 | 0 | Không phát sinh request dữ liệu |
| Lịch sử Copilot cold | 2 | 18.194 | Trang phiên 659 byte và chi tiết phiên 17.535 byte; chưa gồm DB/Auth trong Vercel |
| Rules cold | 6 | 11.192 | Một RPC trang FAQ và năm HEAD count, HEAD có 0 body nhưng vẫn có chi phí DB |
| Quay lại Copilot/Rules warm | 0 | 0 | Trong TTL cache ở phép đo |
| Admin idle 12 giây | 0 | 0 | Realtime khỏe; không HTTP polling trong cửa sổ quan sát |
| Guest mở widget chưa có ca | 0 | 0 | Không chủ động tạo conversation hoặc gọi AI |
| Guest xem lịch sử trống | 1 | 30 | Gateway public_list trả danh sách rỗng; chưa đo lookup guest phía API |
| Guest idle 12 giây chưa có ca | 0 | 0 | Không poll khi chưa có active conversation |

11 bước hoàn thành, 23 request dữ liệu UI đều HTTP 200. Số này không gồm thiết lập Auth ban đầu, asset/CSS hay nội bộ server của API. File gốc `authenticated-reads.txt` giữ trạng thái REVIEW vì guard chặn một ảnh Zalo tĩnh (`/assets/images/publics/zalo.webp`); không có request ghi nghiệp vụ hoặc request dữ liệu bị chặn trong các bước đo. Không cần chạy lại Cloud chỉ để đổi nhãn báo cáo.

Admin có 2 channel sau mở Live, 3 sau chọn ca và mở Rules; giữ 3 qua lần đổi tab được đo. Trong 12 giây idle cuối, WebSocket tăng 36 byte gửi và 63 byte nhận ở tầng payload frame; không gồm TLS/header/handshake hoặc toàn bộ egress. Không dùng một lần đổi tab để kết luận không rò channel sau nhiều vòng.

## GET lịch sử: quan sát cả phía server local

Handler `api/admin-chat.js` local thực sự chạy với `verifyStaffCaller` hiện tại; fetch được bọc để đếm/chặn request ngoài danh sách đọc. Mỗi mẫu GET `view=sessions&page=1` gồm:

1. Auth `/auth/v1/user`.
2. RPC `get_staff_login_context`.
3. RPC `admin_copilot_session_page`.

| Mẫu | Số mẫu | Thành công | Payload API/mẫu | Auth/DB local mỗi mẫu | Median | Phân vị 95% mẫu |
|---|---:|---:|---:|---:|---:|---:|
| Handler local → Cloud | 5 tuần tự | 5/5 | 659 byte | 3 lượt, tổng 7.238 byte | 1.201,66 ms | 1.914,11 ms |
| API Production có JWT | 5 tuần tự | 5/5 | 659 byte | Không quan sát từ ngoài Vercel | 1.908,09 ms | 2.830,35 ms |

Đây là nearest-rank trên **n=5**, nên p95 chính là mẫu chậm nhất. Các phân vị chỉ mô tả lượt smoke test này, không phải SLO, năng lực chịu tải hoặc p95 đại diện hệ thống. Handler local chạy khác vị trí mạng với Vercel; không kết luận chênh lệch do code.

Payload chuẩn hóa giống nhau ở cả 10 mẫu; không gọi AI hoặc lưu lịch sử. Nội bộ local 7.238 byte không gồm protocol/TLS và các truy vấn con trong RPC/RLS. Tổng hai chặng không được gọi là egress thanh toán của Supabase.

## Đối chiếu API đang triển khai

Commit deployment theo metadata vẫn là `1defebeacd7f2f606293ae28e1ff8078cf6090d0`. Đối chiếu nguồn Git:

| Tệp | So với local |
|---|---|
| `api/admin-chat.js` | Khác |
| `scripts/api/admin_copilot.js` | Khác |
| `scripts/api/staff_auth.js` | Khác |
| `scripts/api/chat_understanding.js` | Chưa có trong commit deployment |

Metadata deployment + asset fingerprint + GET JWT thành công xác lập provenance và hợp đồng đọc đã quan sát. **Chưa có runtime marker để chứng minh byte-for-byte source API**, và hợp đồng GET giống nhau không chứng minh nhánh POST/AI giống nhau. Không tự thêm marker, push hoặc deploy trong giai đoạn 0. Trước giai đoạn 8 phải đối chiếu lại phiên bản và kiểm tra các nhánh đã thay đổi.

## Ngân sách thiết kế cho nhóm đọc hiện tại

Các mức sau là giới hạn chống tăng tải cho phạm vi đã quan sát, không phải sức chịu tải của Cloud. Phải thêm enforcement/test ở giai đoạn sửa tương ứng; hiện chưa coi ứng dụng đã cưỡng chế tất cả giới hạn.

| Luồng | Trần đầu vào thiết kế cho đợt sửa | Hướng tối ưu |
|---|---|---|
| Live cold | ≤4 lượt dữ liệu, ≤16 KiB body | Giữ 10 dòng, không preload các ca khác |
| Inbox warm trong TTL | Tạm ≤3 lượt/2 KiB với cùng dataset; mục tiêu 0 lượt nếu dữ liệu chưa đổi | Cache kết quả enrich cùng quyền/phiên bản; không bỏ xác thực cần thiết |
| Context ca cold | Không tăng quá 7 lượt so baseline; thêm trần pet/dòng/bytes theo dữ liệu test có lịch sử | Lấy theo nhu cầu và batch; chưa chốt trần bytes ca lớn từ mẫu timeline trống |
| Context/tab warm | 0 request dữ liệu trong TTL nếu không có invalidation hợp lệ | Giữ single-flight, tránh re-init listener/channel |
| Trang phiên Copilot | 1 HTTP GET UI; 3 lượt Auth/DB handler và body mục tiêu ≤32 KiB | Payload/nguồn vượt trần phải phân trang; giữ quyền staff, không cache auth tùy tiện |
| Rules cold | Không tăng quá 6 lượt so baseline; 10 mục trang, body mục tiêu ≤32 KiB | Tối ưu count theo nhu cầu/TTL; không tải hết các nhóm |
| Guest chưa có ca | Mở/idle 0 request dữ liệu; lịch sử tối đa 1 API/lượt bấm | Không tạo session/ca phía server chỉ vì mở widget |

Trần bytes 16/32 KiB là khoảng dự phòng thiết kế cho trang giới hạn, không điều chỉnh theo dữ liệu tăng vô hạn. Khi dữ liệu thay đổi vượt trần cần thiết kế gọn hơn, không tự tăng budget. Nhóm công cụ mới tiếp tục tuân theo mục 17 của checklist.

**Chưa chốt giới hạn đồng thời Production:** chưa có số đo headroom/connection pool và workload đại diện. Giữ phép đo hiện tại tuần tự, không chạy tải đa phiên trên Production. Trên test, lượt thử đầu đề xuất tối đa 2 tác vụ đọc đồng thời, mỗi tác vụ tối đa 2 lượt nguồn đang chạy, rồi đo trước khi tăng; đây là phạm vi thử, không phải xác nhận Cloud phục vụ được mức đó hoặc ứng dụng đã có limiter toàn cục.

## Theo dõi sau phép đo này

- **Đã bổ sung ở lượt tiếp theo:** transcript guest/thành viên trên môi trường test riêng và workload local 20 mẫu/2 tác vụ; xem [kết quả và ngân sách](local-baseline-and-budget.md). Không dùng token người dùng thật.
- Workload/headroom/SLO Production đại diện vẫn cần kiểm chứng trước phát hành ở giai đoạn 7; không suy ra từ các microbenchmark này.
- Phạm vi Admin đã được người dùng xác nhận: tất cả nhóm nghiệp vụ. Bộ 56 tình huống là mốc đầu, tiếp tục bổ sung cách hỏi thực tế; chưa có thống kê tần suất nhưng không lấy đó làm lý do bỏ nhóm hoặc chờ chọn ưu tiên.
- Mỗi năng lực mới chỉ được bắt đầu khi nguồn/quyền/nhóm test và ngân sách riêng của nó đã đủ xác định. Không bỏ các phần thiếu khỏi báo cáo để đánh dấu toàn bộ giai đoạn đạt.
