# Kiểm kê truy vấn tĩnh Admin và lớp dùng chung

Nguồn: CDSLfinal.md (81 thực thể). Chỉ đọc mã nguồn; không xác minh live.

Cách chạy: `node scripts/test/audit_admin_cdsl.cjs`. Bộ quét nhận diện chain literal, select lồng theo tên bảng và khóa payload literal. Không phân tích đầy đủ AST, payload động, alias quan hệ theo FK, SQL/RPC hoặc thuộc tính response; mọi kết quả phải đọc lại ngữ cảnh. Template nội suy và quan hệ chưa rõ được đưa vào danh sách thủ công. File API/shared có thể chỉ chạy phía khách, cần xác minh đường gọi trước khi quy thành lỗi Admin.

## Tổng hợp theo phân hệ

| Phạm vi | Số chain from literal | Sai lệch ứng viên |
|---|---:|---:|
| Admin nền | 3 | 0 |
| chatbot | 42 | 0 |
| complaints | 38 | 0 |
| customers | 36 | 1 |
| dashboard | 13 | 0 |
| orders | 67 | 0 |
| pets | 27 | 0 |
| scripts/api | 206 | 3 |
| scripts/shared | 20 | 0 |
| services | 27 | 0 |
| settings | 22 | 0 |
| staff | 31 | 1 |

## Sai lệch ứng viên so với danh mục thiết kế

| File:dòng | Bảng | Cột | Thao tác |
|---|---|---|---|
| pages/admin/modules/customers/subtabs/tab-customer-list.js:816 | customer_activation_sms | — | bảng ngoài thiết kế |
| pages/admin/modules/staff/subtabs/tab-staff-assessment.js:313 | staff_assessment | — | bảng ngoài thiết kế |
| scripts/api/chat.js:71 | admin_copilot_history | — | bảng ngoài thiết kế |
| scripts/api/chat.js:1199 | admin_copilot_history | — | bảng ngoài thiết kế |
| scripts/api/chat.js:1227 | admin_copilot_history | — | bảng ngoài thiết kế |

## Truy vấn đã kiểm kê

