# Hoàn tất baseline local và ngân sách thiết kế giai đoạn 0

Ngày 28/10/2026. Phạm vi: chuẩn bị sửa nền tảng hội thoại/quyền/tra cứu hiện có ở giai đoạn 1. Tất cả A01–A19 vẫn là phạm vi đích; năng lực mới phải có thiết kế nguồn và kiểm chứng riêng trước khi triển khai.

## Môi trường kiểm thử và tính cô lập

Docker Desktop ban đầu chưa chạy. Sau khởi động, Docker tự phục hồi các container có restart policy; không thay cấu hình hoặc dừng container không thuộc tác vụ. Database test có sẵn `pawpal_customers_3daa55e18acd` do `supabase_admin` sở hữu được dùng làm nguồn bản sao mới, không ghi vào nguồn này.

Đã tạo DB `pawpal_chatbot_g0_cfdfdf483da6` có ownership marker riêng; áp 9 migration vào bản sao: 089, 099, 100, 101, 102, 109, 124, 125, 126. Hai container Auth/REST riêng dùng JWT secret mới, bind `127.0.0.1`, không dùng key hoặc endpoint Cloud. API local chạy handler thật `api/admin-chat.js`, SDK thật, GoTrue và PostgREST thật; widget dùng nguyên JS hiện có.

Đây là bản phục hồi cũ được cập nhật các dependency đã liệt kê, không tuyên bố là bản sao đồng nhất mọi schema/dữ liệu Production. Các fixture được seed trực tiếp trong DB test cho mục đích đọc; không nghiệm thu đăng ký khách hoặc ghi nghiệp vụ bằng cách seed này.

Các lỗi setup đã xử lý: quyền copy DB thuộc owner local `supabase_admin`; bản phục hồi không có RPC `complete_customer_auth` nên seed customer/profile trực tiếp; bảng tin nhắn yêu cầu trường toxic/sentiment nên fixture điền rõ hai giá trị. Không sửa schema nguồn hoặc ứng dụng để bỏ các kiểm tra đó.

## Transcript có chủ sở hữu

Mỗi hội thoại của lần chạy đạt có 35 tin tổng hợp và metadata/nguyên văn đánh dấu riêng; có hai danh tính thành viên và hai token guest để thử chặn đọc chéo. Các danh tính tạo bằng Auth local, xác thực bằng JWT thật.

| Tác vụ | Guest | Thành viên |
|---|---:|---:|
| Đọc đầu: tin trả về | 30 | 30 |
| Payload API | 4.830 byte | 4.829 byte |
| Lượt Auth/DB nội bộ | 4 | 5 |
| Bytes Auth/DB nội bộ | 6.088 | 7.644 |
| Revision không đổi: payload API | 101 byte | 100 byte |
| Revision không đổi: lượt Auth/DB | 2 | 3 |
| Revision không đổi: bytes Auth/DB | 243 | 1.799 |
| Tải trang cũ: tin trả về | 5 | 5 |
| Đọc bằng chủ thể khác | HTTP 403 | HTTP 403 |

Không có `raw_content`, `internal_note` hoặc metadata thử riêng trong projection công khai. Hai browser context tải widget thật với danh tính riêng: mỗi bên đọc một lần ban đầu và một lần polling revision trong cửa sổ 11 giây; lần lượt 4→2 và 5→3 lượt Auth/DB. Mỗi UI hiển thị 30 tin. Đây là bằng chứng read/pagination/idle; chưa phải nghiệm thu gửi/chuyển/đóng hoặc CSAT qua UI.

## Đo đồng thời có giới hạn

20 lượt `public_read` thành viên với revision không đổi, thực thi theo 10 cặp, tối đa **2 tác vụ đồng thời**. Tất cả 200 và `notModified=true`:

| Chỉ số | Kết quả |
|---|---:|
| Số mẫu | 20 |
| p50 | 375,34 ms |
| p95 nearest-rank | 435,13 ms |
| Chậm nhất | 435,57 ms |
| Tổng body API | 2.000 byte |
| Tổng lượt Auth/DB nội bộ | 60 |

Không có AI call hoặc ghi nghiệp vụ trong giai đoạn measurement. Việc tạo fixture trước đó chỉ tác động bản local riêng. Đây là smoke workload ngắn trên máy local có các dịch vụ khác cùng chạy, không phải chứng nhận chịu tải/SLO Cloud.

## Snapshot kết nối Cloud — một lần, không thử tải

Đọc aggregate metadata một lần trong transaction chỉ đọc, timeout 3 giây; không đọc query text, danh tính người dùng hoặc Logs:

- `max_connections=60`, trong đó 3 dành riêng superuser; `reserved_connections=0`.
- 17 client backend tại thời điểm chụp; 1 active bao gồm truy vấn kiểm kê; không có trạng thái client bị ẩn do quyền stats.
- Không suy 43 connection còn lại là 43 người dùng/tác vụ có thể nhận thêm. Đây không phải peak, không đo CPU/IO hoặc headroom pooler/REST, không cho phép tăng tải theo chênh lệch số học này.

