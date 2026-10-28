# Route, nguồn và quyền — baseline 28/10/2026

Đối chiếu mã local và snapshot Cloud trong `inventory.txt`. EXECUTE theo role PostgreSQL không thay thế quyền nghiệp vụ; metadata không thay thế thử bằng JWT thật.

## Route active

| Luồng | Entry | Phía máy chủ/nguồn | Ranh giới quyền |
|---|---|---|---|
| Widget khách | `components/fab/fab.js` → POST `/api/admin-chat` | `public_open/list/read/mode/send`; `chat_conversation`, `chat_message`, `guest_session`, `customer`, `chat_feedback` | JWT hợp lệ → customer active; hoặc guest token hash/phiên còn hạn; kiểm tra chủ sở hữu trước đọc/ghi |
| Trợ lý Admin | `tab-chatbot-copilot.js` → GET/POST/DELETE `/api/admin-chat` | `scripts/api/admin_copilot.js`, facts/context/history RPC | `verifyStaffCaller`: Auth getUser + `get_staff_login_context`; staff active, không bắt đổi mật khẩu, permission theo thao tác |
| Trực chat Admin | `chatbot.js`, `tab-chatbot-live.js` → Supabase RPC và SELECT giới hạn | Inbox, timeline, context khách, actions | JWT staff qua client; RPC kiểm tra quyền/actor/revision, SELECT theo RLS/grants |
| Quy định | `tab-chatbot-rules.js` → RPC/SELECT; benchmark qua `/api/admin-chat` | `admin_chat_rule_page`, `save_admin_chat_rule`, `save_admin_chat_benchmark` | Quyền từng bảng; benchmark cần thêm quyền đọc bộ lọc/trigger, ghi ma trận và audit |
| Gateway cũ | POST `/api/chat` → `api/chat.js` | Chỉ forward `public_*`, feedback và isCopilot | Request legacy khác trả 410 |
| Express aliases | `/api/admin/copilot`, `/api/admin/copilot/history`, evaluations | `server.js` nối handler hiện tại | Chỉ chứng minh route local; không mặc định Vercel hỗ trợ mọi alias |
| Routes legacy khác | session/conversations/handover/back-to-ai/csat/config/actions cũ | Express trả 410 | Không dùng suite gọi route cũ làm nghiệm thu active |

`scripts/api/chat.js` còn được require ở server nhưng route active không dùng handler legacy đó làm endpoint chat chính. Vercel có function `api/admin-chat.js`, maxDuration 60 giây; cấu hình thời gian HTTP không chứng minh SQL bị hủy sau timeout.

## Nhóm RPC và quyền

| Nhóm | RPC | Quyền/đối tượng cần xác minh |
|---|---|---|
| Gateway riêng server | `open_public_chat`, `post_public_chat_message`, `set_public_chat_mode`, `save_chat_feedback` | Chỉ service_role EXECUTE; API xác minh danh tính/sở hữu. Service role không thay bằng chứng khách được quyền đọc |
| Đọc ca Admin | `get_admin_chat_inbox_page`, `get_admin_chat_messages` | authenticated EXECUTE + quyền đọc ca/tin ở trong hàm |
| Thao tác ca | `act_admin_chat`, `transfer_admin_chat`, `resolve_admin_chat`, `create_chat_complaint` | Quyền chat/action/audit theo từng hàm, người phụ trách, ca hợp lệ, revision và chống lặp |
| Điểm và nguyên văn | `adjust_admin_chat_points`, `read_admin_chat_raw` | Quyền riêng, policy/hạn mức/ca/actor; raw phải ghi audit |
| Quy định | `admin_chat_rule_page`, `save_admin_chat_rule`, `save_admin_chat_benchmark` | Quyền đọc/ghi bảng tương ứng; conflict/idempotency theo hợp đồng |
| Lịch sử trợ lý | `admin_copilot_session_page`, `admin_copilot_recent_context`, `delete_admin_copilot_session` | Quyền history và phạm vi staff của caller |
| Lưu trợ lý | `save_admin_copilot_exchange` | Chỉ service_role gọi, bên trong kiểm tra actor/quyền; không có quyền ghi nghiệp vụ từ model |
| Context ca | `admin_copilot_chat_context` | Quyền đọc ca/tin; tối đa ngữ cảnh được phép, không raw |

Snapshot chứa mọi signature và cờ `anon_execute`, `authenticated_execute`, `service_execute`; câu trên là nhóm ranh giới cần nghiệm thu, không thay phép thử từng tổ hợp vai trò.

## Công cụ facts hiện có

Mọi intent Admin cần quyền history đọc và khi gửi câu hỏi mới cần history ghi ở API. Ngoài ra:

| Intent | Bảng/nguồn | Quyền dữ liệu |
|---|---|---|
| `appointment.list` | appointment, appointment_item, service, service_category | Bốn quyền `.read` tương ứng |
| `inventory.low_stock` | inventory, product_variant, product | Ba quyền `.read` tương ứng |
| `ticket.open` | support_ticket | support_ticket.read |
| `customer.lookup` | customer, customer_profile, customer_phone | Ba quyền `.read` tương ứng |
| `order.lookup` | sales_order | sales_order.read |
| `catalog.product` | product, product_variant | product.read, product_variant.read |
| `catalog.service` | service | service.read |
| `catalog.service_price` | service/category, service_price_matrix/taxi_price_rule/hotel_room_type theo nhóm | service/category.read và quyền giá theo nhóm; có kiểm tra bổ sung FAQ cho hướng dẫn |
| `revenue.summary` | payment succeeded theo succeeded_at; refund_transaction succeeded theo completed_at | payment.read, refund_transaction.read |
| `knowledge.search` | chatbot_knowledge_faq đang bật | chatbot_knowledge_faq.read |

Kết quả số liệu dùng RPC dưới quyền caller, không giao model tạo SQL. Tóm tắt/soạn nháp dùng Gemini với context giới hạn, không có công cụ ghi nghiệp vụ.

## Những điều chưa được chứng minh

- Metadata có grant/column/policy không chứng minh mọi vai trò thực tế đọc đúng dữ liệu; giữ test ma trận giai đoạn 1.
- Chưa có công cụ chatbot khách đọc đơn/lịch/điểm của mình; các nguồn API nghiệp vụ khác nếu có không tự động trở thành quyền chatbot.
- Chưa xác minh cơ chế guest sở hữu giao dịch cho chatbot; session chat chỉ chứng minh quyền đối với hội thoại của phiên đó.
- Không dùng tài liệu thang cảm xúc cũ để kết luận CHECK hiện tại 1–5: Cloud hiện `>=0`, gateway 1–6. Không tự thay schema trong baseline.