| File:dòng | Bảng | Các thao tác trong chain |
|---|---|---|
| pages/admin/login/login.js:114 | staff | select, eq, limit |
| pages/admin/login/login.js:211 | staff | update, eq |
| pages/admin/login/login.js:233 | staff | update, eq |
| pages/admin/modules/chatbot/chatbot.js:271 | chat_conversation | select, order, limit |
| pages/admin/modules/chatbot/chatbot.js:296 | customer_profile | select, in |
| pages/admin/modules/chatbot/chatbot.js:299 | customer | select, in |
| pages/admin/modules/chatbot/chatbot.js:302 | chat_message | select, in, order, limit |
| pages/admin/modules/chatbot/chatbot.js:445 | chat_message | select, eq, order, limit |
| pages/admin/modules/chatbot/chatbot.js:493 | pet_profile | select, eq |
| pages/admin/modules/chatbot/chatbot.js:494 | sales_order | select, eq, order, limit |
| pages/admin/modules/chatbot/chatbot.js:495 | appointment | select, eq, order, limit |
| pages/admin/modules/chatbot/chatbot.js:496 | support_ticket | select, or, neq, neq, limit |
| pages/admin/modules/chatbot/chatbot.js:497 | customer_membership | select, eq, maybeSingle |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js:708 | document_embeddings | select |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:973 | chat_conversation | select, eq, order, limit, maybeSingle |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:987 | chat_conversation | insert, select, single |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:1097 | chat_message | insert, select, single |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:1119 | chat_conversation | update, eq |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:1248 | chat_conversation | update, eq |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:1256 | chat_message | insert |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:1354 | chat_conversation | update, eq, select, single |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:1363 | customer | update, eq |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:1953 | chat_message | insert |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:2001 | chat_message | insert |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:2067 | chat_conversation | update, eq |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:2079 | chat_message | insert |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:2098 | chat_message | insert |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:54 | chatbot_knowledge_faq | select, order, order |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:55 | chatbot_profanity_filter | select, order |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:56 | chatbot_canned_response | select, order, order |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:57 | chatbot_compensation_policy | select, order |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:58 | chatbot_handover_rule | select, order |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:59 | chatbot_scenario_matrix | select, order |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:235 | chatbot_knowledge_faq | update, eq |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:258 | chatbot_knowledge_faq | delete, eq |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:405 | chatbot_profanity_filter | update, eq |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:428 | chatbot_profanity_filter | delete, eq |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:561 | chatbot_canned_response | update, eq |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:584 | chatbot_canned_response | delete, eq |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:1090 | chatbot_knowledge_faq | update, eq |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:1105 | chatbot_knowledge_faq | insert |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:1150 | chatbot_profanity_filter | update, eq |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:1163 | chatbot_profanity_filter | insert |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:1207 | chatbot_canned_response | update, eq |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:1220 | chatbot_canned_response | insert |
| pages/admin/modules/complaints/complaints.js:333 | support_ticket | select, order, order |
| pages/admin/modules/complaints/complaints.js:334 | customer | select |
| pages/admin/modules/complaints/complaints.js:335 | customer_profile | select |
| pages/admin/modules/complaints/complaints.js:336 | pet_profile | select |
| pages/admin/modules/complaints/complaints.js:337 | appointment | select, order, limit |
| pages/admin/modules/complaints/complaints.js:338 | sales_order | select, order, limit |
| pages/admin/modules/complaints/complaints.js:339 | staff | select |
| pages/admin/modules/complaints/complaints.js:340 | product | select |
| pages/admin/modules/complaints/complaints.js:832 | support_ticket_message | select, eq, order |
| pages/admin/modules/complaints/complaints.js:2005 | support_ticket | insert, select |
| pages/admin/modules/complaints/complaints.js:2009 | support_ticket_message | insert |
| pages/admin/modules/complaints/complaints.js:2016 | support_ticket | delete, eq |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:199 | staff | update, eq |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:334 | support_ticket_message | insert |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:341 | support_ticket | update, eq |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:784 | support_ticket | update, eq |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:801 | support_ticket_message | insert |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:894 | support_ticket | update, eq |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:902 | support_ticket_message | insert |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:971 | support_ticket_message | insert |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:987 | support_ticket | update, eq, is |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:1042 | support_ticket_message | insert |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:1058 | support_ticket | update, eq, is |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:1065 | support_ticket | update, eq |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:1182 | support_ticket_message | insert |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:1189 | support_ticket | update, eq |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:1245 | support_ticket | select, eq, maybeSingle |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:1249 | customer_membership | select, eq, maybeSingle |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:1255 | customer_membership | update, eq |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:1258 | customer_membership | insert |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:1262 | paw_point_transaction | insert |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:1282 | support_ticket | update, eq |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:1306 | support_ticket_message | insert |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:1367 | support_ticket | update, eq |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:1380 | support_ticket_message | insert |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:1420 | support_ticket | update, eq |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:1477 | support_ticket_message | insert |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:1483 | support_ticket | update, eq |
| pages/admin/modules/customers/customers.js:241 | customer | select, order |
| pages/admin/modules/customers/customers.js:242 | customer_profile | select |
| pages/admin/modules/customers/customers.js:243 | customer_membership | select |
| pages/admin/modules/customers/customers.js:244 | customer_address | select |
| pages/admin/modules/customers/customers.js:245 | pet_profile | select |
| pages/admin/modules/customers/customers.js:458 | sales_order | select, eq, order, limit |
| pages/admin/modules/customers/customers.js:463 | appointment | select, eq, order, limit |
| pages/admin/modules/customers/customers.js:468 | support_ticket | select, eq, order, limit |
| pages/admin/modules/customers/customers.js:569 | paw_point_transaction | select, order, limit |
| pages/admin/modules/customers/subtabs/tab-customer-list.js:762 | customer | insert, select, single |
| pages/admin/modules/customers/subtabs/tab-customer-list.js:778 | customer_profile | insert |
| pages/admin/modules/customers/subtabs/tab-customer-list.js:785 | customer | delete, eq |
| pages/admin/modules/customers/subtabs/tab-customer-list.js:790 | customer_membership | insert |
| pages/admin/modules/customers/subtabs/tab-customer-list.js:796 | customer_profile | delete, eq |
| pages/admin/modules/customers/subtabs/tab-customer-list.js:797 | customer | delete, eq |
| pages/admin/modules/customers/subtabs/tab-customer-list.js:803 | customer_address | insert |
| pages/admin/modules/customers/subtabs/tab-customer-list.js:816 | customer_activation_sms | insert |
| pages/admin/modules/customers/subtabs/tab-customer-list.js:830 | pet_profile | insert |
| pages/admin/modules/customers/subtabs/tab-customer-list.js:915 | customer | update, eq, select |
| pages/admin/modules/customers/subtabs/tab-customer-pawpoint.js:356 | customer_membership | select, eq, maybeSingle |
| pages/admin/modules/customers/subtabs/tab-customer-pawpoint.js:373 | customer_membership | update, eq, select, maybeSingle |
| pages/admin/modules/customers/subtabs/tab-customer-pawpoint.js:382 | customer_membership | upsert |
| pages/admin/modules/customers/subtabs/tab-customer-pawpoint.js:387 | paw_point_transaction | insert |
| pages/admin/modules/customers/subtabs/tab-customer-pawpoint.js:398 | customer_membership | update, eq |
| pages/admin/modules/customers/subtabs/tab-customer-profile.js:150 | pet_profile | delete, eq |
| pages/admin/modules/customers/subtabs/tab-customer-profile.js:400 | notification | insert |
| pages/admin/modules/customers/subtabs/tab-customer-profile.js:719 | customer | update, eq |
| pages/admin/modules/customers/subtabs/tab-customer-profile.js:732 | customer_profile | update, eq, select |
| pages/admin/modules/customers/subtabs/tab-customer-profile.js:738 | customer_profile | insert |
| pages/admin/modules/customers/subtabs/tab-customer-profile.js:746 | customer_address | delete, eq |
| pages/admin/modules/customers/subtabs/tab-customer-profile.js:756 | customer_address | insert |
| pages/admin/modules/customers/subtabs/tab-customer-profile.js:766 | customer_membership | upsert |
| pages/admin/modules/customers/subtabs/tab-customer-profile.js:771 | audit_log | insert |
| pages/admin/modules/customers/subtabs/tab-customer-profile.js:851 | pet_profile | insert |
| pages/admin/modules/customers/subtabs/tab-customer-profile.js:921 | pet_profile | update, eq |
| pages/admin/modules/customers/subtabs/tab-customer-profile.js:964 | customer | update, eq |
| pages/admin/modules/dashboard/dashboard.js:116 | sales_order | select, order, limit |
| pages/admin/modules/dashboard/dashboard.js:117 | appointment | select, order, limit |
| pages/admin/modules/dashboard/dashboard.js:118 | support_ticket | select, order, limit |
| pages/admin/modules/dashboard/dashboard.js:119 | product | select |
| pages/admin/modules/dashboard/dashboard.js:120 | customer | select |
| pages/admin/modules/dashboard/dashboard.js:121 | pet_profile | select |
| pages/admin/modules/dashboard/dashboard.js:122 | customer_profile | select |
| pages/admin/modules/dashboard/dashboard.js:123 | pet_profile | select |
| pages/admin/modules/dashboard/dashboard.js:124 | staff | select |
| pages/admin/modules/dashboard/dashboard.js:125 | service | select |
| pages/admin/modules/dashboard/dashboard.js:126 | chat_conversation | select, limit |
| pages/admin/modules/dashboard/dashboard.js:160 | product | select |
| pages/admin/modules/dashboard/dashboard.js:161 | inventory | select |
| pages/admin/modules/orders/orders.js:120 | inventory_transaction | insert, then |
| pages/admin/modules/orders/orders.js:132 | audit_log | insert, then |
| pages/admin/modules/orders/orders.js:547 | product_category | select, order |
| pages/admin/modules/orders/orders.js:548 | product | select |
| pages/admin/modules/orders/orders.js:730 | voucher | select, order |
| pages/admin/modules/orders/orders.js:797 | sales_order | select, order |
| pages/admin/modules/orders/orders.js:812 | return_request | select, order |
| pages/admin/modules/orders/subtabs/tab-order-detail.js:373 | sales_order | select, eq, limit |
| pages/admin/modules/orders/subtabs/tab-order-detail.js:385 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-detail.js:388 | return_request | insert, select, single |
| pages/admin/modules/orders/subtabs/tab-order-detail.js:413 | return_request_detail | insert |
| pages/admin/modules/orders/subtabs/tab-order-detail.js:425 | inventory | select, eq, limit |
| pages/admin/modules/orders/subtabs/tab-order-detail.js:428 | inventory | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:420 | customer | select, order, limit |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1031 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1033 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1248 | customer_address | select, eq, limit |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1252 | customer_address | insert, select, single |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1264 | customer_address | select, limit |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1269 | sales_order | insert, select, single |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1286 | voucher | select, ilike, maybeSingle |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1288 | voucher | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1313 | sales_order_detail | insert |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1325 | inventory | select, eq, limit |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1332 | inventory | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1347 | customer_membership | select, eq, maybeSingle |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1354 | customer_membership | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1357 | paw_point_transaction | insert |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1440 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1442 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1482 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1484 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1619 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1621 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1763 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1765 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1805 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1807 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1841 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1843 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1881 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1883 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1920 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1922 | sales_order | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-products.js:862 | product | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-products.js:882 | product_variant | delete, eq |
| pages/admin/modules/orders/subtabs/tab-order-products.js:891 | product_variant | insert |
| pages/admin/modules/orders/subtabs/tab-order-products.js:893 | product_variant | select, eq, limit |
| pages/admin/modules/orders/subtabs/tab-order-products.js:895 | product_variant | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-products.js:903 | product_variant | insert |
| pages/admin/modules/orders/subtabs/tab-order-products.js:920 | inventory | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-products.js:966 | product_category | select, ilike, limit |
| pages/admin/modules/orders/subtabs/tab-order-products.js:969 | product | insert, select, single |
| pages/admin/modules/orders/subtabs/tab-order-products.js:1004 | product_variant | insert, select |
| pages/admin/modules/orders/subtabs/tab-order-products.js:1009 | product_variant | insert, select, single |
| pages/admin/modules/orders/subtabs/tab-order-products.js:1025 | inventory | insert |
| pages/admin/modules/orders/subtabs/tab-order-products.js:1033 | product | delete, eq |
| pages/admin/modules/orders/subtabs/tab-order-products.js:1133 | inventory | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-products.js:1141 | product_variant | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-products.js:1144 | product | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-products.js:1247 | inventory | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-products.js:1295 | inventory | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-products.js:1342 | product | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-products.js:1879 | review | select, eq, order |
| pages/admin/modules/orders/subtabs/tab-order-products.js:2000 | review | update, eq |
| pages/admin/modules/orders/subtabs/tab-order-promos.js:194 | voucher | insert |
| pages/admin/modules/orders/subtabs/tab-order-promos.js:278 | voucher | update, eq |
| pages/admin/modules/pets/pets.js:228 | customer | select |
| pages/admin/modules/pets/pets.js:229 | customer_profile | select |
| pages/admin/modules/pets/pets.js:230 | pet_profile | select, order |
| pages/admin/modules/pets/pets.js:387 | pet_weight_history | select, eq, order, limit |
| pages/admin/modules/pets/pets.js:392 | care_log | select, eq, order, limit |
| pages/admin/modules/pets/pets.js:397 | appointment | select, eq, order, limit |
| pages/admin/modules/pets/pets.js:480 | care_log | select, order, limit |
| pages/admin/modules/pets/pets.js:484 | appointment | select, limit |
| pages/admin/modules/pets/pets.js:514 | appointment | select, eq, order, limit |
| pages/admin/modules/pets/subtabs/tab-pet-list.js:506 | pet_profile | update, eq, select |
| pages/admin/modules/pets/subtabs/tab-pet-list.js:525 | pet_profile | update, eq, select |
| pages/admin/modules/pets/subtabs/tab-pet-list.js:1029 | customer | insert, select, single |
| pages/admin/modules/pets/subtabs/tab-pet-list.js:1045 | customer_profile | insert |
| pages/admin/modules/pets/subtabs/tab-pet-list.js:1052 | customer | delete, eq |
| pages/admin/modules/pets/subtabs/tab-pet-list.js:1057 | customer_membership | insert |
| pages/admin/modules/pets/subtabs/tab-pet-list.js:1066 | customer_address | insert |
| pages/admin/modules/pets/subtabs/tab-pet-list.js:1242 | pet_profile | select, eq, ilike, limit |
| pages/admin/modules/pets/subtabs/tab-pet-list.js:1270 | pet_profile | insert, select, single |
| pages/admin/modules/pets/subtabs/tab-pet-list.js:1277 | pet_weight_history | insert |
| pages/admin/modules/pets/subtabs/tab-pet-list.js:1399 | pet_weight_history | insert |
| pages/admin/modules/pets/subtabs/tab-pet-list.js:1410 | pet_profile | update, eq |
| pages/admin/modules/pets/subtabs/tab-pet-profile.js:406 | pet_profile | update, eq, select |
| pages/admin/modules/pets/subtabs/tab-pet-profile.js:531 | pet_weight_history | insert, select |
| pages/admin/modules/pets/subtabs/tab-pet-profile.js:542 | pet_profile | update, eq, select |
| pages/admin/modules/pets/subtabs/tab-pet-profile.js:643 | pet_profile | update, eq, select |
| pages/admin/modules/pets/subtabs/tab-pet-profile.js:841 | pet_profile | select, eq, single |
| pages/admin/modules/pets/subtabs/tab-pet-profile.js:845 | pet_profile | update, eq, select |
| pages/admin/modules/services/services.js:51 | appointment | update, eq, eq, eq |
| pages/admin/modules/services/services.js:92 | appointment | update, eq, eq, eq |
| pages/admin/modules/services/services.js:329 | appointment | select, order |
| pages/admin/modules/services/services.js:366 | staff | select, order |
| pages/admin/modules/services/services.js:391 | service | select, order |
| pages/admin/modules/services/services.js:392 | service_price_matrix | select |
| pages/admin/modules/services/services.js:416 | review | select, eq, order |
| pages/admin/modules/services/services.js:440 | care_log | select, eq, order |
| pages/admin/modules/services/subtabs/tab-service-bookings.js:752 | appointment | update, eq, eq, select, single |
| pages/admin/modules/services/subtabs/tab-service-bookings.js:1474 | pet_profile | select, eq, single |
| pages/admin/modules/services/subtabs/tab-service-bookings.js:1500 | taxi_price_rule | select |
| pages/admin/modules/services/subtabs/tab-service-bookings.js:1512 | service_price_matrix | select, eq |
| pages/admin/modules/services/subtabs/tab-service-bookings.js:1521 | appointment | insert, select, single |
| pages/admin/modules/services/subtabs/tab-service-bookings.js:2153 | appointment | update, eq, eq |
| pages/admin/modules/services/subtabs/tab-service-catalog.js:600 | service | upsert, select, single |
| pages/admin/modules/services/subtabs/tab-service-catalog.js:636 | service_price_matrix | update, eq, eq, is |
| pages/admin/modules/services/subtabs/tab-service-catalog.js:642 | service_price_matrix | insert, select |
| pages/admin/modules/services/subtabs/tab-service-catalog.js:647 | service_price_matrix | update, eq, eq |
| pages/admin/modules/services/subtabs/tab-service-detail.js:710 | care_action | select, eq, eq, eq |
| pages/admin/modules/services/subtabs/tab-service-detail.js:715 | care_action | insert, select, single |
| pages/admin/modules/services/subtabs/tab-service-detail.js:719 | care_log | insert, select, single |
| pages/admin/modules/services/subtabs/tab-service-detail.js:781 | care_action | select, eq, eq, eq |
| pages/admin/modules/services/subtabs/tab-service-detail.js:786 | care_action | insert, select, single |
| pages/admin/modules/services/subtabs/tab-service-detail.js:792 | care_log | update, eq, eq |
| pages/admin/modules/services/subtabs/tab-service-detail.js:825 | care_log | delete, eq, eq |
| pages/admin/modules/services/subtabs/tab-service-detail.js:1153 | notification | insert |
| pages/admin/modules/services/subtabs/tab-service-reviews.js:544 | review | update, eq, select, single |
| pages/admin/modules/settings/settings.js:312 | audit_log | insert |
| pages/admin/modules/settings/settings.js:441 | pawpal_setting | upsert |
| pages/admin/modules/settings/settings.js:495 | banner | select, order |
| pages/admin/modules/settings/settings.js:496 | voucher | select, order |
| pages/admin/modules/settings/settings.js:497 | notification | select, order |
| pages/admin/modules/settings/settings.js:613 | blog_post | select, order |
| pages/admin/modules/settings/settings.js:614 | blog_category | select, order |
| pages/admin/modules/settings/settings.js:688 | pawpal_setting | select |
| pages/admin/modules/settings/settings.js:689 | service | select, order |
| pages/admin/modules/settings/settings.js:690 | product | select, order, limit |
| pages/admin/modules/settings/settings.js:753 | audit_log | select, order, limit |
| pages/admin/modules/settings/subtabs/tab-settings-banners.js:129 | banner | insert, select |
| pages/admin/modules/settings/subtabs/tab-settings-banners.js:133 | banner | update, eq, select |
| pages/admin/modules/settings/subtabs/tab-settings-banners.js:137 | banner | delete, eq, select |
| pages/admin/modules/settings/subtabs/tab-settings-banners.js:946 | voucher | insert |
| pages/admin/modules/settings/subtabs/tab-settings-banners.js:990 | voucher | update, eq, select |
| pages/admin/modules/settings/subtabs/tab-settings-banners.js:1020 | voucher | update, eq, select |
| pages/admin/modules/settings/subtabs/tab-settings-banners.js:1050 | voucher | delete, eq, select |
| pages/admin/modules/settings/subtabs/tab-settings-content.js:300 | staff | select, eq, maybeSingle |
| pages/admin/modules/settings/subtabs/tab-settings-content.js:327 | blog_post | insert, select |
| pages/admin/modules/settings/subtabs/tab-settings-content.js:470 | blog_post | update, eq, select |
| pages/admin/modules/settings/subtabs/tab-settings-content.js:515 | blog_post | delete, eq |
| pages/admin/modules/staff/staff.js:238 | staff | select, order |
| pages/admin/modules/staff/staff.js:264 | staff_schedule | select, gte, lte |
| pages/admin/modules/staff/staff.js:272 | staff_schedule | select, limit |
| pages/admin/modules/staff/staff.js:291 | staff_shift_request | select, order, limit |
| pages/admin/modules/staff/subtabs/tab-staff-assessment.js:305 | staff | update, eq |
| pages/admin/modules/staff/subtabs/tab-staff-assessment.js:313 | staff_assessment | insert |
| pages/admin/modules/staff/subtabs/tab-staff-assessment.js:328 | audit_log | insert |
| pages/admin/modules/staff/subtabs/tab-staff-list.js:344 | staff | delete, eq |
| pages/admin/modules/staff/subtabs/tab-staff-list.js:558 | appointment | select, eq, gte, in, order, limit |
| pages/admin/modules/staff/subtabs/tab-staff-list.js:873 | staff | update, eq |
| pages/admin/modules/staff/subtabs/tab-staff-list.js:889 | staff | insert, select, single |
| pages/admin/modules/staff/subtabs/tab-staff-list.js:1026 | staff | update, eq |
| pages/admin/modules/staff/subtabs/tab-staff-list.js:1038 | appointment | update, eq |
| pages/admin/modules/staff/subtabs/tab-staff-list.js:1082 | staff | update, eq |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:241 | staff_shift_request | select, eq, single |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:245 | staff_shift_request | update, eq |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:256 | staff_schedule | select, eq, eq, in, limit, single |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:257 | staff_schedule | select, eq, eq, in, limit, single |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:259 | staff_schedule | update, eq |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:260 | staff_schedule | update, eq |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:265 | staff_schedule | update, eq, gte, lte |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:299 | staff_shift_request | insert, select, single |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:412 | appointment | select, eq, in, order |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:421 | pet_profile | select, in |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:422 | service | select, in |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:474 | audit_log | insert, select, single |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:487 | appointment | select, eq, maybeSingle |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:490 | appointment | update, eq |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:738 | staff_schedule | select, eq |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:761 | staff_schedule | update, eq, eq, select, single |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:767 | staff_schedule | insert, select |
| scripts/api/admin_settings.js:28 | banner | insert, select |
| scripts/api/admin_settings.js:38 | banner | update, eq, select |
| scripts/api/admin_settings.js:48 | banner | delete, eq, select |
| scripts/api/api.js:68 | pet_profile | select, eq |
| scripts/api/api.js:101 | appointment | select, eq, order |
| scripts/api/api.js:188 | sales_order | select, eq, order |
| scripts/api/api.js:276 | review | select, eq |
| scripts/api/api.js:295 | customer_voucher | select, eq |
| scripts/api/api.js:354 | cart | select, eq, maybeSingle |
| scripts/api/api.js:358 | cart_item | select, eq |
| scripts/api/api.js:391 | cart | select, eq, maybeSingle |
| scripts/api/api.js:394 | cart | insert, select, single |
| scripts/api/api.js:414 | product_variant | select, or |
| scripts/api/api.js:422 | inventory | select, in |
| scripts/api/api.js:505 | cart_item | select, eq |
| scripts/api/api.js:513 | product_variant | select, or |
| scripts/api/api.js:527 | cart_item | update, eq, eq |
| scripts/api/api.js:528 | cart_item | insert |
| scripts/api/api.js:536 | cart_item | delete, eq, in, select |
| scripts/api/api.js:587 | cart_item | update, eq, or |
| scripts/api/api.js:599 | cart_item | delete, eq, or |
| scripts/api/api.js:609 | cart_item | delete, eq |
| scripts/api/api.js:622 | wishlist | select, eq, maybeSingle |
| scripts/api/api.js:625 | wishlist_item | select, eq |
| scripts/api/api.js:646 | wishlist | select, eq, maybeSingle |
| scripts/api/api.js:649 | wishlist | insert, select, single |
| scripts/api/api.js:662 | wishlist_item | select, eq |
| scripts/api/api.js:670 | wishlist_item | insert |
| scripts/api/api.js:676 | wishlist_item | delete, eq, in |
| scripts/api/api.js:689 | wishlist_item | select, eq, eq, maybeSingle |
| scripts/api/api.js:694 | wishlist_item | delete, eq |
| scripts/api/api.js:699 | wishlist_item | insert |
| scripts/api/api.js:769 | customer_address | insert, select, single |
| scripts/api/api.js:801 | sales_order | insert, select, single |
| scripts/api/api.js:813 | payment | insert |
| scripts/api/api.js:823 | product_variant | select, eq, limit |
| scripts/api/api.js:835 | sales_order_detail | insert |
| scripts/api/api.js:842 | voucher | select, ilike, maybeSingle |
| scripts/api/api.js:844 | voucher | update, eq |
| scripts/api/api.js:880 | sales_order | update |
| scripts/api/api.js:894 | payment | update, eq |
| scripts/api/api.js:942 | sales_order | update |
| scripts/api/api.js:969 | voucher | select |
| scripts/api/api.js:1028 | delivery_option_config | select, eq, order |
| scripts/api/api.js:1060 | payment_method_config | select, eq, order |
| scripts/api/api.js:1100 | appointment | update, eq, lt |
| scripts/api/api.js:1116 | appointment | select, eq, eq, not |
| scripts/api/api.js:1169 | appointment | insert, select, single |
| scripts/api/api.js:1186 | appointment | update, eq, select, single |
| scripts/api/api.js:1212 | stock_reservation | update, eq, lt |
| scripts/api/api.js:1226 | inventory | select, eq, maybeSingle |
| scripts/api/api.js:1230 | stock_reservation | select, eq, eq, gt |
| scripts/api/api.js:1258 | stock_reservation | insert |
| scripts/api/api.js:1273 | care_log | select, eq, order |
| scripts/api/api.js:1306 | care_log | insert, select, single |
| scripts/api/api.js:1317 | care_log_media | insert |
| scripts/api/api.js:1334 | review_response | select, eq, order |
| scripts/api/api.js:1355 | review_response | insert, select, single |
| scripts/api/api.js:1371 | pawpal_setting | select, eq, maybeSingle |
| scripts/api/api.js:1393 | pawpal_setting | select |
| scripts/api/api.js:1425 | pawpal_setting | upsert, select, single |
| scripts/api/api.js:1445 | hotel_room | select, order |
| scripts/api/api.js:1469 | hotel_room | update, eq, select, single |
| scripts/api/api.js:1484 | taxi_price_rule | select, eq, order |
| scripts/api/api.js:1531 | shipping_provider | select, eq, order |
| scripts/api/api.js:1601 | inventory | select, order |
| scripts/api/api.js:1619 | inventory | select, eq, maybeSingle |
| scripts/api/api.js:1638 | inventory | update, eq |
| scripts/api/api.js:1643 | inventory | insert |
| scripts/api/api.js:1653 | inventory_transaction | insert, select, single |
| scripts/api/api.js:1680 | return_request | select, order |
| scripts/api/api.js:1704 | return_request | insert, select, single |
| scripts/api/api.js:1726 | return_request_detail | insert |
| scripts/api/api.js:1760 | return_request | update, eq, select, single |
| scripts/api/api.js:1797 | support_ticket | select, order |
| scripts/api/api.js:1822 | support_ticket | insert, select, single |
| scripts/api/api.js:1853 | support_ticket_message | insert, select, single |
| scripts/api/api.js:1868 | support_ticket | update, eq, is |
| scripts/api/api.js:1873 | support_ticket | update, eq |
| scripts/api/api.js:1911 | support_ticket | update, eq, select, single |
| scripts/api/api.js:1932 | notification | select, eq, order, limit |
| scripts/api/api.js:1949 | notification | update, eq, select, single |
| scripts/api/api.js:1966 | notification | insert, select, single |
| scripts/api/api.js:1991 | audit_log | insert, select, single |
| scripts/api/chat.js:71 | admin_copilot_history | insert, then, catch |
| scripts/api/chat.js:102 | api_keys | select, eq, eq |
| scripts/api/chat.js:151 | customer | select, eq, maybeSingle |
| scripts/api/chat.js:171 | customer | select, eq, maybeSingle |
| scripts/api/chat.js:193 | chatbot_profanity_filter | select, eq |
| scripts/api/chat.js:213 | chatbot_sentiment_trigger | select, eq |
| scripts/api/chat.js:233 | chatbot_system_prompt | select, eq |
| scripts/api/chat.js:409 | support_ticket | select, eq |
| scripts/api/chat.js:410 | customer_membership | select, eq, maybeSingle |
| scripts/api/chat.js:418 | paw_point_transaction | select, eq, order, limit, maybeSingle |
| scripts/api/chat.js:452 | chat_message | select, eq, eq, order, limit, maybeSingle |
| scripts/api/chat.js:472 | chat_conversation | select, eq |
| scripts/api/chat.js:491 | chat_conversation | select, eq, in, order, limit, maybeSingle |
| scripts/api/chat.js:501 | chat_conversation | select, eq, in, order, limit, maybeSingle |
| scripts/api/chat.js:513 | chat_conversation | insert, select, single |
| scripts/api/chat.js:546 | sales_order | select, eq, order, limit |
| scripts/api/chat.js:557 | appointment | select, eq, order, limit |
| scripts/api/chat.js:567 | service_price_matrix | select, limit |
| scripts/api/chat.js:580 | pet_profile | select, eq |
| scripts/api/chat.js:617 | chatbot_knowledge_faq | select, or, limit |
| scripts/api/chat.js:725 | appointment | select |
| scripts/api/chat.js:796 | sales_order | select |
| scripts/api/chat.js:875 | inventory | select |
| scripts/api/chat.js:879 | inventory | select, order |
| scripts/api/chat.js:944 | support_ticket | select |
| scripts/api/chat.js:996 | customer | select |
| scripts/api/chat.js:1014 | customer_profile | select, ilike, limit |
| scripts/api/chat.js:1035 | sales_order | select, eq, order, limit |
| scripts/api/chat.js:1036 | appointment | select, eq, order, limit |
| scripts/api/chat.js:1076 | chatbot_knowledge_faq | select, eq, or, limit |
| scripts/api/chat.js:1199 | admin_copilot_history | select, order, limit |
| scripts/api/chat.js:1227 | admin_copilot_history | delete |
| scripts/api/chat.js:1680 | chat_message | select, eq, maybeSingle |
| scripts/api/chat.js:1691 | chat_moderation_log | insert |
| scripts/api/chat.js:1808 | chat_message | select, eq, eq, maybeSingle |
| scripts/api/chat.js:1818 | chat_message | select, eq, eq, maybeSingle |
| scripts/api/chat.js:1908 | chat_message | insert, select, single |
| scripts/api/chat.js:1977 | chat_conversation | update, eq |
| scripts/api/chat.js:1981 | chat_moderation_log | insert |
| scripts/api/chat.js:2015 | chat_message | insert |
| scripts/api/chat.js:2078 | chat_conversation | update, eq |
| scripts/api/chat.js:2083 | chat_message | insert |
| scripts/api/chat.js:2256 | chat_message | insert, select, maybeSingle |
| scripts/api/chat_actions.js:55 | chatbot_profanity_filter | select, eq |
| scripts/api/chat_actions.js:88 | chat_moderation_log | insert |
| scripts/api/chat_actions.js:217 | chat_conversation | select, eq, maybeSingle |
| scripts/api/chat_actions.js:230 | customer_membership | select, eq, maybeSingle |
| scripts/api/chat_actions.js:242 | customer_membership | insert |
| scripts/api/chat_actions.js:254 | customer_membership | update, eq |
| scripts/api/chat_actions.js:270 | reward_rule | select, eq, limit, maybeSingle |
| scripts/api/chat_actions.js:281 | paw_point_transaction | insert, select, single |
| scripts/api/chat_actions.js:299 | chat_message | insert |
| scripts/api/chat_actions.js:380 | chat_conversation | select, eq, maybeSingle |
| scripts/api/chat_actions.js:404 | support_ticket | insert, select, single |
| scripts/api/chat_actions.js:423 | support_ticket_message | insert |
| scripts/api/chat_actions.js:433 | chat_message | insert |
| scripts/api/chat_actions.js:491 | chat_conversation | select, eq, maybeSingle |
| scripts/api/chat_actions.js:501 | chat_conversation | update, eq |
| scripts/api/chat_actions.js:536 | chat_conversation | select, eq, maybeSingle |
| scripts/api/chat_actions.js:548 | chat_conversation | update, eq |
| scripts/api/chat_actions.js:563 | chat_message | insert |
| scripts/api/chat_evaluations.js:31 | chatbot_profanity_filter | select, eq |
| scripts/api/chat_evaluations.js:32 | chatbot_sentiment_trigger | select, eq |
| scripts/api/chat_evaluations.js:33 | chatbot_scenario_matrix | select, order |
| scripts/api/chat_evaluations.js:97 | chatbot_scenario_matrix | update, eq |
| scripts/api/customer_auth.js:44 | customer | select, eq, maybeSingle |
| scripts/api/customer_auth.js:46 | staff | select, eq, limit |
| scripts/api/customer_auth.js:53 | staff | select, eq, limit |
| scripts/api/customer_auth.js:55 | customer | select, eq, maybeSingle |
| scripts/api/customer_auth.js:62 | sales_order | select, eq |
| scripts/api/customer_auth.js:63 | appointment | select, eq |
| scripts/api/customer_auth.js:106 | appointment | select, eq, order |
| scripts/api/customer_auth.js:125 | sales_order | select, eq, order |
| scripts/api/customer_auth.js:223 | staff | select, eq, limit |
| scripts/api/customer_auth.js:243 | staff | select, eq, limit |
| scripts/api/customer_loyalty.js:46 | customer_voucher | select, eq, order |
| scripts/api/customer_loyalty.js:60 | voucher | select, limit |
| scripts/api/customer_loyalty.js:76 | customer_membership | select, eq, maybeSingle |
| scripts/api/customer_loyalty.js:86 | customer_membership | update, eq, eq, select, maybeSingle |
| scripts/api/customer_loyalty.js:97 | reward_rule | select, eq, eq, limit, maybeSingle |
| scripts/api/customer_loyalty.js:100 | paw_point_transaction | insert, select, single |
| scripts/api/customer_loyalty.js:110 | customer_voucher | insert, select, single |
| scripts/api/customer_loyalty.js:121 | voucher | update, eq |
| scripts/api/customer_loyalty.js:137 | customer_voucher | delete, eq, eq |
| scripts/api/customer_loyalty.js:138 | paw_point_transaction | delete, eq, eq |
| scripts/api/customer_loyalty.js:139 | customer_membership | update, eq, eq |
| scripts/api/customer_profile_persistence.js:12 | customer | select, eq, single |
| scripts/api/customer_profile_persistence.js:13 | customer_profile | select, eq, maybeSingle |
| scripts/api/customer_profile_persistence.js:14 | customer_address | select, eq, order |
| scripts/api/customer_profile_persistence.js:57 | customer | update, eq |
| scripts/api/customer_profile_persistence.js:61 | customer_profile | update, eq, select, single |
| scripts/api/customer_profile_persistence.js:63 | customer | update, eq |
| scripts/api/customer_profile_persistence.js:72 | customer_address | update, eq |
| scripts/api/customer_profile_persistence.js:79 | customer_address | update, eq, eq |
| scripts/api/customer_profile_persistence.js:80 | customer_address | insert |
| scripts/api/customer_profile_persistence.js:87 | customer_address | delete, eq, in |
| scripts/api/customer_profile_persistence.js:92 | customer_address | delete, eq, in |
| scripts/api/customer_profile_persistence.js:93 | customer_address | update, eq |
| scripts/api/customer_profile_persistence.js:94 | customer_address | update, eq, eq |
| scripts/api/customer_profile_persistence.js:97 | customer | update, eq |
| scripts/api/customer_profile_persistence.js:98 | customer_profile | update, eq |
| scripts/api/customer_support.js:13 | support_ticket | select, eq, eq, maybeSingle |
| scripts/api/customer_support.js:24 | support_ticket_message | insert, select, single |
| scripts/api/customer_support.js:31 | support_ticket | update, eq, eq |
| scripts/api/petService.js:64 | customer | select, limit |
| scripts/api/petService.js:414 | pet_profile | select |
| scripts/api/petService.js:421 | customer | select, eq, limit |
| scripts/api/petService.js:558 | pet_profile | update, eq, eq |
| scripts/api/petService.js:559 | pet_profile | insert |
| scripts/api/petService.js:596 | pet_profile | select, eq, limit |
| scripts/api/petService.js:598 | pet_profile | update, eq |
| scripts/api/petService.js:624 | pet_profile | select, eq, limit |
| scripts/api/petService.js:626 | pet_profile | update, eq |
| scripts/api/staff_auth.js:79 | staff | select, eq, maybeSingle |
| scripts/api/staff_auth.js:97 | staff | select, eq, maybeSingle |
| scripts/api/staff_auth.js:188 | staff | select, eq, single |
| scripts/api/staff_auth.js:269 | staff | update, eq |
| scripts/api/staff_auth.js:290 | audit_log | insert |
| scripts/api/staff_auth.js:349 | staff | select, eq, single |
| scripts/api/staff_auth.js:375 | staff | update, eq |
| scripts/api/staff_auth.js:421 | staff | select, eq, single |
| scripts/api/staff_auth.js:435 | staff | update, eq |
| scripts/shared/customer-booking.mjs:8 | appointment | update, eq, eq, eq, select, single |
| scripts/shared/customer-identity.mjs:10 | customer | select, eq, maybeSingle |
| scripts/shared/customer-identity.mjs:20 | customer | select, eq, maybeSingle |
| scripts/shared/data-loader.js:160 | product | select |
| scripts/shared/data-loader.js:405 | service | select, order |
| scripts/shared/data-loader.js:412 | service_price_matrix | select, eq, is |
| scripts/shared/data-loader.js:576 | review | select, eq, eq, order |
| scripts/shared/data-loader.js:613 | review | select, eq, eq, order |
| scripts/shared/data-loader.js:678 | blog_category | select, order |
| scripts/shared/data-loader.js:696 | blog_post | select, eq, order |
| scripts/shared/data-loader.js:732 | banner | select, or, order |
| scripts/shared/main.js:1526 | customer | select, eq, maybeSingle |
| scripts/shared/main.js:1533 | sales_order | select, eq, order |
| scripts/shared/main.js:1543 | appointment | select, eq, order |
| scripts/shared/notifications-handler.js:73 | notification | select, order |
| scripts/shared/support-handler.js:157 | support_ticket | select, order |
| scripts/shared/support-handler.js:167 | support_ticket_message | select, in, order |
| scripts/shared/support-handler.js:257 | support_ticket | insert, select |
| scripts/shared/support-handler.js:260 | support_ticket_message | insert |
| scripts/shared/support-handler.js:446 | support_ticket | update, eq |