## Ngân sách thiết kế chốt để bắt đầu sửa

Đây là giới hạn mục tiêu cho thay đổi tiếp theo, **chưa phải limiter đã có trong ứng dụng**. Trước mở rộng/phát hành phải có enforcement và test. Không tăng ngân sách chỉ vì có nhiều nhóm câu hỏi.

1. **Tác vụ chatbot đọc nặng:** mức khởi điểm tối đa 2 tác vụ đang thực thi ở cấp hệ thống, mỗi danh tính tối đa 1 tác vụ nặng. Tác vụ mới khi đầy phải được từ chối ngắn gọn hoặc xếp hàng có giới hạn, không treo hàng đợi vô hạn. Đây là lựa chọn bảo thủ để bắt đầu, không suy từ phép đo local thành năng lực Production.
2. **Nguồn của một câu hỏi:** mặc định 1 lượt nguồn; kết hợp tối đa 3 lượt nguồn, tối đa 2 lượt nguồn đang chạy/tác vụ. Backend cần giới hạn dùng chung tối đa 4 fetch Auth/DB đang chạy cho nhóm chatbot được đưa qua cơ chế này; tính Auth vào tổng, không bỏ kiểm tra quyền để giảm số lượt.
3. **Đường đọc trực tiếp từ trình duyệt:** hiện chưa được limiter backend bao phủ. Giai đoạn sửa phải tính và kiểm soát đường này bằng cơ chế phù hợp trước khi tuyên bố có giới hạn toàn hệ thống; cache/debounce phía client không thay admission dùng chung.
4. **Dữ liệu:** giữ 10 dòng danh sách, 30 tin mỗi trang; facts một nguồn ≤20 dòng/32 KiB, nhiều nguồn ≤64 KiB; FAQ ≤5 mục/8.000 ký tự. Transcript cần thêm trần bytes: khi tin dài phải giảm số tin/trang hoặc tải chi tiết theo thao tác, không cắt mất nội dung âm thầm. Mẫu 35 tin ngắn không chứng minh trang 30 tin luôn nhỏ.
5. **Thời gian/phạm vi:** query nguồn mới khởi điểm timeout DB 5 giây và lock 1 giây, tùy công cụ review lại; truy vấn ngày trực tiếp tối đa 31 ngày. Timeout phải dừng tác vụ DB thật, không chỉ ngừng chờ ở UI.
6. **Retry và nền:** tối đa một retry đọc đủ điều kiện với backoff/jitter; không retry permission/validation/conflict. Realtime khỏe không polling song song; fallback có điều kiện theo mục 17. Không thêm vòng quét bảng cho từng năng lực.
7. **Chống hồi quy:** nhóm đang có giữ trần cold/warm đã ghi ở `authenticated-baseline.md`; số request, bytes và số channel không được tăng nếu không có review cụ thể. Inbox warm 3 request enrich là baseline cần giảm, không phải mục tiêu tối ưu cuối.

Việc triển khai limiter dùng chung, xử lý đường direct DB và đo headroom/SLO đủ đại diện là điều kiện kiểm chứng ở giai đoạn 2/7/8 trước phát hành, không được đánh dấu DB16 đã đạt trong giai đoạn 0. Nếu workload thực tế không đáp ứng ngân sách thì giảm phạm vi/tối ưu trước, không tự tăng tải Cloud.

## Dọn fixture và kết luận Gate 0

Đã xác minh marker DB và label/ID của cả hai container trước dọn. Sau đó xóa đúng hai container, drop đúng DB test và kiểm tra DB không còn; nguồn `pawpal_customers_3daa55e18acd` vẫn tồn tại. Ba file credential tạm của môi trường test đã xóa, thư mục tạm được bỏ bằng thao tác không đệ quy khi trống. Không dừng Docker hoặc container khác.

**Gate 0 đạt cho việc bắt đầu giai đoạn 1 ở nhóm nền tảng đã khảo sát:** có provenance môi trường/route, metadata quyền, danh mục tất cả nhóm, bộ 56 câu hỏi đầu, baseline Cloud/UI và transcript local, workload local có giới hạn, ngân sách thiết kế và snapshot bền vững. Không có năng lực mới được coi là đã triển khai hoặc nghiệm thu chỉ từ kết luận này.

Các giới hạn chuyển tiếp phải giữ nguyên: chưa có runtime source marker API; chưa đo tải/SLO/headroom Cloud đại diện; chưa có limiter dùng chung cưỡng chế mọi đường đọc; chưa chạy toàn bộ ma trận quyền/ghi/CSAT với tài khoản thật hai phía. Đây là đầu việc của giai đoạn liên quan và điều kiện chặn phát hành, không phải các kiểm tra đã đạt.
