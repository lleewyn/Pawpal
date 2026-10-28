# Giai đoạn 1 — Ticket và điều chỉnh điểm theo hội thoại

Ngày 28/10/2026. **8 nhóm SQL local đạt; giai đoạn 1 chưa hoàn tất.** Không sửa RPC/schema hoặc triển khai Cloud trong lượt này.

## Phương pháp

Clone database phục hồi local bằng công cụ có ownership marker, áp 9 migration dependency chỉ trong clone, tạo hai khách/đơn/staff và các policy thử. Harness `chat_stage1_local_points_tickets.cjs` chạy transaction COMMIT thật, SQL claims/roles, tối đa 2 kết nối độc lập; mỗi statement timeout 5 giây và lock timeout 3 giây. Không Auth JWT/HTTP hoặc UI ở bài này.

## Kết quả

| Nhóm | Kiểm chứng |
|---|---|
| 1 | Vượt max_points, policy tắt/cần duyệt, điểm 0, revision cũ và staff không phụ trách bị chặn; snapshot ledger hai khách không đổi |
| 2 | Hai request cộng điểm cùng ID chạy đồng thời: trả cùng ID ledger; khách A tăng đúng 5, khách B giữ 0; chỉ một dòng ledger |
| 3 | Đổi số điểm hoặc khách/ca với cùng requestId bị PT409; số dư giữ nguyên |
| 4 | Ticket dùng đơn khách khác bị 22023; revision cũ bị PT409; staff không phụ trách bị 42501 |
| 5 | Hai request tạo ticket cùng ID chạy đồng thời: một ticket, một message và một audit nghiệp vụ; customer/order/source conversation đúng |
| 6 | Đổi subject với ID ticket đã dùng bị PT409; không ghi đè ticket |
| 7 | Staff được phân ca, có quyền đọc/ghi chat nhưng thiếu quyền ledger/ticket không ghi được cả hai |
| 8 | Ca đã đóng không cộng điểm hoặc tạo ticket mới; ledger hai khách không thay đổi |

Kết quả máy đọc tại `points-tickets-results.txt`. Số transaction trong evidence không phải tổng SQL nội bộ hoặc request hai portal. Không xuất nội dung/UUID fixture vào báo cáo kết quả.

## Audit và lần chạy chưa đạt

Lượt đầu dừng ở assertion tổng audit bằng 1. Kiểm tra trigger local xác nhận `audit_money()` tạo audit INSERT cho ledger, ngoài audit CREATE do nghiệp vụ điều chỉnh điểm ghi. Đây là hai loại hợp lệ, không phải cộng trùng. Đã sửa test đòi đúng một CREATE và một INSERT cho cùng ledger; chạy lại đủ 8 nhóm đạt, không sửa backend hoặc tắt trigger.

## Chi phí và dọn

Toàn bộ kiểm thử chạy trên localhost, không gọi Cloud/AI/Logs. Không thêm query/polling/subscription của ứng dụng; chỉ bổ sung harness và evidence.

Sau kiểm thử đã xác minh marker database, label/ID hai container rồi dọn đúng các đối tượng đó; database test không còn, database nguồn vẫn còn. Credential tạm riêng đã xóa. Fixture của cả lượt đầu và lượt cuối đều được dọn cùng DB. `local-environment.txt` lưu biên nhận.

## Giới hạn giữ nguyên

- Đây là kiểm tra grants/body RPC bằng SQL role/claims, chưa thay E2E Auth thật/API/hai UI hoặc kiểm tra modal đổi ca khi đang mở.
- Mới thử khiếu nại nhóm order; appointment/service, guest không có customer và các tổ hợp liên kết khác cần kiểm riêng.
- Chặn max_points được xác minh theo **mỗi yêu cầu** của policy hiện tại. Chưa chứng minh hạn mức cộng dồn toàn ca, nhiều requestId khác nhau hoặc hạn mức phân cấp vai trò trong tài liệu cũ. Không suy những chính sách này đã được enforce từ bài test 5 điểm.
- Chưa kiểm trường hợp policy thay đổi giữa request và retry hoặc đối soát balance view qua UI; mới kiểm ledger bằng SQL aggregate của fixture.
- Chưa push/deploy. Không thay code nghiệp vụ vì các tình huống đã chạy không tái hiện lỗi backend; giai đoạn 1 vẫn mở.
