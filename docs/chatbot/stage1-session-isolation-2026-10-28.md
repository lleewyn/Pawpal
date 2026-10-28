# Giai đoạn 1 — Cô lập phiên chat khách và thử lại khi lỗi

Ngày thực hiện: 28/10/2026. Trạng thái: **Đã sửa và kiểm thử offline nhóm đầu; chưa hoàn tất giai đoạn 1, chưa deploy.**

**Cập nhật tiếp theo:** Đã bổ sung lưu tạm một yêu cầu chưa xác nhận qua reload, gồm nháp và ID, trong sessionStorage tách danh tính/TTL. Xem [báo cáo reload/retry](stage1-reload-retry-2026-10-28.md). Các mô tả “chỉ trong bộ nhớ/chưa qua reload” phía dưới là giới hạn của bản sửa đầu, được thay trong đúng phạm vi bởi cập nhật này.

## Lỗi đã tái hiện

Trước sửa, test `chat_widget_session_races.cjs` thất bại ở trường hợp A đang tải hội thoại, đổi sang B rồi phản hồi của A đến sau. Widget chỉ so sánh ID hội thoại nên nếu ID được khôi phục giống nhau, phản hồi cũ vẫn được render. API kiểm tra ownership ở thời điểm request không ngăn được phản hồi đã hợp lệ cho A xuất hiện trên UI của B sau đổi tài khoản.

Các đường liên quan cũng có nguy cơ: lịch sử cũ xuất hiện sau đổi tài khoản; mở ca chưa xong tiếp tục gửi dưới phiên mới; acknowledgement cũ xóa nháp mới hoặc unlock nút gửi của request mới. Fetch chat chưa có timeout nên lỗi treo có thể giữ `busy` và khóa thao tác.

## Thay đổi

Nguồn: `components/fab/fab.js`.

- Mỗi thay đổi danh tính tăng phiên bản phiên cục bộ; API kiểm tra phiên trước fetch, sau parse response và trong xử lý lỗi. Ngoài kiểm phiên bản, identity trả từ `getSession` phải khớp identity widget.
- Hủy các request đang chờ bằng AbortController khi đổi tài khoản. Request/response cũ bị bỏ qua, không ghi lỗi hoặc dữ liệu lên UI mới.
- Xóa nháp, lịch sử đang hiển thị và trạng thái pending của danh tính trước khi chuyển sang danh tính mới. Không chuyển nháp của A cho B. Tham chiếu hội thoại vẫn tách theo identity như trước.
- Sau `ensure` và `public_send/public_mode`, kiểm phiên bản trước bước tiếp; finally cũ không unlock request mới.
- Fetch có timeout 30 giây bao gồm parse body; timeout/lỗi mạng trong cùng phiên giữ nháp và requestId. Chỉ thử lại khi người dùng bấm gửi, không tự retry.
- Tải tin cũ còn kiểm tra ca đang chọn để tránh ghép trang của ca trước vào ca mới. Lỗi stale không ghi đè trạng thái hiện tại. Unload dọn timer và abort request đang chờ.

Abort trình duyệt không bảo đảm server hủy tác vụ đang chạy. Server vẫn cần kiểm ownership, transaction, revision và idempotency; lần thử lại dùng requestId cũ để đối soát kết quả. Không tuyên bố timeout UI đã cưỡng chế timeout DB.

## Kiểm thử

`node scripts/test/chat_widget_session_races.cjs`: Chrome chạy HTML/JS widget thật; fetch/Auth response điều khiển offline để tạo đúng thứ tự race, không Cloud/DB/AI.

| Ca | Kết quả |
|---|---|
| A response đến sau B, cùng ID hội thoại được khôi phục | Không render nội dung A — PASS |
| History A đến sau đổi B | Không render lịch sử A — PASS |
| Đổi A→B lúc public_open chờ | Không tiếp tục public_send dưới B — PASS |
| Send A thành công muộn, B nhập cùng nội dung | Không xóa nháp B — PASS |
| Timeout request gửi | Unlock, giữ nháp, lần thử lại cùng requestId — PASS |
| Finally A hoàn tất khi B đang gửi | Không unlock hoặc nhân request B — PASS |
| Đổi phiên lúc mở ca để handover | Không tiếp tục public_mode cho phiên mới — PASS |
| Enter lặp và mất mạng | Một request lúc pending; thử lại giữ requestId — PASS |

Timeout test rút đúng timer 30 giây xuống 25 ms trong harness, không đổi timeout ứng dụng. Các test response cũ cố ý vẫn resolve sau abort để chứng minh guard phiên hoạt động ngay cả khi transport không dừng response.

Hồi quy đã đạt: 9 test Node ownership/SLA; 9 case gateway handoff; understanding/context/RPC signal; clinical terms/public audience; 40 case Admin planner và hợp đồng API. Kiểm tra cú pháp và diff whitespace đạt. Không cộng các nhóm khác đơn vị thành một tỷ lệ nghiệm thu tổng.

## Chi phí và giới hạn

- Không thêm endpoint, query, polling, subscription hoặc vòng retry tự động. Guard dùng trạng thái trong bộ nhớ; timeout/abort chỉ tác động request vốn đã phát sinh.
- Hủy request phía client và chặn bước tiếp giúp tránh request thừa khi đổi phiên, nhưng chưa có số đo egress Production sau sửa.
- Không lưu nội dung nháp hoặc hội thoại vào localStorage; đổi danh tính xóa nháp để tránh lộ chéo. RequestId được giữ trong bộ nhớ cho retry cùng trang, chưa giữ qua reload.
- Chưa xử lý toàn bộ L07 về reload giữa lúc gửi hoặc request public_open mất acknowledgement. Chưa hoàn tất ma trận quyền DB/raw/history, hai staff cạnh tranh, ticket/điểm retry hoặc chuỗi gửi/chuyển/đóng/CSAT có Auth thật hai UI.
- Chưa thêm limiter dùng chung, timeout DB hoặc thay polling 10 giây; các mục này vẫn thuộc kế hoạch tài nguyên các đợt tiếp theo.

## Khôi phục và bước tiếp

Thay đổi chỉ ở widget và test; không có migration. Có thể review/đảo riêng diff `components/fab/fab.js` của đợt này, không reset workspace hoặc khôi phục ba tài liệu người dùng đang xóa. Chưa commit/push/deploy.

Tiếp tục giai đoạn 1 bằng kiểm thử các quyền/thao tác server với fixture local riêng và hoàn thiện request chưa xác nhận qua reload. Không đánh dấu G1.1–G1.4 hoàn tất chỉ từ 8 case offline này.