## Điểm cần lần ngược thủ công

| File:dòng | Lý do |
|---|---|
| pages/admin/modules/chatbot/chatbot.js:495 | quan hệ appointment → service_id: cần FK live |
| pages/admin/modules/complaints/complaints.js:337 | quan hệ appointment → service_id: cần FK live |
| pages/admin/modules/complaints/complaints.js:337 | quan hệ appointment → staff_id: cần FK live |
| pages/admin/modules/complaints/complaints.js:2005 | support_ticket.insert: payload biến/hàm, cần lần ngược |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:784 | support_ticket.update: payload biến/hàm, cần lần ngược |
| pages/admin/modules/customers/customers.js:464 | quan hệ appointment → service_id: cần FK live |
| pages/admin/modules/customers/customers.js:464 | quan hệ appointment → staff_id: cần FK live |
| pages/admin/modules/customers/subtabs/tab-customer-profile.js:733 | customer_profile.update: payload biến/hàm, cần lần ngược |
| pages/admin/modules/customers/subtabs/tab-customer-profile.js:740 | customer_profile.insert: spread payload |
| pages/admin/modules/customers/subtabs/tab-customer-profile.js:756 | customer_address.insert: payload biến/hàm, cần lần ngược |
| pages/admin/modules/orders/subtabs/tab-order-detail.js:385 | sales_order.update: payload biến/hàm, cần lần ngược |
| pages/admin/modules/orders/subtabs/tab-order-detail.js:413 | return_request_detail.insert: payload biến/hàm, cần lần ngược |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1313 | sales_order_detail.insert: payload biến/hàm, cần lần ngược |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1440 | sales_order.update: payload biến/hàm, cần lần ngược |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1442 | sales_order.update: payload biến/hàm, cần lần ngược |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1482 | sales_order.update: payload biến/hàm, cần lần ngược |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1484 | sales_order.update: payload biến/hàm, cần lần ngược |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1619 | sales_order.update: payload biến/hàm, cần lần ngược |
| pages/admin/modules/orders/subtabs/tab-order-list.js:1621 | sales_order.update: payload biến/hàm, cần lần ngược |
| pages/admin/modules/orders/subtabs/tab-order-products.js:891 | product_variant.insert: payload biến/hàm, cần lần ngược |
| pages/admin/modules/orders/subtabs/tab-order-products.js:1004 | product_variant.insert: payload biến/hàm, cần lần ngược |
| pages/admin/modules/orders/subtabs/tab-order-products.js:1880 | quan hệ review → customer_id: cần FK live |
| pages/admin/modules/orders/subtabs/tab-order-promos.js:278 | voucher.update: payload biến/hàm, cần lần ngược |
| pages/admin/modules/pets/pets.js:398 | quan hệ appointment → service_id: cần FK live |
| pages/admin/modules/pets/pets.js:398 | quan hệ appointment → staff_id: cần FK live |
| pages/admin/modules/pets/pets.js:515 | quan hệ appointment → service_id: cần FK live |
| pages/admin/modules/pets/subtabs/tab-pet-list.js:1270 | pet_profile.insert: payload biến/hàm, cần lần ngược |
| pages/admin/modules/pets/subtabs/tab-pet-profile.js:643 | pet_profile.update: payload biến/hàm, cần lần ngược |
| pages/admin/modules/services/services.js:51 | appointment.update: spread payload |
| pages/admin/modules/services/services.js:330 | quan hệ appointment → customer_id: cần FK live |
| pages/admin/modules/services/services.js:330 | quan hệ appointment → pet_id: cần FK live |
| pages/admin/modules/services/services.js:330 | quan hệ appointment → service_id: cần FK live |
| pages/admin/modules/services/services.js:330 | quan hệ appointment → staff_id: cần FK live |
| pages/admin/modules/services/services.js:417 | quan hệ review → customer_id: cần FK live |
| pages/admin/modules/services/services.js:417 | quan hệ review → service_id: cần FK live |
| pages/admin/modules/services/services.js:417 | quan hệ review → appointment_id: cần FK live |
| pages/admin/modules/services/services.js:441 | quan hệ care_log → care_action_id: cần FK live |
| pages/admin/modules/services/subtabs/tab-service-bookings.js:752 | appointment.update: payload biến/hàm, cần lần ngược |
| pages/admin/modules/services/subtabs/tab-service-catalog.js:643 | service_price_matrix.insert: payload biến/hàm, cần lần ngược |
| pages/admin/modules/settings/settings.js:754 | quan hệ audit_log → staff_id: cần FK live |
| pages/admin/modules/settings/subtabs/tab-settings-banners.js:129 | banner.insert: payload biến/hàm, cần lần ngược |
| pages/admin/modules/settings/subtabs/tab-settings-banners.js:133 | banner.update: payload biến/hàm, cần lần ngược |
| pages/admin/modules/staff/subtabs/tab-staff-list.js:559 | quan hệ appointment → service_id: cần FK live |
| pages/admin/modules/staff/subtabs/tab-staff-list.js:559 | quan hệ appointment → pet_id: cần FK live |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:299 | staff_shift_request.insert: payload biến/hàm, cần lần ngược |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js:767 | staff_schedule.insert: payload biến/hàm, cần lần ngược |
| scripts/api/admin_settings.js:28 | banner.insert: payload biến/hàm, cần lần ngược |
| scripts/api/admin_settings.js:38 | banner.update: payload biến/hàm, cần lần ngược |
| scripts/api/api.js:528 | cart_item.insert: spread payload |
| scripts/api/api.js:670 | wishlist_item.insert: payload biến/hàm, cần lần ngược |
| scripts/api/api.js:699 | wishlist_item.insert: payload biến/hàm, cần lần ngược |
| scripts/api/api.js:801 | sales_order.insert: payload biến/hàm, cần lần ngược |
| scripts/api/api.js:813 | payment.insert: payload biến/hàm, cần lần ngược |
| scripts/api/api.js:835 | sales_order_detail.insert: payload biến/hàm, cần lần ngược |
| scripts/api/api.js:1169 | appointment.insert: payload biến/hàm, cần lần ngược |
| scripts/api/api.js:1258 | stock_reservation.insert: payload biến/hàm, cần lần ngược |
| scripts/api/api.js:1306 | care_log.insert: payload biến/hàm, cần lần ngược |
| scripts/api/api.js:1317 | care_log_media.insert: payload biến/hàm, cần lần ngược |
| scripts/api/api.js:1355 | review_response.insert: payload biến/hàm, cần lần ngược |
| scripts/api/api.js:1426 | pawpal_setting.upsert: payload biến/hàm, cần lần ngược |
| scripts/api/api.js:1469 | hotel_room.update: payload biến/hàm, cần lần ngược |
| scripts/api/api.js:1726 | return_request_detail.insert: payload biến/hàm, cần lần ngược |
| scripts/api/api.js:1761 | return_request.update: payload biến/hàm, cần lần ngược |
| scripts/api/api.js:1912 | support_ticket.update: payload biến/hàm, cần lần ngược |
| scripts/api/chat.js:71 | admin_copilot_history.insert: payload biến/hàm, cần lần ngược |
| scripts/api/chat.js:726 | quan hệ appointment → customer_id: cần FK live |
| scripts/api/chat.js:726 | quan hệ appointment → pet_id: cần FK live |
| scripts/api/chat.js:726 | quan hệ appointment → service_id: cần FK live |
| scripts/api/chat.js:726 | quan hệ appointment → staff_id: cần FK live |
| scripts/api/chat.js:797 | quan hệ sales_order → customer_id: cần FK live |
| scripts/api/chat.js:797 | quan hệ sales_order → shipping_address_id: cần FK live |
| scripts/api/chat.js:797 | quan hệ sales_order_detail → product_variant_id: cần FK live |
| scripts/api/chat.js:880 | quan hệ inventory → product_variant_id: cần FK live |
| scripts/api/chat.js:997 | quan hệ customer_membership → membership_tier_id: cần FK live |
| scripts/api/chat.js:1036 | quan hệ appointment → service_id: cần FK live |
| scripts/api/chat.js:1977 | chat_conversation.update: payload biến/hàm, cần lần ngược |
| scripts/api/customer_loyalty.js:47 | quan hệ customer_voucher → voucher_id: cần FK live |
| scripts/api/customer_profile_persistence.js:79 | customer_address.update: payload biến/hàm, cần lần ngược |
| scripts/api/customer_profile_persistence.js:80 | customer_address.insert: spread payload |
| scripts/api/customer_profile_persistence.js:95 | customer_address.update: spread payload |
| scripts/api/petService.js:558 | pet_profile.update: payload biến/hàm, cần lần ngược |
| scripts/api/petService.js:559 | pet_profile.insert: payload biến/hàm, cần lần ngược |
| scripts/shared/customer-booking.mjs:8 | appointment.update: payload biến/hàm, cần lần ngược |
| scripts/shared/data-loader.js:577 | quan hệ review → customer_id: cần FK live |
| scripts/shared/support-handler.js:257 | support_ticket.insert: payload biến/hàm, cần lần ngược |
