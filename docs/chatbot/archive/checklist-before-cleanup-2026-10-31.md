# Checklist chỉnh sửa chatbot Admin và chatbot khách hàng

## Tiến độ hiện tại — 31/10/2026

**Bổ sung sửa runtime Trợ lý AI ngày31/10:** đã đưa các dependency lịch sử/admission/gateway của API lênCloud, gồm136/141/146/147/149/151/153/154 và phần lịch sử139/benchmark143 cần thiết.37 kiểm tra Cloud SQL với quyền Admin/RLS đạt; rà soát24 tên RPC API/gateway động không còn thiếu. Vercel UI thật tải lịch sử và gửi câu hỏi số SKU dưới ngưỡng nhận200/ok, không gọi Gemini. Đây là smoke runtime, không đóng Gate2 hoặc nghiệm thu toàn diện các giai đoạn. [Bằng chứng và giới hạn](docs/chatbot/admin-copilot-runtime-repair-2026-10-31/README.md).

**Bổ sung sửa runtime Quy định và Trực chat ngày31/10:** đã áp140 cho trang quy định/counts/thư viện, cùng các hàm đọc Trực chat còn thiếu trích từ139 và142. Kiểm tra Cloud SQL với quyền authenticated Admin/RLS đạt cho sáu nhóm quy định, counts, thư viện, Inbox, transcript/đọc tiếp, nhân viên và chính sách điểm. Rà soát16 tên RPC literal trong ba module trình duyệt không còn thiếu. Smoke UI Vercel với phiên đăng nhập: bảng Quy định tải được, không có dòng lỗi tải; chưa chứng nhận mọi API/công cụ động hoặc thao tác ghi end-to-end. [Bằng chứng và giới hạn](docs/chatbot/admin-rules-runtime-repair-2026-10-31/README.md).

**Sửa runtime Trực chat trên Vercel ngày31/10:** Cloud thiếu hai RPC Inbox/hồ sơ mà giao diện đã gọi, gây404. Đã áp migration137, giữ quyền caller/RLS và hạn mức đọc. Endpoint trên website thật đã hết404, người chưa đăng nhập vẫn bị từ chối; kiểm thử UI offline PASS. Còn xác nhận danh sách bằng phiên Admin Vercel. [Bằng chứng](docs/chatbot/admin-inbox-runtime-repair-2026-10-31/README.md). Không đồng nghĩa Gate2 hoặc toàn bộ Production đã hoàn tất.

Đây là bảng tiến độ hiện hành; các ghi chú theo ngày phía dưới là lịch sử kiểm thử. Checkbox triển khai chính thức ở **mục16**. Mục3–15 là nhóm yêu cầu tham chiếu, không phải một lịch giai đoạn khác.

| Giai đoạn | Trạng thái thực tế | Đã làm và phần còn lại |
| --- | --- | --- |
| 0 — Baseline | Hoàn tất phạm vi chuẩn bị/local | Có kiểm kê, baseline, ngân sách và rollback; runtime Production đầy đủ còn ở phát hành |
| 1 — Quyền và hội thoại | Hoàn tất nghiệm thu local | Quyền/ownership, cạnh tranh, nháp, hội thoại; chưa coi mọi bản sửa đã triển khai Cloud |
| 2 — Nền tảng đọc | Local và Cloud runtime đã có; Gate2 mở | Đã áp các dependency đọc/admission của API hiện hành; còn giới hạn ingress trước Auth và tổng tải ngoài pool |
| 3 — Admin từng phân hệ | Đã triển khai local và smoke Cloud; G3.4 mở | Gateway hiện hành đã có trênCloud;37 kiểm tra SQL toàn registry và UI tra cứu đạt; còn oracle rộng, chất lượng model và nghiệm thu đầy đủ |
| 4 — Admin liên phân hệ | Đang làm; gateway153/154 đã lênCloud | Có2 luồng khách, bảng việc, so sánh thực thu và oracle cặp ngày; còn tổ hợp/phân nhóm/chỉ số khác, oracle tuần/tháng |
| 5 — Thông tin công khai | Đã có luồng chạy thật trên4000; đang hoàn thiện | Tìm FAQ, giới thiệu gói, giá, chuyển người; RPC đọc tối thiểu và158 đã ápCloud. Còn dữ kiện kinh doanh được xác nhận và chất lượng trả lời diện rộng; FAQ157 mới chuẩn bị/local |
| 6 — Tra cứu riêng theo danh tính | Chưa triển khai mới trong đợt này | Cần tra chính đơn/lịch/điểm/hồ sơ của mình sau xác minh; không mở bằng tên/SĐT/mã đơn đơn lẻ |
| 7 — Chất lượng và tài nguyên | Đã làm một phần xuyên suốt | Có test/quyền/cap và backoff30–60–120; chưa nghiệm thu model diện rộng, tổng tải, toàn bộ Rules/UI |
| 8 — Phát hành | Đã phát hành phần sửa runtime công khai; chưa hoàn tất | RPC tối thiểu+158 và server4000 đã chạy, đã thử giá/tư vấn trên browser; còn phát hành đầy đủ API/frontend Production, smoke hai phía và theo dõi |

**Nguyên tắc đã chốt:** Khách vãng lai được hỏi mọi thông tin **công khai** cần để tìm hiểu và sử dụng PawPal: dịch vụ, gói, giá, chuẩn bị, sản phẩm, tình trạng hàng/lịch được công bố, điểm/hạng theo chính sách, ưu đãi, đặt/mua, giao nhận, đổi trả và liên hệ. Không chặn câu hỏi chỉ vì có từ “Paw Points”, “mã đơn”, “còn hàng” hoặc là khách vãng lai. Dữ liệu cá nhân/giao dịch của user và dữ liệu Admin/nội bộ chưa công khai vẫn cần đúng quyền/xác minh. Chưa có nguồn xác nhận thì nói rõ điều chưa biết và hướng tiếp tục; đó là thiếu dữ liệu, không phải cấm guest hỏi.

**Bằng chứng hiện có:** [Sửa runtime4000](docs/chatbot/runtime-repair-2026-10-30/README.md), [tư vấn dịch vụ trên web](docs/chatbot/stage5-service-guidance-2026-10-30/README.md), [rà92 FAQ](docs/chatbot/stage5-faq-review-2026-10-30/README.md). Không dùng testlocal để suy mọi luồng đã đạt Production.

**Đợt nới phân tuyến theo chỉ đạo người dùng:** Đã kiểm tra guest hỏi khái niệm điểm/cách tra cứu/còn hàng bằng API offline có fixture và model stub, giữ chặn số dư/hồ sơ riêng;266 kiểm tra offline và40 ca nghiệp vụ đạt. Web4000 hỏi “Giá tắm và cắt tỉa”, “So sánh giá Hotel” trả nguồn thật. Không thêm Gemini, migration hoặc quyền trong đợt này. [Phạm vi và kiểm chứng](docs/chatbot/guest-public-scope-2026-10-30.md).

### Nhật ký các đợt trước

**Sửa tư vấn bị chặn bởi FAQ dài —30/10:** Đã sửa planner/formatter giới thiệu tối đa5 gói active từ catalog cho nhóm tắm/cắt tỉa/Hotel/Taxi;không gọi FAQ/model cho câu giới thiệu.158 đã ápCloud chỉ thay2 hàm đọc: loại FAQ bị cắt, giữ mục đầy đủ, không chặn cả câu khi còn nguồn hoàn chỉnh. Bỏ lời đáp kỹ thuật ra khỏi luồng khách. Đã thử đúng “Tư vấn dịch vụ tắm và cắt tỉa” trên web4000: có gói/thời lượng và hỏi thêm nhu cầu bé.5 nhóm tích hợp mới,264 offline+40 nghiệp vụ đạt;clone dọn, không thêm Gemini. [Bằng chứng](docs/chatbot/stage5-service-guidance-2026-10-30/README.md). Code chưa push;chưa coi toàn bộ chatbot đạt nghiệm thu.

**Đã sửa503 trên web4000 —30/10:** Đã ápCloud gói đọc tối thiểu:5 RPC dữ liệu service-only,2 helper văn bản,1 helper admission,3 index;không sửa FAQ/khách/đơn/lịch hoặc áp toàn bộ135–157. Nạp lại server4000 sau xác minh đúng tiến trình. Trình duyệt thật hỏi giá Hotel/Taxi/tắm đều có trả lời, request mới200, ô nhập xóa đúng. Sửa đọc nền30 giây/backoff30–60–120, thiếuRPC dừng tự đọc và giữ draft;Chrome/hồi quy262 kiểm tra offline+40 nghiệp vụ đạt. [Gói sửa, ảnh và rollback](docs/chatbot/runtime-repair-2026-10-30/README.md). Các mốc “chưa ápCloud/chưa đạt4000” bên dưới là lịch sử trước đợt sửa;FAQ157 và phần khác vẫn chưa áp, chưa nghiệm thu toàn bộ chatbot.

**Kiểm tra web4000 thực tế30/10 — CHƯA ĐẠT:** Trang/khung chat mở được, nhưng gửi “Giá Pet Hotel” nhận503, không có trả lời; draft được giữ. Probe chỉ đọc read_public_chat_rules và read_public_chat_catalog trảPGRST202 từ backend theo cấu hìnhlocal. Chưa ápCloud;không suy từ testlocal rằng bản4000 đã hoạt động. Đã lưu ảnh, đóng khung để ngừng polling lỗi10 giây và dọn clone chuẩn bị. [Bằng chứng và bước cần làm](docs/chatbot/stage5-browser-2026-10-30/README.md).

**Tiếp tục30/10 — FAQ bị cắt:** SQL155 trả cờ incomplete khi câu hỏi/answer bị cắt hoặc FAQ bị bỏ vì trần16KB;API yêu cầu cờ boolean và không đưa đoạn trích thiếu sang model. Lưu lời hỏi rõ/gặp nhân viên với understood=false, không đọc lại nguồn hoặc tăng trần bytes.20 nhóm tích hợp công cụ và7 nhóm FAQ chạy lại đạt;18 FAQ đã rà vẫn có nguồn đầy đủ.261 kiểm tra offline,40 ca nghiệp vụ đạt;hai môi trường thử đã dọn. Xem [điều kiện đầy đủ của FAQ](docs/chatbot/stage5-public-search-2026-10-30/context-completeness.md). Chưa push/áp Cloud;G5.2 vẫn còn dữ kiện kinh doanh chưa được xác nhận.

**Mới nhất30/10 — G5.2:** Đã rà92 FAQ baseline local, chuẩn bị157 sửa15 câu/tắt1 QA/thêm3 hướng dẫn có nguồn;18 mục active sau sửa truy xuất đúng qua RPC. Sửa CRLF guard150/152, ưu tiên FAQ trùng nguyên văn trong155 và nhận diện đúng yêu cầu nói chuyện trực tiếp với nhân viên.7 nhóm tích hợp FAQ mới và17 nhóm tìm kiếm/catalog/chuyển giao chạy lại đạt;259 kiểm tra offline,40 ca nghiệp vụ đạt. Môi trường đã dọn. [Bằng chứng và dữ kiện còn thiếu](docs/chatbot/stage5-faq-review-2026-10-30/README.md). Các thay đổi mới vẫn local, chưa áp Cloud.

**Git 29/10/2026:** Người dùng yêu cầu push mã đã hoàn thành rồi tiếp tục giai đoạn4. Đợt này gom thay đổi144–154 và mã giai đoạn4 trên nhánh feat/guest-admin-identity; không áp migration Cloud. Các mô tả chưa push trong hồ sơ bên dưới là mốc kiểm thử trước đợt đồng bộ mã này.

**G4.1/G4.4 bổ sung ngày29/10:** Đã có khách → hồ sơ thú cưng và đơn được tạo mới nhất, cùng UUID đã xác định, tối đa3 nguồn. Thú cưng gồm mọi trạng thái, trả tổng/tối đa10 dòng;đơn theo created_at/UUID, không suy thanh toán/giao hàng.154/rollback đạt8 nhóm SQL/Auth/JWT/REST/API thật;242 kiểm tra offline,40 ca nghiệp vụ và Chrome đạt. Môi trường thử đã dọn. [Bằng chứng](docs/chatbot/stage4-customer-commerce-2026-10-29/README.md). Chưa push/áp Cloud.

**G4.3/G4.4 ngày29/10:** Đã có bảng kiểm tra đơn hủy thu nhiều hơn hoàn và lịch confirmed chưa phân công cả ca/hạng mục.2 nguồn hiện có, không dùng model;đơn lấy toàn bộ tồn đọng, kỳ chỉ lọc lịch, không kết luận SLA/quá hạn hoặc khoản hoàn đã duyệt.7 nhóm SQL/Auth/JWT/REST/API thật,233 kiểm tra offline,40 ca nghiệp vụ và Chrome đạt. Môi trường thử đã dọn;không có migration mới. [Bằng chứng](docs/chatbot/stage4-pending-2026-10-29/README.md). Chưa push/áp Cloud.

**G4.1/G4.4 ngày29/10:** Đã có local luồng một khách → lịch sắp tới/vừa qua gần nhất và phiếu còn mở gắn trực tiếp khách. Xác định UUID duy nhất rồi đọc quan hệ, không ghép tên/điện thoại trùng; tổng3 nguồn hoặc2 nếu thiếu quyền phiếu. Migration153/rollback,8 nhóm SQL/Auth/JWT/REST/API thật và223 kiểm tra offline đạt;40 ca nghiệp vụ và kiểm tra Chrome đạt. Môi trường thử đã dọn. [Phạm vi và bằng chứng](docs/chatbot/stage4-customer-case-2026-10-29/README.md). Chưa push/áp Cloud.

**Bắt đầu giai đoạn4 ngày29/10 theo yêu cầu người dùng:** Đã triển khai local so sánh thực thu ngày/tuần/tháng này với kỳ trước theo phần thời gian đã trôi qua;2 nguồn có quyền, không dùng model tính số. Một nguồn lỗi trả kết quả từng phần có nhãn, không tính chênh lệch.214 kiểm tra offline và40 ca nghiệp vụ đạt. [Phạm vi, công thức và bằng chứng](docs/chatbot/stage4-compare-2026-10-29/README.md). G4.1/G4.3 chưa làm;G4.2/G4.4 mới có luồng này, Gate2/G3.4 còn mở.

**Ma trận G3.4 mở rộng ngày29/10:** 28 công cụ nghiệp vụ được kiểm tra có dấu/không dấu, dữ liệu rỗng, từng quyền cơ sở và lỗi nguồn;118 nhóm mới đạt. Đã sửa “Thanh toán đơn” thiếu mã đi nhầm FAQ và chặn trường số hỏng thành0/NaN ở formatter nhóm mới. Tổng203 kiểm tra offline và40 ca nghiệp vụ đạt. Không thêm query/Gemini/Cloud. [Kết quả và giới hạn](docs/chatbot/stage3-matrix-2026-10-29/README.md).

**Hotel sau152 đã kiểm tra ngày29/10:** Đã chạy đúng1 lượt được đồng ý riêng, đạt PASS_SAMPLE: nêu rõ thiếu giá/sức chứa/tiện ích, không bịa chênh lệch, chỉ cách đối chiếu danh mục. Các mẫu đại diện đặt lịch, nhóm C và Hotel sau sửa đều đã có kết quả đạt; không chứng nhận toàn bộ ma trận. 85 kiểm tra offline đạt, môi trường thử đã dọn. [Bằng chứng](docs/chatbot/stage3-hotel-model-2026-10-29/README.md). Chưa push/áp Cloud.

**Đánh giá model 29/10:** Đã chạy đúng3 lượt mới được đồng ý: đặt lịch và nhóm C đạt trong mẫu, Hotel chưa hữu ích nên kết luận PARTIAL. Đã sửa nguồn FAQ Hotel bằng152 và rollback, đạt7 nhóm SQL local; chưa gọi model sau sửa. 84 kiểm tra offline đạt, môi trường thử đã dọn. [Phản hồi, tiêu chí và giới hạn](docs/chatbot/stage3-model-review-2026-10-29/README.md). Không có lượt ngoài phạm vi được duyệt; chưa push/áp Cloud.

**Hoàn thiện hai phần FAQ 29/10:** Đã sửa FAQ đặt lịch bằng migration150 và bổ sung3 FAQ nhóm C bằng migration151 trong bảng nội bộ riêng, khách không đọc được. 7 nhóm SQL/Auth/JWT/REST tích hợp đạt, ngoài7 nhóm kiểm tra150 trước đó; 82 kiểm tra offline và40 ca nghiệp vụ hồi quy đạt. Môi trường thử đã dọn. [Nội dung, quyền và bằng chứng](docs/chatbot/stage3-faq-internal-2026-10-29/README.md). Phần FAQ local hoàn tất; chưa push/áp Cloud, G3.4 còn đánh giá model và nghiệm thu triển khai.

**FAQ đặt lịch 29/10 — G3.4:** Đã có migration150 và rollback phân biệt guest/member, kiểm tra nội dung cũ trước khi sửa, không bật lại FAQ tắt hoặc ghi đè FAQ đã chỉnh. 7 nhóm PostgreSQL local đạt, môi trường riêng đã dọn. Không tăng truy vấn mỗi câu hỏi, không gọi thêm Gemini. [Bằng chứng](docs/chatbot/stage3-faq-2026-10-29/README.md). FAQ Cloud chưa đổi; G3.4 còn mở.

**Tiếp tục 29/10 — G3.4:** Giữ dữ liệu nghiệp vụ đã tra cứu khi thiếu FAQ hoặc bước soạn AI không sẵn sàng/trả bản nháp rỗng, nêu rõ phần chưa hoàn tất và đưa đường mở phân hệ. Không đọc lại nguồn/gọi lại model; giữ trần 3 nguồn kể cả lịch sử. 81 kiểm tra offline và 40 ca nghiệp vụ đạt; liên kết giao diện đã kiểm chứng ở đợt trước. Lỗi quyền, nguồn và lưu vẫn báo lỗi. [Bằng chứng và giới hạn](docs/chatbot/stage3-staff-2026-10-28/partial-guidance-2026-10-29.md). G3.4 vẫn mở.

**Cập nhật 29/10 — G3.4:** Đã đối chiếu mã nguồn đặt lịch vãng lai/thành viên và soạn FAQ đề xuất; bổ sung chỉ dẫn model nêu rõ phần thiếu thông tin, không áp quy định sai đối tượng; chặn sinh hướng dẫn từ FAQ rỗng. 56 kiểm tra chatbot và 16 kiểm tra guest offline đạt, cùng 40 ca nghiệp vụ hồi quy. Không thêm lượt đọc database hoặc gọi Gemini; FAQ Cloud chưa cập nhật, chất lượng model thật vẫn PARTIAL. [Chi tiết và việc còn lại](docs/chatbot/stage3-staff-2026-10-28/faq-audience-review-2026-10-29.md).

Ngày lập:28/10/2026. Cập nhật:30/10/2026. Trạng thái: **Đang hoàn thiện giai đoạn5 theo phạm vi công khai rộng. Có web4000 hoạt động cho giá Hotel/Taxi/tắm và giới thiệu gói, đã ápCloud gói RPC đọc tối thiểu và158;không có nghĩa toàn bộ135–158 đã áp hoặc frontend/API Production đã đồng bộ. G4,Gate2,G3.4 còn mở;G6 chưa triển khai mới;G7/G8 đã làm một phần. FAQ157 và nguồn chính sách/giờ/địa chỉ xác nhận còn riêng. Xem bảng đầu tài liệu và checkbox mục16 để biết trạng thái hiện hành;không đọc các số test/mốc “chưa ápCloud” cũ như trạng thái mới nhất.**

**Kết quả giai đoạn 1:** [Hồ sơ nghiệm thu và giới hạn](docs/chatbot/stage1-acceptance-2026-10-28/README.md). Có 13 nhóm Auth/API/UI/WebSocket thật local, 12 nhóm SQL cạnh tranh/quyền, sửa P0 cộng dồn điểm 50/200 mỗi ca, bảo vệ dữ liệu model và composer đóng ca. Trạng thái đạt bên dưới áp dụng cho bộ nghiệm thu local, không phải chứng nhận Production hoặc chất lượng Gemini thật.

**Tiến độ ngày 28/10:** Đã đo transcript guest/member bằng Auth/API/widget thật trên local riêng, workload 20 mẫu/2 tác vụ, snapshot pool Cloud một lần và chốt ngân sách thiết kế bảo thủ; đã dọn fixture/DB/container riêng. Tất cả nhóm Admin vẫn bắt buộc. [Hồ sơ và giới hạn Gate 0](docs/chatbot/stage0-2026-10-28/README.md). Khả năng chịu tải Production, enforcement dùng chung, full ma trận ghi và runtime marker vẫn là điều kiện các giai đoạn sau, chưa được tính PASS.

**Bổ sung phạm vi theo đối tượng:** Xem mục 12–16. Phạm vi đích bao phủ các phân hệ nghiệp vụ và câu hỏi kết hợp, không chỉ các intent hiện có. Các giai đoạn phía trên là thứ tự triển khai; không phải giới hạn chức năng cuối cùng.

**Điều kiện bắt buộc cho mọi giai đoạn:** Tuân thủ ngân sách database và băng thông tại mục 17. Không mở rộng năng lực hoặc phát hành khi chưa có số đo và giới hạn thực thi tương ứng. Ưu tiên truy vấn có phạm vi, dữ liệu gọn và tái sử dụng kết quả hợp lệ.

## 1. Mục tiêu và phạm vi

- Admin tra cứu đúng dữ liệu, đúng quyền; hỗ trợ nhân viên xử lý hội thoại an toàn.
- Khách hàng được tư vấn đúng thông tin, chuyển nhân viên rõ ràng và từng bước tra cứu dữ liệu của chính mình.
- Giảm truy vấn lặp, dữ liệu truyền và ngữ cảnh AI; duy trì Supabase là nguồn dữ liệu nghiệp vụ duy nhất.
- Không mở thêm quyền cho AI tự cộng điểm, hoàn tiền, đặt lịch, tạo đơn, chuyển ca hoặc gửi tin thay nhân viên.
- Ảnh/tệp, camera, gửi Zalo/SMS/email thật và tự động phân công nhân viên nằm ngoài đợt đề xuất này.
- Luồng đặt lịch/mua hàng qua chat chỉ hướng dẫn hoặc dẫn đến màn hình nghiệp vụ hiện có; chưa tạo giao dịch ngay trong chat.

Các ô bên dưới là công việc cần thực hiện hoặc xác minh lại. Chức năng đã tồn tại sẽ được giữ và kiểm thử hồi quy, không mặc định viết lại. Tài liệu cũ có thông tin khác nhau về schema, quyền, SLA và trạng thái deploy; phải đối chiếu nguồn đang chạy trước khi sửa.

## 2. Hiện trạng làm cơ sở

| Khu vực | Đã thấy trong nguồn/bằng chứng | Khoảng trống cần xử lý |
|---|---|---|
| Trợ lý Admin | RPC tra cứu theo quyền; số liệu không qua mô hình tự đếm; lịch sử theo nhân viên | Hiểu câu hỏi còn phụ thuộc từ khóa; bộ lọc/ngữ cảnh chưa đầy đủ; thiếu nghiệm thu bản deploy mới |
| Trực chat Admin | Nhận ca, gửi tin, ghi chú, chuyển, hoàn tất, đánh giá; Realtime | Cần khép kín kiểm thử cạnh tranh, quyền và toàn chuỗi hai giao diện |
| Chat khách | Thành viên/khách vãng lai; FAQ và 8 tin gần nhất; chuyển nhân viên và cơ chế đếm lượt không hiểu | Chưa tra cứu đơn/lịch/điểm cá nhân; nạp tối đa 500 FAQ/lượt; polling 10 giây |
| Quy định | FAQ, bộ lọc, câu mẫu, chính sách, ma trận kiểm tra | Cần xác minh CRUD, xung đột, quyền và phạm vi engine thực sự sử dụng |
| Vận hành | Có bằng chứng Cloud và test offline từng phần | Chưa có baseline đầy đủ p50/p95, request/bytes và chất lượng Gemini thật |

Nguồn active cần theo dõi: `api/admin-chat.js`, `api/chat.js`, `scripts/api/admin_copilot.js`, `scripts/api/chat_moderation.js`, `scripts/api/chat_understanding.js`, `components/fab/fab.js` và `pages/admin/modules/chatbot/`.

Không dùng kết quả test `scripts/api/chat.js` cũ để thay cho kiểm thử gateway hiện tại. Không khôi phục ba tài liệu đang được Git ghi nhận xóa nếu chưa thuộc yêu cầu riêng.

## 3. Nhóm yêu cầu baseline và khả năng khôi phục

**P0 — thực hiện trước mọi thay đổi backend.**

- B01 — Ghi branch, SHA, thay đổi chưa commit, URL local/test/Production và phiên bản API/frontend đang phục vụ.
- B02 — Lập bản đồ frontend → endpoint active → RPC → bảng → quyền cho từng luồng của hai chatbot.
- B03 — Đối chiếu schema/grants/RLS/body RPC thực tế; xác minh migrations 109, 124, 125, 126 và cấu hình SLA hiện hành từ nguồn thật.
- B04 — Đối chiếu tài liệu cũ với status, thang cảm xúc, chính sách điểm và chuyển giao hiện tại; ghi rõ chỗ mâu thuẫn trước khi chọn cách sửa.
- B05 — Lưu định nghĩa/schema/quyền liên quan và hướng dẫn rollback cho phạm vi thay đổi; không chạy lại toàn bộ migration cũ.
- B06 — Chạy bộ offline active làm baseline; chuẩn bị fixture riêng cho thành viên, guest, hai nhân viên và hai khách khác nhau.
- B07 — Đo request, bytes và thời gian các luồng mở chat, gửi, nhận tin, đổi ca, tra cứu và mở Rules. Phân biệt HTTP request, DB statement và token AI.

**Điều kiện đóng:** Có danh sách nguồn active, môi trường, quyền, bằng chứng baseline và cách khôi phục. Không coi API trả 401 là bằng chứng bản deploy trùng mã local.

## 4. Nhóm yêu cầu quyền, đúng đối tượng và toàn vẹn dữ liệu

**P0 — ưu tiên cao nhất.**

- S01 — Thành viên A không đọc/gửi/đánh giá/đổi chế độ hội thoại B; guest không truy cập hội thoại guest khác hoặc thành viên.
- S02 — Xác minh quyền qua API và DB: guest, khách, nhân viên trực chat, người nhận ca, nhân viên không phụ trách và quản trị.
- S03 — Các modal ghi theo ca giữ đúng ID ca/khách/phiên bản khi mở; đổi ca trước xác nhận bị chặn; không chọn ngầm ca đầu tiên.
- S04 — Request khác ID cạnh tranh cùng revision cho tiếp nhận/chuyển/hoàn tất: một thắng và một conflict; cùng ID retry vẫn được xác nhận.
- S05 — Retry gửi tin, tạo khiếu nại, chuyển ca, điều chỉnh điểm và đánh giá không tạo bản ghi hoặc cộng điểm trùng; requestId dùng với payload khác bị từ chối.
- S06 — Ghi chú riêng và nguyên văn hạn chế không xuất hiện trong response khách hoặc nhân viên thiếu quyền; đọc nguyên văn hợp lệ có audit.
- S07 — Nhân viên A không đọc/xóa nội dung phiên trợ lý của B; ID sai/thiếu quyền/bị khóa được kiểm tra server. Xóa session người khác có thể no-op, không coi là luôn trả403.
- S08 — Rà và thêm redaction ở model boundary cho trường/mẫu nhạy cảm đã nhận diện, có test payload không token/key/raw. Không tuyên bố nhận diện hoàn hảo mọi PII tự do; xem giới hạn báo cáo.
- S09 — Renderer thật escape HTML độc hại; test injection không tạo SQL/công cụ ghi hoặc vượt quyền trong đường facts. Chất lượng Gemini thật nghiệm thu riêng ở giai đoạn sau.

**Điều kiện đóng:** Ma trận quyền có kết quả thực tế; không có ghi sai khách/ca, lộ dữ liệu hoặc nhân đôi tác vụ. Test thiếu bằng chứng vẫn để chưa hoàn tất.

## 5. Nhóm yêu cầu hội thoại và chuyển nhân viên

**P1 — hoàn thiện luồng đang có trước khi mở rộng.**

- [x] L01 — Phân trang/tìm kiếm/cache và chuyển filter qua server đạt ở bộ UI offline; loading/trống/lỗi phân biệt, không chọn ngầm ca. Thiếu quyền kiểm trong ma trận API/SQL.
- [x] L02 — Chuỗi guest UI → tiếp nhận → trả lời → chuyển người → trả lời → hoàn tất → CSAT đạt với JWT/API/DB thật local.
- [x] L03 — Người cũ bị chặn bằng JWT thật; note riêng không xuất hiện public; WebSocket thật cập nhật inbox khi có thay đổi. Không suy mọi vai trò/subscription Production đã nghiệm thu.
- [x] L04 — SLA server 300 giây và resume xóa hạn đạt local; display suite 5 test và bộ SQL109 đã lưu bao phủ retry/0 giây/quá hạn. Không thêm cấu hình mặc định vào Cloud.
- [x] L05 — API local ba lượt không hiểu handoff/resume reset; bộ signal/context và SQL125 đã lưu bao phủ reset hữu ích, retry và cô lập ca. Không dùng kết quả này để chấm chất lượng Gemini thật.
- [x] L06 — Timeout 30 giây và lỗi mạng giữ nội dung/requestId; chặn gửi lặp khi pending; không có retry tự động.
- [x] L07 — Reload cùng tab khôi phục một pending request đúng danh tính/TTL, không auto-send; bấm retry dùng ID cũ để server đối soát. Không lưu lịch sử vào localStorage, không hứa khôi phục khi đóng tab/máy khác.
- [x] L08 — Composer guest khóa khi resolved/closed/completed/blocked, Admin UI/API/SQL chặn sau đóng; đổi danh tính reset trạng thái cũ.
- [x] L09 — 10 vòng ba tab không tăng channel/interval ở acceptance local; handler init/dedup và cache có hồi quy offline; clone/container test đã dọn.

**Điều kiện đóng:** Toàn chuỗi chạy với tài khoản thật trên môi trường kiểm thử, có đối chiếu UI/API/DB và xác minh dọn fixture.

## 6. Nhóm yêu cầu chất lượng chatbot khách hàng

**P1 — triển khai theo thứ tự K01 → K04, rồi mới mở tra cứu cá nhân.**

- K01 — Thay nạp tối đa 500 FAQ bằng tìm kiếm server chọn các mục liên quan. Tận dụng RPC/search hiện có sau khi kiểm tra quyền, không cấp RPC Admin trực tiếp cho khách.
- K02 — Giới hạn số mục và tổng độ dài FAQ/ngữ cảnh; đo bytes/token trước và sau; không có kết quả thì hỏi làm rõ hoặc chuyển nhân viên.
- K03 — Giá/gói dịch vụ phải lấy từ nguồn đang có hiệu lực; nếu FAQ chỉ là thông tin tham khảo thì không diễn đạt thành báo giá cá nhân đã xác nhận.
- K04 — Trả lời tự nhiên, không lộ tên bảng/RPC/SQL, không hứa đã kiểm tra hồ sơ hoặc tạo yêu cầu khi chưa thực hiện.
- K05 — Bổ sung tra đơn của chính thành viên: mã đơn, trạng thái và giao nhận theo dữ liệu thực. Không cho tra bằng số điện thoại hoặc mã đơn đơn lẻ để vượt quyền sở hữu.
- K06 — Bổ sung tra lịch hẹn của chính thành viên: ngày giờ, dịch vụ, thú cưng và trạng thái; thiếu thông tin thì hỏi chọn lịch.
- K07 — Bổ sung xem Pawpoint/hạng và thú cưng của chính thành viên nếu schema và quyền hỗ trợ; chỉ trả trường cần thiết.
- K08 — Guest hỏi dữ liệu giao dịch: chuyển sang cơ chế xác minh đã có hoặc đăng nhập; nếu chưa có cơ chế hợp lệ thì chuyển nhân viên, không tự dựng xác thực yếu.
- K09 — Chỉ đường đến màn hình đặt lịch/mua hàng có sẵn, giữ lựa chọn phù hợp nếu luồng hiện tại hỗ trợ; không báo đã đặt/tạo đơn từ câu tư vấn.
- K10 — Test đổi tài khoản/đăng xuất/phiên hết hạn: không mang hội thoại, kết quả tra cứu hoặc nháp của tài khoản trước sang tài khoản sau.

**Điều kiện đóng:** Mỗi chức năng cá nhân có test đúng chủ sở hữu, chặn khách khác, dữ liệu thay đổi và trạng thái không tìm thấy; số liệu lấy từ Supabase, không từ mô hình suy đoán.

## 7. Nhóm yêu cầu trợ lý Admin và kho quy định

**P1.**

- A01 — Lập bộ câu hỏi thực tế và cách diễn đạt tương đương cho lịch, tồn kho, đơn, khách, khiếu nại, giá, thực thu và tri thức.
- A02 — Mỗi ý định định lượng có SQL oracle độc lập; kiểm tra tổng, giới hạn danh sách, trạng thái, ngày Việt Nam và lịch nhiều dịch vụ.
- A03 — Câu ngoài bộ lọc hỗ trợ phải yêu cầu làm rõ; không bỏ qua điều kiện khách nói rồi trả số của phạm vi khác.
- A04 — Mở rộng ngữ cảnh nhiều lượt có kiểm soát: kế thừa ngày/nhóm dịch vụ/đối tượng đúng; không trộn phiên hoặc quyền nhân viên.
- A05 — Lỗi DB/quyền/timeout không biến thành 0; bản nháp không được ghi là đã gửi; phản hồi số liệu thể hiện phạm vi và thời điểm phù hợp.
- A06 — CRUD FAQ/bộ lọc/câu mẫu: lưu/đọc lại, bật/tắt, xóa, thiếu quyền, lỗi mạng và hai người cùng sửa.
- A07 — Phân biệt rule đã có engine thực thi với cấu hình chưa hỗ trợ; không hiển thị tự phân công hoặc xử lý thành công khi chỉ mới lưu cấu hình.
- A08 — Benchmark tách đạt/không đạt/chờ; tình huống cần công cụ chưa có vẫn chờ; không dùng điểm benchmark để suy ra chất lượng Gemini.
- A09 — Đánh giá bản nháp Gemini thật bằng tình huống ẩn danh: đúng vấn đề, đúng chính sách, hành động tiếp theo hữu ích và không hứa bồi hoàn.

**Điều kiện đóng:** Các câu định lượng trong bộ nghiệm thu khớp oracle 100%; chất lượng câu trả lời sinh bằng AI được đánh giá riêng bởi người duyệt.

## 8. Nhóm yêu cầu băng thông, độ ổn định và giao diện

**P1 cho tài nguyên/ổn định; P2 cho hoàn thiện trình bày.**

- P01 — Thiết kế cập nhật chat khách cho cả guest và thành viên: sự kiện chỉ báo thay đổi theo quyền rồi đọc API; không mở quyền đọc trực tiếp bảng để có Realtime.
- P02 — Khi kênh khỏe, tránh polling song song; khi mất kênh dùng backoff; dừng khi chat đóng/tab ẩn và cleanup khi rời trang. Nếu guest chưa có kênh an toàn, giữ polling có điều kiện và ghi rõ giới hạn.
- P03 — Dùng revision/cursor để tránh tải lại toàn lịch sử; debounce, gộp sự kiện và chia sẻ request đang chạy; cache tách theo danh tính/quyền và vô hiệu hóa khi đổi tài khoản.
- P04 — Đánh giá hạn mức dùng chung phía server thay Map theo tiến trình; chặn spam mở phiên/gửi/AI mà không làm người dùng hợp lệ bị ảnh hưởng hàng loạt.
- P05 — Đo p50/p95, tỷ lệ lỗi, request/bytes/token với cùng kịch bản trước/sau; thử đồng thời có giới hạn trên môi trường test, không stress Cloud thật.
- U01 — Rà toàn bộ ba tab Admin theo AGENTS.md: text-only ngoài sidebar, tiếng Việt, Sentence case, bo góc 9px, màu/surface, phân trang và modal.
- U02 — Rà loading/trống/lỗi/thiếu quyền; bàn phím, focus modal, Escape và không mất nháp khi lỗi.
- U03 — Kiểm tra desktop 1366/1440/1920, zoom 125% và chat khách 390px; không tràn/cắt nút hoặc nội dung.
- U04 — Chỉ dọn CSS phụ/inline và mã cũ sau kiểm tra dependency; giữ ID/event hook nghiệp vụ đang dùng.

**Điều kiện đóng:** Có bảng đo so sánh, không suy tổng egress từ số SQL; không rò phiên/cache, tăng channel/timer hoặc làm sai luồng sau tối ưu.

## 9. Thứ tự triển khai tổng hợp

| Giai đoạn | Phạm vi | Điều kiện chuyển giai đoạn |
|---|---|---|
| 0 | Baseline và ma trận năng lực ba nhóm | Nguồn active, quyền, bộ câu hỏi và rollback rõ ràng |
| 1 | Quyền, hội thoại và khả năng tiếp tục khi lỗi | Không còn P0; chuyển nhân viên và retry đúng |
| 2 | Nền tảng hiểu câu hỏi và gọi công cụ đọc | Hiểu câu biến thể, tham số/quyền được server kiểm tra |
| 3 | Admin tra cứu từng phân hệ | Các năng lực ưu tiên có dữ liệu đúng và SQL oracle |
| 4 | Admin hỏi liên phân hệ, so sánh và đối soát | Kết hợp nguồn không đếm trùng, có định nghĩa chỉ số |
| 5 | Khách vãng lai: tư vấn công khai | Thông tin/giá đúng nguồn; không lộ dữ liệu nội bộ |
| 6 | Thành viên và guest đã xác minh: tra cứu riêng | Đúng chủ sở hữu, không ghép hồ sơ sai |
| 7 | Hoàn thiện Rules, tài nguyên và giao diện | Chất lượng, quyền và ngân sách tài nguyên đạt |
| 8 | Nghiệm thu và phát hành từng nhóm năng lực | Đối chiếu bản deploy, hồi quy và rollback đầy đủ |

Sửa lỗi UI chặn thao tác và chặn lộ dữ liệu được đưa lên ngay trong đợt liên quan. Chưa ước lượng ngày công trước khi hoàn tất baseline.

## 10. Checklist nghiệm thu và bàn giao

- D01 — Mỗi test ghi mã mục, môi trường/SHA, vai trò, expected/actual, kết quả và bằng chứng đã che dữ liệu cá nhân.
- D02 — Tách rõ test offline, SQL rollback, Auth/API thật, Realtime và E2E hai giao diện; không thay thế kết quả giữa các loại.
- D03 — Test DB dùng fixture riêng và rollback khi phù hợp; xác minh không còn dữ liệu thử. Các lượt commit có kế hoạch dọn và giữ audit theo thiết kế.
- D04 — Lỗi phát hiện có mức P0/P1/P2 và test tái hiện; sau sửa chạy lại nhóm liên quan và smoke test hai chatbot.
- D05 — Không có dữ liệu mock/JSON fallback trong đường nghiệp vụ; trống hiển thị trống, lỗi hiển thị lỗi.
- D06 — Trước phát hành: đối chiếu migration/API/frontend tương thích, biến cấu hình và quyền; chuẩn bị bản thay đổi cụ thể để duyệt triển khai.
- D07 — Sau phát hành: xác minh đúng SHA/phiên bản, smoke test tài khoản kiểm thử, nhận/gửi/chuyển/đóng và một truy vấn số liệu có oracle.
- D08 — Bàn giao danh sách đã đạt, chưa đạt, ngoài phạm vi, chỉ số trước/sau, giới hạn còn lại và hướng dẫn rollback theo từng đợt.

**Tiêu chí chốt:** Không còn lỗi P0/P1 trong phạm vi phát hành; số liệu định lượng đúng oracle; không ghi sai/trùng hoặc lộ dữ liệu; không tuyên bố hoàn tất các hạng mục chưa có bằng chứng.

## 11. Bằng chứng tham chiếu hiện có

- `docs/acceptance/PAWPAL_CHATBOT_V1_NGHIEM_THU.md`: phạm vi V1 và các kiểm tra ngày 22/10.
- `docs/chatbot/test-evidence.md`: kiểm tra nghiệp vụ Admin và giới hạn bằng chứng ngày 25/10.
- `docs/verification/sync/chat-and-reviews.md`: chuyển giao, quyền, Auth và Realtime từng phần.
- `docs/verification/sync/chat-sla.md`: SLA và cập nhật cấu hình 5 phút.
- `docs/verification/sync/chat-unhandled-125-cloud-apply.txt`: bằng chứng áp migration đếm lượt không hiểu.
- `docs/verification/sync/copilot-extended-126-cloud-apply.txt`: bằng chứng áp RPC tra cứu mở rộng.

Các bằng chứng này là đầu vào lập kế hoạch, không tự đóng bất kỳ ô nghiệm thu nào của đợt chỉnh sửa mới.

## 12. Phạm vi đích theo ba nhóm người dùng

Đây là phạm vi **đề xuất phát triển**, không phải danh sách chức năng đã hoàn thành. Admin được hiểu là người đang làm việc trong cổng quản trị; dữ liệu trả về vẫn phụ thuộc quyền thực tế của từng nhân viên, chi nhánh và đối tượng phụ trách nếu hệ thống có áp dụng. Chức danh hoặc nội dung người dùng tự khai không cấp thêm quyền.

| Nhóm thông tin | Admin có quyền | Khách vãng lai | Khách thành viên |
|---|---|---|---|
| Cửa hàng, giờ mở cửa, địa chỉ, liên hệ | Thông tin công khai và cấu hình được phép xem | Thông tin đã công bố | Như khách vãng lai |
| Dịch vụ, gói, giá, điều kiện và chuẩn bị | Giá/quy tắc hiện hành, điều kiện áp dụng và dữ liệu vận hành theo quyền | Thông tin công khai; ước tính khi đủ dữ kiện, nêu rõ phụ phí chưa xác định | Như guest; có thể dùng hồ sơ thú cưng của mình sau khi chọn đúng bé |
| Sản phẩm, biến thể, giá và tình trạng hàng | SKU, tồn, ngưỡng, lịch sử biến động, giá vốn nếu được phép | Giá bán, biến thể và tình trạng còn/hết được công bố; không giá vốn hoặc tồn nội bộ | Như guest; thêm đối chiếu đơn/sản phẩm đã mua của mình |
| Lịch trống, đặt lịch và mua hàng | Công suất, ca, chuồng/phòng hoặc tài nguyên có dữ liệu theo quyền | Lịch trống công khai nếu có nguồn chuẩn; hướng dẫn và mở màn hình đặt/mua | Như guest; gợi ý dựa trên dữ liệu của mình, vẫn xác nhận tại màn hình nghiệp vụ |
| Đơn, thanh toán, giao hàng | Tra cứu, tổng hợp, lọc, đối soát và tình trạng xử lý theo quyền | Chỉ giao dịch được gắn với phiên hoặc có bằng chứng truy cập do server xác minh | Đơn và giao dịch của chính tài khoản |
| Lịch hẹn, ca dịch vụ, lưu trú, taxi | Danh sách, tiến độ, phân công và ngoại lệ theo quyền | Chỉ lịch thuộc danh tính guest đã xác minh | Lịch của mình và thú cưng liên quan; tiến độ được phép công khai |
| Khách hàng và thú cưng | Hồ sơ, liên kết, lịch sử và cảnh báo theo quyền | Dữ liệu vừa cung cấp trong phiên; không tra hồ sơ bằng tên/SĐT đơn lẻ | Hồ sơ và thú cưng thuộc mình; không thông tin của chủ nuôi khác |
| Pawpoint, hạng và ưu đãi | Số dư, biến động, điều kiện, chính sách theo quyền | Chính sách công khai và hướng dẫn tham gia | Số dư/hạng/lịch sử của mình, ưu đãi đủ điều kiện theo nguồn thật |
| Khiếu nại, đổi trả, hoàn tiền | Tiến độ, SLA, trách nhiệm, giao dịch và đối soát theo quyền | Chính sách công khai; theo dõi yêu cầu của mình nếu đã xác minh | Yêu cầu của mình, trạng thái và bước tiếp theo được phép công khai |
| Nhân sự, lịch trực, hiệu suất | Lịch trực, tải công việc, phân công và chỉ số được cấp quyền; trường nhạy cảm có quyền riêng | Chỉ thông tin nhân sự đã công bố, không lịch nội bộ | Như guest; thông tin người phục vụ chỉ khi nghiệp vụ cho phép |
| Báo cáo và thực thu | Tổng hợp, so sánh kỳ, phân nhóm, ngoại lệ và giải thích công thức theo quyền | Không dữ liệu kinh doanh nội bộ | Không dữ liệu kinh doanh nội bộ |
| Nội dung, đánh giá và chính sách | Nội dung xuất bản/nội bộ theo quyền; duyệt và thống kê theo nguồn thật | Nội dung/đánh giá đã công bố | Như guest; thêm đánh giá và phản hồi riêng của mình |
| Hội thoại và quy trình xử lý | Ca có quyền truy cập, tóm tắt, hướng dẫn và bản nháp | Hội thoại của phiên mình | Hội thoại của mình; không ghi chú nội bộ hoặc nguyên văn bị hạn chế |

**Guest có hai mức truy cập:** chưa xác minh giao dịch thì chỉ xem công khai và phiên chat của mình; đã xác minh thì được xem đúng giao dịch được cấp quyền. Không bắt mọi guest phải tạo tài khoản nếu hệ thống đã có cơ chế xác minh giao dịch an toàn. Không coi biết mã đơn/SĐT là đủ bằng chứng sở hữu. Nếu chưa có liên kết hoặc bằng chứng server hợp lệ, chưa mở tra cứu riêng.

**Thành viên:** đăng nhập giúp xác định chủ sở hữu, không đồng nghĩa được xem mọi dữ liệu cùng số điện thoại/email. Giao dịch guest trước đăng nhập chỉ xuất hiện sau luồng liên kết đã xác minh, không tự ghép bằng dữ liệu trùng nhau.

## 13. Admin cần hỏi được gì để không gián đoạn công việc?

Phạm vi cần bao phủ sáu kiểu câu hỏi trong từng phân hệ, sau đó mở câu hỏi liên phân hệ. Không xây một câu lệnh riêng cho mỗi cách diễn đạt.

| Kiểu câu hỏi | Ví dụ mục tiêu | Hợp đồng trả lời |
|---|---|---|
| Tra một đối tượng | “Đơn này đang vướng bước nào?”, “Bé này từng dị ứng gì?” | Xác định đúng đối tượng; trạng thái, thông tin liên quan và thời điểm cập nhật |
| Tìm/lọc danh sách | “Lịch Spa chiều mai chưa có KTV”, “Đơn COD giao thành công chưa đối soát” | Điều kiện đã hiểu, tổng chính xác, danh sách giới hạn và mở đúng bộ lọc |
| Đếm/tổng hợp | “Hôm nay bao nhiêu ca quá hạn?”, “Thực thu tuần này?” | Công thức, phạm vi ngày/trạng thái, nguồn chuẩn và tổng không dựa vào mẫu danh sách |
| So sánh/xu hướng | “Tuần này so tuần trước?”, “Dịch vụ nào giảm khách quay lại?” | Hai kỳ tương đương, định nghĩa chỉ số; không đủ lịch sử thì nói rõ |
| Giải thích/đối soát | “Vì sao điểm của khách bị trừ?”, “Vì sao số thực thu khác doanh số?” | Sự kiện/chứng từ và quy tắc đã ghi nhận; tách sự thật với giả thuyết cần kiểm tra |
| Hướng dẫn/soạn nháp | “Ca này xử lý thế nào?”, “Soạn trả lời về đơn trễ” | Quy trình có hiệu lực, bước tiếp theo và bản nháp để nhân viên duyệt |

Ví dụ liên phân hệ phải đưa vào bộ nghiệm thu:

- “Khách này có những bé nào, lịch gần nhất và khiếu nại còn mở?”
- “Lịch khách sạn cuối tuần đã xác nhận có vượt sức chứa không?” — chỉ kết luận nếu nguồn sức chứa, khoảng lưu trú và trạng thái đã đầy đủ.
- “Đơn đã thu tiền nhưng bị hủy, đơn nào chưa hoàn xong?”
- “Sản phẩm nào bán nhiều nhưng tồn sắp dưới ngưỡng?” — chốt trước cách tính bán nhiều và kỳ báo cáo.
- “KTV nào có ca chồng giờ hoặc lịch chưa được phân công?”
- “Những việc cần xử lý trước trong ca trực này?” — ưu tiên theo hạn, trạng thái, phân công và chính sách; không tự bịa mức ưu tiên.

Mỗi chỉ số mới phải có định nghĩa, nguồn, phép nối, thời gian, trạng thái và SQL oracle. Số liệu dẫn xuất như doanh thu, lợi nhuận, tỷ lệ quay lại hoặc quá hạn phải có công thức riêng; không dùng mô hình suy đoán từ tên cột. Không hứa trả lời nguyên nhân kinh doanh khi dữ liệu chỉ chứng minh tương quan.

## 14. Thiết kế mở rộng và cách tiếp tục khi chưa trả lời đủ

### 14.1. Mở rộng độ bao phủ

- C01 — Lập danh mục năng lực cho mọi hàng trong ma trận mục 12: đối tượng được dùng, trường trả về, bộ lọc, phép tổng hợp, quyền, nguồn/RPC, liên kết mở màn hình và trạng thái hỗ trợ.
- C02 — Mô hình hiểu ngôn ngữ chuyển câu hỏi thành kế hoạch có cấu trúc: đối tượng, dữ kiện cần xem, điều kiện, kỳ thời gian, phép tổng hợp và quan hệ. Server xác thực kế hoạch và quyền trước khi thực thi.
- C03 — Dùng công cụ đọc đã đăng ký và tham số được kiểm tra; không cho mô hình chạy SQL tùy ý, chọn service role để vượt quyền hoặc nhận tên bảng/cột tùy ý từ câu hỏi.
- C04 — Cho phép phối hợp nhiều công cụ đọc trong ngân sách request/thời gian; kết quả có nguồn, thời điểm và điều kiện. Kiểm tra quyền từng nguồn, không chỉ quyền chat.
- C05 — Hỗ trợ hôm nay/chiều mai/tuần/tháng/khoảng ngày và câu tiếp nối; chuẩn hóa timezone, khoảng đầu/cuối và tiêu chí so sánh trước khi truy vấn.
- C06 — Nhận ngữ cảnh trang, đối tượng và bộ lọc Admin đang mở. Ngữ cảnh chỉ giúp hiểu “đơn này/khách này”, server vẫn xác minh ID/quyền; không ghi nhầm theo lựa chọn cũ.
- C07 — Kết quả lớn dùng phân trang/tóm tắt hoặc mở danh sách lọc đúng; tổng phải tính trên toàn phạm vi, không tải hết dữ liệu vào AI.
- C08 — Tiếp tục giữ đường tra cứu số liệu xác định hiện có; chỉ dùng mô hình để hiểu/diễn giải khi cần. Cache phụ thuộc danh tính, quyền, bộ lọc và phiên bản dữ liệu.

### 14.2. Không để người dùng gặp ngõ cụt

| Trường hợp | Hành vi bắt buộc |
|---|---|
| Thiếu đối tượng hoặc điều kiện quan trọng | Hỏi một câu ngắn, đưa lựa chọn phù hợp nếu có; giữ phần điều kiện đã hiểu |
| Có nhiều đơn/bé/lịch cùng khớp | Cho chọn bằng mã/tên/thời điểm; không tự chọn đối tượng đầu tiên |
| Hiểu yêu cầu nhưng công cụ chưa hỗ trợ | Nói rõ phần chưa làm được, trả phần đã xác minh và cung cấp đường mở phân hệ/bộ lọc liên quan |
| Một trong nhiều nguồn bị lỗi | Chỉ trả phần nguồn thành công, đánh dấu phần chưa kiểm tra; không kết luận tổng thể từ dữ liệu thiếu |
| Thiếu quyền | Nêu không có quyền xem phần này, không lộ số đếm/tên/snippet; hướng dẫn đúng người hoặc quy trình cấp quyền |
| Không tìm thấy dữ liệu | Chỉ báo không có kết quả sau truy vấn thành công; giữ điều kiện để người dùng đổi phạm vi |
| AI/DB chậm hoặc hết quota | Giữ nháp/điều kiện, báo trạng thái và cách thử lại; Admin có thể mở màn hình nghiệp vụ để tiếp tục |
| Khách cần nhân viên | Chuyển đầy đủ tóm tắt và dữ kiện đã thu thập; không bắt kể lại, không nói đã có người nhận khi còn chờ |
| Câu hỏi ngoài Pawpal hoặc cần kết luận chuyên môn | Nêu giới hạn ngắn và hướng tiếp tục phù hợp; không tạo thông tin hoặc cam kết giả |

Liên kết mở phân hệ/bộ lọc là chức năng cần triển khai và kiểm thử, không mặc định mọi màn hình đã hỗ trợ deep link. Chatbot không thể bảo đảm trả lời mọi câu hỏi; mục tiêu là trả lời đúng trong phạm vi dữ liệu/quyền và luôn có bước tiếp tục hữu ích khi gặp giới hạn.

## 15. Kiểm chứng độ bao phủ và chất lượng theo từng đối tượng

- Q01 — Thu thập câu hỏi công việc thật đã ẩn danh; chia theo nhóm thông tin, kiểu câu hỏi và ba đối tượng. Bộ nghiệm thu phải có cách nói khác nhau, viết thiếu dấu/lỗi gõ và câu tiếp nối.
- Q02 — Mỗi năng lực có ít nhất: câu chuẩn, câu diễn đạt khác, câu thiếu điều kiện, không có dữ liệu, thiếu quyền và lỗi nguồn. Năng lực liên phân hệ có thêm kiểm tra join không đếm trùng.
- Q03 — Tạo cặp câu hỏi giống nhau cho guest/thành viên/Admin để chứng minh khác biệt quyền; test cố tình khai vai trò trong nội dung không đổi quyền server.
- Q04 — Kiểm tra lịch sử guest → đăng nhập, đăng xuất → tài khoản khác; không ghép/lộ dữ liệu ngoài luồng xác minh.
- Q05 — Đo riêng: hiểu đúng ý, lấy đúng dữ liệu, trả lời đúng, hoàn thành công việc và khả năng tiếp tục khi thiếu hỗ trợ. Câu trả lời tự tin không được tính là đúng nếu thiếu nguồn.
- Q06 — Mục tiêu đề xuất cho bộ câu hỏi phổ biến đã chốt: ít nhất 95% trả lời đúng và đủ; 100% câu định lượng có oracle phải khớp; 0 lộ quyền/ghi sai. Chốt danh sách và cách chấm trước khi đo, không loại câu thất bại để đạt tỷ lệ.
- Q07 — 100% trường hợp ngoài hỗ trợ/lỗi/thiếu quyền trong bộ test có thông báo đúng và hướng tiếp tục phù hợp; không yêu cầu chatbot biết mọi câu hỏi mở.
- Q08 — Ghi nhận có giới hạn các yêu cầu chưa đáp ứng bằng mã năng lực/lý do và phản hồi người dùng; ưu tiên mở rộng theo tần suất và mức gián đoạn. Không ghi mặc định toàn bộ PII/nguyên văn vào hệ thống phân tích.

## 16. Kế hoạch triển khai chi tiết theo giai đoạn

Đây là thứ tự triển khai và bộ checkbox tiến độ chính thức. Các mục3–15 là yêu cầu tham chiếu, không phải bộ giai đoạn thứ hai. **Giai đoạn0–1 đạt local;2 còn Gate2;3 còn G3.4;4 đang làm;5 có luồng chạy thật trên4000 và RPC đọc đã ápCloud nhưng chưa hoàn tất nội dung/chất lượng;6 chưa triển khai mới;7–8 đã thực hiện một phần.** Mỗi dấu đạt chỉ áp dụng phạm vi và môi trường ghi ngay tại mục đó.

### Giai đoạn 0 — Chốt phạm vi và baseline

**Tham chiếu:** B01–B07, C01, Q01. **Phụ thuộc:** Không.

**Cập nhật 28/10/2026:**

- [x] Lưu SHA/hash nguồn và kiểm kê route active local.
- [x] Đối chiếu metadata Cloud: 34 tên hàm phụ thuộc, cột 34 bảng, quyền/policy/index/trigger/publication trong phạm vi.
- [x] Đối chiếu metadata deployment và ba JS asset; xác nhận hai tệp Admin khác local. API chưa đăng nhập trả 401, chưa đủ xác nhận phiên bản server.
- [x] Lập danh mục năng lực ba nhóm và bộ đầu 56 tình huống nghiệm thu.
- [x] Người dùng xác nhận tất cả nhóm Admin; giữ toàn bộ A01–A19 trong phạm vi bắt buộc. Các nhóm A/B/C và thứ tự công cụ chỉ chia triển khai, không loại nhu cầu.
- [x] Chạy lại nhóm offline active và hai bài UI cache/Realtime; đo ba nguồn facts thật đều khớp oracle.
- [x] Đo cold/warm module Admin local với JWT/Cloud thật, guest chưa có ca và idle; ghi 23 request dữ liệu UI đều 200, cache/realtime và giới hạn phép đo.
- [x] Đo 5 GET handler local và 5 GET Production có JWT; ghi rõ 3 lượt Auth/DB và 7.238 byte nội bộ/mẫu local, khác với 659 byte trả UI.
- [x] Lưu snapshot vào backup riêng bền vững ngoài webroot, kiểm chứng hash; chốt trần chống tăng tải cho nhóm đọc đã quan sát.
- [x] Bổ sung transcript guest/member có chủ sở hữu trên test, widget gốc và phân trang/revision; 20 mẫu local/2 tác vụ đồng thời đều đạt; AI không gọi trong lượt đo.
- [x] Chốt ngân sách thiết kế: 2 tác vụ đọc nặng đồng thời, tối đa 4 fetch Auth/DB được kiểm soát; chưa coi limiter đã được triển khai hoặc Cloud đã nghiệm thu công suất.
- [x] Dọn DB/container/credential test theo marker, kiểm nguồn còn nguyên; cập nhật điều kiện chuyển tiếp cho reverse SQL, enforcement và đo tải/SLO trước phát hành.
- [ ] Xác nhận runtime version API ở đợt phát hành bằng marker/provenance kiểm chứng; hiện đã có metadata deployment, so sánh nguồn Git và GET JWT, không coi GET giống nhau là API mới đã deploy.

Các đầu việc tổng hợp dưới đây đã đủ đầu ra chuẩn bị cho nhóm nền tảng hiện có; không thay nghiệm thu các năng lực mới hoặc tải Production. Xem bằng chứng và giới hạn trong [hồ sơ giai đoạn 0](docs/chatbot/stage0-2026-10-28/README.md).

- [x] G0.1 — Kiểm kê route, RPC, schema, quyền và bản deploy; ghi nhận phần đã có, thiếu và chưa xác minh. Runtime marker còn theo dõi ở đợt phát hành.
- [x] G0.2 — Lập danh mục năng lực theo ma trận mục 12; xác nhận phạm vi với người dùng: tất cả nhóm Admin đều bắt buộc. Thứ tự thực hiện dựa trên phụ thuộc kỹ thuật và ngân sách database.
- [x] G0.3 — Có danh mục năng lực, ví dụ, nguồn/quyền, quy tắc tính và cách tiếp tục; công cụ mới có dependency chưa xác minh phải review riêng trước triển khai, không tự kích hoạt từ danh mục đích.
- [x] G0.4 — Chốt bộ nghiệm thu đầu, baseline đọc và workload local giới hạn, ngân sách thiết kế và snapshot/rollback plan. Chưa nghiệm thu gửi/ghi hoặc công suất Production.

**Đầu ra:** Bảng phạm vi Admin/guest/thành viên; danh mục năng lực ưu tiên; báo cáo hiện trạng có SHA/môi trường.

**Nghiệm thu:** Không còn nguồn hoặc quyền chưa xác định trong nhóm chuẩn bị triển khai. Chưa mở năng lực phụ thuộc dữ liệu chưa có.

### Giai đoạn 1 — Bảo vệ quyền và ổn định hội thoại

**Tham chiếu:** S01–S09, L01–L09, K10, mục 14.2. **Phụ thuộc:** Giai đoạn 0.

**Cập nhật 28/10 — nhóm đầu:** [Báo cáo cô lập phiên/timeout widget](docs/chatbot/stage1-session-isolation-2026-10-28.md).

- [x] Tái hiện phản hồi của A hiển thị sau khi đổi sang B; bổ sung guard phiên và abort request cũ.
- [x] Chặn public_open/send/handover cũ tiếp tục dưới danh tính mới; finally cũ không unlock request mới, acknowledgement cũ không xóa nháp mới.
- [x] Thêm timeout 30 giây, giữ nháp/requestId cho retry cùng trang; 8 case Chrome offline và các nhóm hồi quy liên quan đạt.
- [x] Bổ sung pending một yêu cầu trong sessionStorage qua reload: giữ ID mở ca/gửi, không tự retry, cùng danh tính/TTL 30 phút; quota lỗi chặn trước network. Hai nhóm Chrome reload và 3 test API replay đạt. [Báo cáo](docs/chatbot/stage1-reload-retry-2026-10-28.md).
- [x] Kiểm 10 nhóm transaction/quyền trên clone local: nhận ca cạnh tranh, gửi/chuyển/hoàn tất/CSAT retry, quyền người phụ trách, history riêng, raw audit và staff bị khóa. Tối đa 2 kết nối, đã dọn fixture/DB/container. [Báo cáo server](docs/chatbot/stage1-server-2026-10-28/README.md). Đây là SQL claims/roles, chưa thay Auth/HTTP/hai UI.
- [x] Kiểm 8 nhóm ticket/điểm local: đúng khách/đơn/ca, retry đồng thời một ledger/ticket, conflict payload, stale revision, thiếu quyền, policy tắt/cần duyệt/vượt mức và ca đóng. Đã dọn test. [Báo cáo](docs/chatbot/stage1-points-tickets-2026-10-28/README.md). Chưa chứng minh hạn mức cộng dồn toàn ca, service ticket hoặc E2E hai UI.
- [x] Lượt nghiệm thu cuối đã bổ sung cap cộng dồn 50/200, service ticket, JWT/hai UI/WebSocket thật và distinct-ID race. [Báo cáo tổng hợp](docs/chatbot/stage1-acceptance-2026-10-28/README.md). Các giới hạn của báo cáo đợt trước được thay trong đúng phạm vi mới đã kiểm.
- [x] Migration135 và rollback roundtrip local đạt; đã dọn clone, 3 container acceptance và clone race cuối theo marker. Cloud chưa áp bản sửa.

Các mục G1.1–G1.4 đã nghiệm thu theo ma trận local trong báo cáo tổng hợp. Bản sửa không thêm polling/retry tự động; aggregate ledger chỉ chạy khi cấp điểm mới. Limiter dùng chung, tải Production và phát hành vẫn giữ ở các giai đoạn sau.

- [x] G1.1 — Khép kín ma trận quyền và sở hữu local: JWT thật khách/guest/staff và SQL role cho nhánh thiếu quyền/locked.
- [x] G1.2 — Hoàn tất kiểm thử local đồng thời, phiên bản, requestId, ghi chú riêng, nguyên văn/audit, ticket và điểm cộng dồn.
- [x] G1.3 — Chuỗi UI thật local nhận/chuyển/trả lời/hoàn tất/CSAT, SLA server, lượt không hiểu và WebSocket đạt.
- [x] G1.4 — Giữ nháp/requestId khi lỗi và reload, timeout 30 giây, khóa composer ca kết thúc; không auto-send/retry sau reload.

**Đầu ra:** Luồng chat hiện có ổn định và có bằng chứng kiểm tra quyền; danh sách lỗi được đóng hoặc loại khỏi phạm vi phát hành rõ ràng.

**Nghiệm thu:** Không còn lỗi P0; không ghi sai/trùng hoặc lộ dữ liệu; chuyển người nhận và retry đạt trên môi trường kiểm thử.

### Giai đoạn 2 — Nền tảng hiểu câu hỏi và công cụ đọc

**Tham chiếu:** C02–C08, A03–A05, Q02–Q03. **Phụ thuộc:** Giai đoạn 1.

**Tiến độ:** [Báo cáo nền tảng công cụ đọc](docs/chatbot/stage2-read-tools-2026-10-28/README.md). Đã có registry12 công cụ, permission/parameter validation, budget chung theo câu trả lời, contractv1 và hint/continuation UI. 6 nhóm JWT/API/RPC local thật, 13 test registry/API-budget, privacy và các hồi quy liên quan đạt; đã dọn test.

**Cập nhật:** [Giới hạn nguồn dùng chung và timeout SQL](docs/chatbot/stage2-admission-2026-10-28/README.md) đã kiểm chứng local: 2 câu hỏi/1 mỗi staff, 4 transaction nguồn dùng chung giữa process; timeout SQL5 giây, lock1 giây; SQL chặn nội dung nguồn quá32 KiB trước trả và backend đặt trước ngân sách tổng64 KiB. 7 nhóm admission/SQL, 6 nhóm JWT/API và21 test offline đạt; đã dọn clone. Migration136 chưa áp Cloud.

**Cập nhật đường đọc trực tiếp:** [Inbox và hồ sơ khách](docs/chatbot/stage2-panels-2026-10-28/README.md) đã chuyển sang2 RPC có RLS, timeout5 giây, cap32 KiB và dùng chung4 slot nguồn với Copilot. Inbox4→1 lượt DB, hồ sơ6→1; cache/coalescing/TTL và trạng thái lỗi không false-zero đã kiểm chứng. 5 nhóm local thật, UI và hồi quy đạt; rollback137/136 local đạt, đã dọn clone. Migration137 chưa áp Cloud.

**Cập nhật lịch sử:** [Copilot history/session và transcript](docs/chatbot/stage2-history-2026-10-28/README.md) đã vào pool4, timeout5 giây và trần nội dung32 KiB. Trang tự giảm số tin theo bytes, giữ nội dung và hasMore/cursor; GET history/title gom một RPC. 8 nhóm JWT/API/SQL local và UI trang ngắn đạt; rollback138 đạt, đã dọn clone. Nhân viên chỉ có history.read không cần thêm staff.read. Migration138 chưa áp Cloud.

**Cập nhật tin dài:** [Đọc từng phần nội dung](docs/chatbot/stage2-message-parts-2026-10-28/README.md) đã có preview có nhãn, nút Đọc tiếp, tối đa2.000 ký tự/lượt và kiểm phiên bản cho cả Copilot/transcript. Không tự tải nền; giữ quyền, pool4, timeout và trần nguồn32 KiB. 6 nhóm local, 3 test API mới và UI ghép Unicode/giữ preview khi lỗi đạt; rollback139 đạt, đã dọn clone. Migration139 chưa áp Cloud.

**Cập nhật quy tắc/câu mẫu:** [Trang quy tắc, đếm và thư viện câu mẫu](docs/chatbot/stage2-rules-2026-10-28/README.md) đã vào pool4 và timeout5 giây; hai RPC trang có cap32 KiB. Đếm tối đa5 request→1 RPC; thư viện bỏ tải toàn bộ từng đợt500 dòng, chuyển10 mẫu/trang và tìm/lọc SQL. Có cache, debounce, chống response cũ và không tải khi đóng modal. 7 nhóm local, UI desktop/mobile, hồi quy và rollback140 đạt; đã dọn clone. Migration140 chưa áp Cloud.

**Cập nhật rate và nguồn còn lại:** [Migrations141–143](docs/chatbot/stage2-rate-aux-2026-10-28/README.md) đã có10 câu mới/phút/staff dùng chung giữa instance trong RPC cấp lượt, không thêm dịch vụ. Raw/handlers/chính sách điểm vào pool4, giữ audit/quyền; nguồn benchmark3→1 RPC, nguồn trả lời public4→2 RPC. Projection kiểm duyệt giảm31.980→12.542 byte trong fixture mà kết quả giữ nguyên. 8 nhóm rate/aux và10 nhóm Auth/API/bundles local,26 test offline cùng UI/hồi quy đạt; rollback và dọn clone đã thực hiện. Chưa áp Cloud/push.

**Tiếp sau push:** [Lịch sử khách hàng144](docs/chatbot/stage2-public-history-2026-10-28/README.md) đã gom messages/feedback thành một source RPC, pool4, SQL cap32 KiB/timeout5 giây, page theo bytes và đọc tin dài theo phần. Cold Auth/DB member5→4, guest4→3; revision giữ3/2 như baseline. Metadata được lọc tại SQL, giữ CSAT/ownership; widget giữ draft/identity, không mất đường đọc khi các trang tin mới chưa nối nhau. 9 nhóm local,32 test và UI/hồi quy đạt; rollback/dọn clone đã thực hiện. Phần144 còn local, chưa push.

Chưa đóng Gate2 tổng tài nguyên: rate cấp lượt nằm sau Auth; cần ingress trên hosting hiện có cho tải trước Auth. Người dùng không có dịch vụ khác, không thêm Redis/Upstash. Public open/list/mode/feedback, kiểm ownership/lưu/audit/model config và đường RPC/table cũ còn phần ngoài pool. Trang rule/raw quá lớn chưa đủ luồng chi tiết; không cắt dữ liệu để sửa/chèn. DB16 vẫn mở.

- [x] G2.1 — Contract planv1 cho các intent hiện có: đối tượng/filter/operation/kỳ/relations/readOnly; không coi relations trống là công cụ join tương lai đã có.
- [ ] G2.2 — Source pool4/cap/timeout/quyền đạt local cho các nhóm đã ghi đến144, gồm lịch sử và đọc phần của guest/member. Có rate10 câu mới/phút/staff dùng chung; source requests đã giảm và idle revision giữ baseline. Còn ingress trước Auth, tổng tải ngoài pool và chi tiết dữ liệu lớn theo các báo cáo trước đóng gate toàn hệ thống.
- [x] G2.3 — Bộ câu hỏi hiện có có không dấu/typo giới hạn, tiếp nối ngày, hint khách đã chọn; thiếu mã đơn hoặc filter chưa hỗ trợ phải làm rõ. Không tự dùng đơn gần nhất.
- [x] G2.4 — Contractv1 dữ liệu/phạm vi/nguồn/thời điểm/hạn chế; continuation UI whitelist subtab, không giả deep filter. Phân biệt 403/422/504/source-error và zero kết quả.
- [x] G2.5 — Facts gọi RPC xác định, descriptor đã validate và freeze; không nhận SQL/tên RPC tùy ý hoặc đưa số liệu cho model tự đếm.

**Đầu ra:** Nền tảng dùng chung về hợp đồng câu hỏi/kết quả, nhưng bộ công cụ và quyền riêng cho từng nhóm người dùng.

**Nghiệm thu:** Cùng ý định diễn đạt khác nhau ra đúng điều kiện; không gọi công cụ vượt quyền; đầu vào sai không được thực thi.

### Giai đoạn 3 — Admin tra cứu từng phân hệ

**Tham chiếu:** A01–A05, A09, mục 12–13, Q02/Q05/Q06. **Phụ thuộc:** Giai đoạn 2.

- [x] G3.1 — Nhóm A có danh mục công cụ local: khách/thú cưng, đơn/thanh toán và tồn đọng hoàn, lịch theo buổi/phân công, phiếu hỗ trợ và hội thoại. Ba câu hỏi nghiệm thu chạy qua API/Auth thật local, mỗi câu một nguồn.
- [x] G3.2 — Nhóm B: giữ sản phẩm/tồn kho và giá dịch vụ đã có; thêm tổng sổ Pawpoint và danh mục ưu đãi đang hiệu lực theo quyền. Chưa kết luận khách/đơn đủ điều kiện dùng ưu đãi.
- [x] G3.3 — Nhóm C có công cụ local: nhân sự/lịch trực, ba số đếm vận hành, bài viết/tóm tắt, đánh giá/đoạn trích và 9 đường dẫn cấu hình cho phép. Không trả lương, ghi chú nghỉ, khóa hoặc tài khoản ngân hàng.
- [ ] G3.4 — Công cụ/phân trang/nội dung dài/lọc KTV đã đạt trong danh mục local đã công bố;7 nhóm SQL/API149 ngoài11 nhóm147–148 và15 nhóm146. FAQ150–151 đạt7 nhóm tích hợp và7 nhóm150 riêng;152/rollback đạt7 nhóm SQL. Các mẫu Gemini đại diện A/B/C đã có kết quả đạt riêng; giữ nguyên mẫu thất bại cũ. Ma trận offline28 công cụ đạt118 nhóm, tổng203 kiểm tra và40 ca nghiệp vụ đạt; đã sửa thiếu mã thanh toán/kiểm tra trường số. Còn đối chiếu oracle database rộng hơn và môi trường triển khai; không gọi thêm model trong đợt ma trận. [Ma trận và giới hạn](docs/chatbot/stage3-matrix-2026-10-29/README.md), [Hotel đã đạt trong mẫu](docs/chatbot/stage3-hotel-model-2026-10-29/README.md).
- [x] G3.5 — Đạt local cho danh mục đã công bố: ngày/tuần thứ Hai/tháng lịch, khoảng tối đa31 ngày; 15 công cụ ban đầu và8 danh sách cũ có10 dòng/trang, thêm phân trang mức giá con và phần nội dung2000 ký tự. Có kiểm tra tổng/rỗng/quyền/lease/byte/4 slot/timeout/đổi phiên bản/rollback. Kho tri thức vẫn tìm kiếm top5, không phải duyệt toàn bộ FAQ.

**Hồ sơ:** [Danh mục câu hỏi, giới hạn và kết quả giai đoạn 3](docs/chatbot/stage3-admin-2026-10-28/README.md). Migration145 có rollback; chưa áp Cloud/push. Giữ ngân sách 3 nguồn/câu, 2 đồng thời, 32 KiB/nguồn, 64 KiB/câu và pool4 dùng chung; không phát sinh polling hoặc listener mới.

**Ví dụ nghiệm thu:** “Lịch Spa chiều mai chưa có KTV”, “Khách này có bé nào?”, “Đơn hủy đã thanh toán nhưng chưa hoàn”.

**Đầu ra:** Danh mục tra cứu Admin theo phân hệ; mỗi năng lực ghi rõ bộ lọc và giới hạn. Từng nhóm A/B/C có thể đóng riêng sau đủ test.

**Nghiệm thu:** Truy vấn định lượng khớp oracle; không đọc ngoài quyền; mở được màn hình phù hợp để Admin tiếp tục thao tác.

### Giai đoạn 4 — Admin hỏi liên phân hệ và phân tích

**Tham chiếu:** C04–C08, mục 13, Q02/Q05/Q06. **Phụ thuộc:** Các công cụ nguồn tương ứng của giai đoạn 3 đã đạt.

- [ ] G4.1 — Đã có local hai luồng một khách → lịch/phiếu còn mở và → thú cưng/đơn tạo mới nhất. Xác định UUID duy nhất, ưu tiên ngữ cảnh hợp lệ, khách trùng thì dừng;không ghép quan hệ theo tên. Thú cưng trả tổng/tối đa10 dòng mọi trạng thái;đơn chọn theo created_at/UUID, không nối dòng hàng hoặc suy thanh toán.3 nguồn có quyền, không dùng model;153 và154/rollback mỗi đợt đạt8 nhóm SQL/Auth/JWT/REST/API thật. Còn các tổ hợp nhiều nhóm hoặc quan hệ qua hạng mục/chi tiết đơn, chưa áp Cloud. [Luồng mới](docs/chatbot/stage4-customer-commerce-2026-10-29/README.md).
- [ ] G4.2 — Có so sánh thực thu ngày/tuần/tháng cùng phần thời gian đã trôi qua;2 nguồn có quyền, không dùng model tính số. Đã bổ sung5 nhóm SQL/Auth/API thật cho cặp ngày, ranh giới thu/hoàn và replay. Còn oracle SQL riêng tuần/tháng, phân nhóm và chỉ số/công thức khác;chưa nghiệm thu Admin liên phân hệ trên Cloud. [Oracle cặp ngày](docs/chatbot/stage4-compare-sql-2026-10-30/README.md), [công thức](docs/chatbot/stage4-compare-2026-10-29/README.md).
- [ ] G4.3 — Đã có local hai nhóm kiểm tra: đơn cancelled có thu succeeded lớn hơn hoàn succeeded (toàn bộ tồn đọng) và lịch confirmed trong kỳ chưa gán KTV ở cả ca/hạng mục chưa hủy.2 nguồn có quyền, tối đa10 dòng/nhóm và tổng chính xác, không cộng hai tổng/không tự xếp ưu tiên.10 nhóm offline mới và7 nhóm SQL/Auth/JWT/REST/API thật đạt. Chênh lệch cần đối soát, không phải khoản hoàn đã duyệt;chưa gắn nhãn SLA/quá hạn hoặc xử lý ngoại lệ/chính sách khác. [Bằng chứng](docs/chatbot/stage4-pending-2026-10-29/README.md).
- [ ] G4.4 — Đã có cho so sánh thực thu, hai luồng ca khách và bảng kiểm tra: giữ phần hợp lệ, nguồn lỗi/thiếu quyền không giả0, không suy diễn nguyên nhân;nguồn lệch UUID/bộ lọc bị loại. Luồng thú cưng/đơn còn kiểm tra customer_id từng dòng. Thiếu quyền bỏ RPC tương ứng;replay không đọc lại nguồn. Bảng kiểm tra không có nguồn hợp lệ thì báo lỗi, không lưu phản hồi hoàn tất giả.242 kiểm tra offline và các oracle local đã ghi đạt;chưa áp dụng chung cho mọi câu hỏi liên phân hệ hoặc nghiệm thu triển khai.

**Ví dụ nghiệm thu:** “Khách này có lịch gần nhất và khiếu nại nào còn mở?”, “Tuần này thực thu so tuần trước?”, “Sản phẩm bán nhiều nào sắp thiếu?”.

**Đầu ra:** Các câu hỏi kết hợp và phân tích ưu tiên phục vụ công việc Admin.

**Nghiệm thu:** Kiểm tra quyền từng nguồn, đúng join/công thức/kỳ so sánh; không kết luận từ danh sách mẫu hoặc nguồn thiếu.

### Giai đoạn 5 — Khách vãng lai hỏi thông tin công khai

**Tham chiếu:** K01–K04, K09, Q02/Q03/Q05. **Phụ thuộc:** Giai đoạn 2 và nguồn công khai đã xác minh; không bắt buộc đợi toàn bộ giai đoạn 3–4.

- [x] G5.1 — Đã triển khai RPC đọc trên Cloud và kiểm chứng local: tìm tối đa5 FAQ active,context32KiB,lịch sử8 đoạn.158 loại riêng bài bị cắt và giữ mục đầy đủ để trả lời;không chặn cả câu vì một FAQ dài. Giới thiệu gói đọc catalog trực tiếp, đã thử browser4000. Ngân sách2 nguồn giữ nguyên;chưa coi truy xuất/model mọi cách diễn đạt đều đạt.
- [ ] G5.2 — Đã có đường FAQ cho cửa hàng/dịch vụ/chuẩn bị/giao nhận/đổi trả/ưu đãi/hướng dẫn đặt mua và nguồn giá sản phẩm/biến thể. Đã rà92 FAQ local,157 sửa15 câu/tắt1 QA/thêm3 hướng dẫn theo mã hiện hành;18 câu active sửa/thêm truy xuất đúng qua RPC. Còn dữ kiện vận hành chưa có nguồn xác nhận: địa chỉ/giờ hoạt động theo chi nhánh, điều kiện/thời hạn/phí đổi trả và ưu đãi hiện hành. Không bịa các dữ kiện này hoặc coi baseline local là Production. [Rà nội dung](docs/chatbot/stage5-faq-review-2026-10-30/README.md).
- [x] G5.3 — Luồng giá đã có RPC Cloud và thử trực tiếp browser4000: Hotel,Taxi,tắm trả nguồn thật200. Có biến thể/product active và giá dịch vụ hiệu lực, tối đa10 mức/16KiB. Cho hỏi giá tắm và cắt tỉa/các loại phòng hoặc ngày dự kiến;ghi rõ giá hiện tại, chưa phải báo giá đã xác nhận cho mọi ngày/điều kiện. Không dùng model tính giá hoặc hứa còn hàng/lịch trống chưa được kiểm tra.
- [x] G5.4 — Đạt local ranh giới nguồn/quyền và chuyển waiting_agent. Đã bỏ chặn từ khóa quá rộng: khái niệm Paw Points/mã đơn, hướng dẫn tra cứu, hỏi còn hàng/lịch công khai không bị từ chối như dữ liệu cá nhân. Yêu cầu xem số dư/hồ sơ/giao dịch cụ thể và nội bộ vẫn cần xác minh;không có RPC dữ liệu riêng được cấp cho guest. Chuyển nhân viên giữ yêu cầu mới nhất/hội thoại, không hứa có người nhận ca. Chưa kiểm thử mọi cách diễn đạt hoặc chuyển người thật trên web4000.

**Ví dụ nghiệm thu:** “Bé 7 kg tắm bao nhiêu?”, “Gửi bé cần chuẩn bị gì?”, “Có giao hàng không?”, “Tôi chưa có tài khoản có đặt lịch được không?”.

**Đầu ra:** Chatbot tư vấn công khai hữu ích cho cả guest và thành viên.

**Nghiệm thu:** Không lộ giá vốn/tồn nội bộ/hồ sơ riêng; câu trả lời đúng nguồn và điều kiện; đo giảm bytes/token so baseline.

### Giai đoạn 6 — Tra cứu riêng theo danh tính

**Tham chiếu:** K05–K08, K10, Q03–Q04, mục 12. **Phụ thuộc:** Giai đoạn 1, 2, 5 và nguồn nghiệp vụ liên quan.

- [ ] G6.1 — Thành viên: đơn/giao nhận/thanh toán, lịch/ca dịch vụ, thú cưng, điểm/hạng, ưu đãi và yêu cầu hỗ trợ của mình.
- [ ] G6.2 — Khi có nhiều bé/đơn/lịch, cho chọn đúng đối tượng; dùng hồ sơ cá nhân để tư vấn khi phù hợp và đủ dữ kiện.
- [ ] G6.3 — Guest: kiểm tra cơ chế phiên/bằng chứng sở hữu hiện có; chỉ mở tra giao dịch khi server xác minh được quyền đối với đúng giao dịch.
- [ ] G6.4 — Nếu thiếu cơ chế xác minh guest an toàn, ghi hạng mục phụ thuộc riêng; giữ tư vấn công khai/chuyển người, không mở bằng mã đơn/SĐT đơn lẻ.
- [ ] G6.5 — Kiểm tra đăng nhập/đăng xuất/đổi tài khoản và liên kết giao dịch guest; không tự ghép hồ sơ bằng SĐT/email trùng.

**Ví dụ nghiệm thu:** “Lịch ngày mai của bé nhà tôi lúc mấy giờ?”, “Đơn của tôi đã giao chưa?”, “Tôi còn bao nhiêu điểm?”.

**Đầu ra:** Thành viên được tra cứu riêng; guest được tra đúng giao dịch đã xác minh nếu cơ chế này đạt nghiệm thu.

**Nghiệm thu:** Khách khác không đọc được dù biết ID; quyền sở hữu xác minh server; không lộ ghi chú nội bộ. Nhánh thành viên và guest nghiệm thu riêng, không che phần guest chưa đạt.

### Giai đoạn 7 — Quy định, chất lượng và tài nguyên

**Tham chiếu:** A06–A09, P01–P05, U01–U04, Q05–Q08. **Phụ thuộc:** Các nhóm năng lực chuẩn bị phát hành đã có nguồn/test.

- [ ] G7.1 — Nghiệm thu Rules CRUD, conflict, benchmark và hiệu lực chính sách; không gắn nhãn chức năng cho engine chưa có.
- [ ] G7.2 — Đánh giá Gemini thật trên bộ câu hỏi ẩn danh; đo đúng/đủ, hiểu ý, khả năng tiếp tục và tỷ lệ hoàn thành công việc riêng từng đối tượng.
- [ ] G7.3 — Đã sửa lỗi retry thực tế: đọc nền30 giây, lỗi tạm thời30/60/120, thiếuRPC/quyền dừng nền, đóng/ẩn không đọc, giữ draft;Chrome đã kiểm tra. Còn hoàn thiện cache/cập nhật/hạn mức dùng chung toàn hệ thống và đo tải ngoài pool;không tăng query vì mở phạm vi câu hỏi công khai.
- [ ] G7.4 — Kiểm tra toàn bộ UI theo AGENTS.md, trạng thái lỗi, bàn phím, responsive và không mất nháp.
- [ ] G7.5 — Ghi nhận câu hỏi chưa đáp ứng có giới hạn để xếp ưu tiên vòng mở rộng tiếp theo.

**Đầu ra:** Bảng chất lượng ba nhóm, so sánh tài nguyên trước/sau và bằng chứng UI.

**Nghiệm thu:** Đạt chỉ tiêu mục 15 trong phạm vi đã chốt; không hồi quy quyền, dữ liệu hoặc hiệu năng. Các giới hạn được ghi rõ.

### Giai đoạn 8 — Phát hành theo nhóm năng lực

**Tham chiếu:** D01–D08. **Phụ thuộc:** Nhóm phát hành đã hoàn tất các bước nguồn, quyền, chất lượng và tài nguyên liên quan.

- [ ] G8.1 — Chốt danh sách tính năng từng bản, lỗi còn mở và phần ngoài phạm vi; kiểm tra migration/API/frontend tương thích.
- [ ] G8.2 — Đã có diff/evidence/rollback và áp gói runtime đọc tối thiểu+158 lên Cloud, nạp lại server4000. Còn phát hành đầy đủ từng nhóm tính năng và đồng bộ API/frontend Production;không coi mọi migration trong repo đã áp.
- [ ] G8.3 — Đã smoke guest trên4000 với backend thật cho3 nhóm giá và câu giới thiệu tắm/cắt tỉa;chưa smoke đầy đủ Admin/thành viên/FAQ Gemini/chuyển nhân viên thật hoặc xác nhận toàn bộ runtime Production.
- [ ] G8.4 — Theo dõi lỗi/chất lượng/tài nguyên; rollback nhóm lỗi nếu cần, giữ các năng lực ổn định và cập nhật checklist.

**Đầu ra:** Bản phát hành có bằng chứng và hồ sơ bàn giao; không coi triển khai xong là tự động nghiệm thu đạt.

**Nghiệm thu:** Không còn P0/P1 trong phạm vi phát hành; rollback khả dụng; người dùng biết rõ năng lực đã hỗ trợ.

### Quy tắc thực hiện xuyên suốt

- Chất lượng, quyền, băng thông và UI được kiểm tra ngay trong từng giai đoạn; giai đoạn 7 là kiểm tra tổng hợp, không trì hoãn các việc này đến cuối.
- Giai đoạn 5 có thể thực hiện sau nền tảng chung để khách sớm hưởng lợi, không cần đợi hoàn thiện mọi phân tích Admin. Đây là thứ tự phụ thuộc công việc, không yêu cầu chạy nhiều agent.
- Có thể phát hành từng nhóm qua giai đoạn 8 khi nhóm đó đủ điều kiện; không chờ toàn bộ phạm vi lớn hoàn tất.
- Chưa chốt ngày công/ngày phát hành trước baseline; kết thúc mỗi giai đoạn ghi tiến độ, kết quả và ước lượng lại phần tiếp theo.
- Trong phạm vi hiện tại AI vẫn chỉ đọc, tư vấn và soạn nháp; hành động ghi do người dùng thực hiện tại luồng nghiệp vụ có kiểm tra quyền.

## 17. Điều kiện bắt buộc về tải database và băng thông

### 17.1. Nguyên tắc thực thi

Các giới hạn bên dưới là **ngân sách khởi điểm đề xuất**, chưa phải số đo hiện tại hoặc bảo đảm sức chịu tải của database. Giai đoạn 0 phải đối chiếu cấu hình thực tế và tải hiện hữu để chốt mức bằng hoặc thấp hơn; mọi điều chỉnh tăng phải có bằng chứng và ghi quyết định. Không dùng một RPC để che việc hàm đó quét nhiều bảng hoặc chạy SQL nặng.

- [ ] DB01 — Không tải toàn bảng, `select('*')`, toàn bộ lịch sử hoặc danh mục vào chatbot; chỉ lấy cột cần, lọc và phân trang phía server.
- [ ] DB02 — Không truy vấn theo từng dòng kết quả; dùng join/batch/aggregate có quyền và phạm vi rõ. Đếm chính xác không được suy từ trang danh sách hoặc bắt trình duyệt tải đủ mọi trang.
- [ ] DB03 — Không để AI lặp công cụ tự do: giới hạn số lần gọi, số dòng, bytes, khoảng ngày, thời gian và số lượt thử trước khi chạy; hết ngân sách trả phần đã xác minh hoặc mở màn hình liên quan.
- [ ] DB04 — Truy vấn lịch sử/phân tích phải có khoảng ngày và bộ lọc hữu hạn. Câu hỏi phạm vi lớn phải thu hẹp hoặc dùng nguồn tổng hợp đã kiểm chứng, không tự quét toàn lịch sử.
- [ ] DB05 — Không gọi database theo từng ký tự hoặc từng token AI; tìm kiếm có debounce, hủy kết quả cũ và chia sẻ request trùng đang chạy.
- [ ] DB06 — Kiểm tra kế hoạch truy vấn/index trên môi trường test với dữ liệu đại diện; xem số dòng đọc, sort, join và thời gian, không chỉ kích thước response. Index mới phải có lý do, chi phí ghi và rollback.
- [ ] DB07 — Timeout truy vấn phải thực sự dừng tác vụ DB bằng cơ chế phù hợp; `Promise.race` hoặc hủy UI đơn thuần không được coi là đã dừng truy vấn đang chạy.
- [ ] DB08 — Không thêm polling hoặc subscription toàn bảng cho từng năng lực mới; Realtime chỉ báo thay đổi tối thiểu, lọc theo quyền và chỉ tải lại phần cần thiết.
- [ ] DB09 — Không thêm dữ liệu mock/JSON fallback để tránh truy vấn; cache là kết quả có nguồn và thời hạn, không thay Supabase làm nguồn chuẩn.

### 17.2. Ngân sách khởi điểm theo luồng

“Lượt nguồn” là lần đọc dữ liệu nghiệp vụ của một tác vụ, không gồm xác thực/kiểm tra quyền/chống lặp/lưu lịch sử. Các phần ngoài này vẫn phải đo vào **tổng chi phí tác vụ**, tối ưu và giới hạn riêng; không bỏ kiểm tra an toàn để giảm request. Bytes là dữ liệu ứng dụng nhận từ DB trước nén, chưa phải toàn bộ egress nhà cung cấp.

| Luồng | Ngân sách đề xuất | Khi vượt khả năng |
|---|---|---|
| Mở phân hệ | Chỉ tải tab đang xem và trang đầu; 10 dòng danh sách, lịch sử 30 tin/lượt | Tải tiếp khi có thao tác; không preload mọi tab hoặc mọi ca |
| Admin hỏi một nguồn | Tối đa 1 lượt nguồn; tối đa 20 dòng chi tiết, kết quả nguồn mục tiêu ≤32 KiB | Trả tổng + trang đầu + cách mở danh sách |
| Admin hỏi liên phân hệ | Tối đa 3 lượt nguồn, tối đa 2 lượt đồng thời/tác vụ; tổng nguồn mục tiêu ≤64 KiB | Thu hẹp câu hỏi hoặc trả từng phần, không nối thêm công cụ vô hạn |
| Truy vấn theo kỳ | Mỗi truy vấn trực tiếp tối đa 31 ngày trong đợt đầu | Kỳ dài hơn cần nguồn tổng hợp/ngân sách riêng; so sánh kỳ phải tính đủ chi phí hai kỳ |
| FAQ cho khách | Tối đa 1 lượt tìm tri thức, 5 mục liên quan, tổng nội dung đưa vào AI ≤8.000 ký tự | Hỏi rõ hoặc chuyển người; không fallback tải 500 FAQ |
| Khách tra dữ liệu riêng | Tối đa 1 lượt nguồn cho yêu cầu đơn giản, 10 kết quả; chọn đối tượng trước khi lấy chi tiết | Không tải mọi đơn/lịch/thú cưng rồi để AI lọc |
| Hội thoại/ngữ cảnh AI | Khách tối đa 8 tin; Admin tối đa 12 tin chat và 6 tin lịch sử cá nhân, thêm giới hạn ký tự như hợp đồng hiện có | Tóm tắt có kiểm soát hoặc cho tải lịch sử theo thao tác |
| Tìm kiếm UI | Debounce khởi điểm 350 ms; một request đang chạy cho cùng khóa; không gửi khi điều kiện chưa đủ | Gộp/hủy request cũ; không tạo hàng đợi truy vấn theo phím gõ |
| Đọc lỗi tạm thời | Tối đa 1 retry tự động có backoff/jitter cho lỗi đủ điều kiện | Hiển thị lỗi và cho thử lại thủ công; không tự retry 403, đầu vào sai hoặc xung đột |

Giới hạn 31 ngày là phạm vi đợt đầu, không loại bỏ mục tiêu hỏi theo tháng/năm: phân tích dài kỳ phải có thiết kế nguồn tổng hợp và kiểm chứng riêng trước khi mở. Một request so sánh hai kỳ không được lách trần số nguồn hoặc tổng bytes bằng cách chia nhỏ âm thầm.

### 17.3. Cache, Realtime và kiểm soát đồng thời

- [ ] DB10 — Tách cache theo actor/tenant hoặc chi nhánh nếu có, quyền và bộ lọc; xóa hoặc vô hiệu hóa khi đăng xuất, đổi quyền hay có thay đổi liên quan. Không chia sẻ cache riêng giữa người dùng.
- [ ] DB11 — TTL khởi điểm: tri thức công khai 60 giây, danh sách/tra cứu thông thường 15–30 giây nếu nghiệp vụ cho phép; nội dung quyền nhạy cảm kiểm tra lại khi phục vụ. Trạng thái thanh toán/hoàn tiền/điểm cần dữ liệu mới, không dùng cache cũ để xác nhận thao tác.
- [ ] DB12 — Cache có giới hạn số mục/bytes và cơ chế loại bỏ; gộp request cache-miss trùng để tránh nhiều phiên cùng làm mới. Cache bộ nhớ tiến trình không được coi là cache dùng chung giữa các instance.
- [ ] DB13 — Trình duyệt chỉ duy trì một luồng cập nhật cho mỗi phạm vi chat đang xem; không tạo thêm channel/timer khi đổi tab. Gộp sự kiện trước khi refresh, tránh mỗi message làm tải lại toàn inbox + timeline + hồ sơ + số đếm.
- [ ] DB14 — Không polling khi kênh khỏe. Fallback khởi điểm 30 giây rồi tăng 60/120 giây khi lỗi; chỉ chạy khi cửa sổ/chat hiển thị và có tác vụ cần cập nhật. Nếu nghiệp vụ cần phản hồi nhanh hơn phải đo và chọn ngân sách phù hợp, không âm thầm giữ polling 10 giây song song Realtime.
- [ ] DB15 — Realtime guest phải có quyền an toàn. Nếu chưa có kênh phù hợp, dùng polling có điều kiện/revision theo ngân sách; không cấp quyền đọc rộng để đổi lấy cập nhật nhanh.
- [ ] DB16 — Giới hạn tốc độ và đồng thời phía server theo danh tính, phiên/IP phù hợp và toàn hệ thống; có hạn mức dùng chung giữa các instance. Giai đoạn 0 chốt con số theo tải hiện tại, dành tài nguyên cho nghiệp vụ chính, không chỉ giới hạn từng cuộc chat.
- [ ] DB17 — Khi đạt ngưỡng tải: tạm từ chối tác vụ phân tích nặng, báo bận và cho tiếp tục ở màn hình nghiệp vụ; không retry dồn hoặc để chatbot chiếm hết kết nối. Luồng chat người thật và nghiệp vụ chính được ưu tiên theo cấu hình.

### 17.4. Điều kiện tài nguyên để đóng từng giai đoạn

| Giai đoạn | Bằng chứng bắt buộc trước khi đóng |
|---|---|
| 0 | Baseline và ngân sách chốt: tổng request/DB calls, bytes, latency, đồng thời và tải nền đang có; nêu rõ phần không đo được |
| 1 | Retry, chuyển ca và Realtime không tạo request/channel/timer tăng dần; kiểm tra an toàn không bị bỏ để giảm chi phí |
| 2 | Giới hạn công cụ/dòng/bytes/thời gian thực sự được server cưỡng chế; thử vượt ngân sách không tạo vòng gọi thêm |
| 3 | Từng công cụ một nguồn có phân trang, phạm vi thời gian, kế hoạch truy vấn và số đo; không có N+1 |
| 4 | Đo toàn bộ truy vấn kết hợp, hai kỳ và phép join; không vượt tổng ngân sách hoặc quét lịch sử không giới hạn |
| 5 | Đo FAQ trước/sau, cache và giới hạn ký tự; không fallback tải cả kho tri thức |
| 6 | Tra cứu riêng có bộ lọc sở hữu ngay trong truy vấn; cache không lộ chéo; không tải mọi giao dịch để lọc ở AI |
| 7 | Chạy tải có giới hạn trên test theo mức đồng thời đã chốt; đo cache-hit/miss, burst sự kiện, lỗi và reconnect |
| 8 | Đối chiếu bản phát hành với ngân sách; theo dõi bằng chỉ số tổng hợp có sẵn hoặc telemetry gọn, không thêm truy vấn nặng để tự giám sát |

Mỗi tính năng phải có bảng **trước/sau** cùng kịch bản: HTTP request, DB calls, lượt nguồn, rows/bytes trả về, chỉ báo chi phí truy vấn, p50/p95, lỗi, cache-hit/miss và channel đang hoạt động. Đo riêng client↔API, API↔DB, Realtime và API↔AI; không lấy một con số thay toàn bộ. Chi phí mỗi lượt phải được nhân với tần suất và số phiên dự kiến để ước tính tải tổng; số đo một người dùng không chứng minh sức chịu tải.

**Chặn nghiệm thu/phát hành khi:** chưa chốt hoặc vượt ngân sách; xuất hiện tải toàn bảng/N+1/vòng gọi vô hạn; tải nền tiếp tục khi UI ẩn; không dừng truy vấn quá hạn; lỗi/latency tăng vượt ngưỡng đã chốt; hoặc có nguy cơ lộ cache. Với tác vụ cũ cùng điều kiện, request/bytes không được tăng nếu chưa có lý do và ngân sách thay thế được xem xét cụ thể.

Không stress-test Production, không truy vấn Supabase Logs để tạo thêm tải chỉ nhằm cập nhật checklist. Kiểm tra tải dùng test/staging; Production chỉ xác minh có giới hạn theo phạm vi được phép. Các hạng mục trên là yêu cầu triển khai/kiểm chứng, chưa tuyên bố hệ thống hiện tại đã đáp ứng hoặc bảo đảm không thể quá tải.

## 18. Nhật ký tiến độ chi tiết

Các mốc sau giữ lại kết quả tại thời điểm thực hiện, không thay thế bảng đầu tài liệu hoặc checkbox mục16.

### Bắt đầu giai đoạn5 — 30/10/2026

- [x] G5.1 có tìm FAQ phía server: tối đa5 mục liên quan đang bật, không đọc FAQ Admin; FAQ16KB/context32KiB, lịch sử8 đoạn có cắt độ dài, giữ2 nguồn/câu và4 slot chung. Có partial GIN index và rollback155; không thêm polling/cache/model ngoài.
- [x] Không tìm thấy: hỏi làm rõ/hướng nhân viên, lưu understood=false theo luồng chuyển giao hiện hành, không gọi model. API chặn context quá số dòng/bytes hoặc sai kiểu trước model.
- [x] 9 nhóm SQL/Auth/JWT/REST/API thật đạt, gồm guest/member và rollback/reapply;248 kiểm tra offline và40 ca nghiệp vụ đạt. Clone và container thử đã dọn. [Bằng chứng và giới hạn](docs/chatbot/stage5-public-search-2026-10-30/README.md).
- [ ] G5.1 còn đo trước–sau/độ liên quan bằng bộ câu hỏi tiếng Việt đại diện;G5.2–G5.4 còn nguồn công khai từng nhóm, giá có hiệu lực, điều kiện tư vấn và phạm vi dữ liệu riêng. G4 còn mở theo ghi chú trước;không đánh dấu hoàn tất chỉ vì chuyển giai đoạn.
- [ ] API mới cần155 trước khi phát hành;chưa push/áp Cloud, không có lượt Gemini mới.

### G4.2 — Bổ sung oracle tích hợp ngày 30/10/2026

- [x] So sánh thực thu cặp ngày đã chạy qua JWT/RLS/RPC thật trên clone riêng: đầu kỳ tính/cuối kỳ loại, bỏ pending, cộng nhiều khoản hoàn đúng và đối chiếu cả hai kỳ bằng SQL độc lập. Thu/hoàn theo thời điểm giao dịch, không theo ngày tạo đơn.
- [x] Handler Auth/API thật đọc đúng2 nguồn, lưu phản hồi; replay0 nguồn; thiếu quyền hoàn403 trước nguồn nghiệp vụ. Tổng5 nhóm tích hợp đạt;40 kiểm tra offline giai đoạn4 và40 ca nghiệp vụ đạt. Môi trường đã dọn, nguồn giữ nguyên. [Bằng chứng](docs/chatbot/stage4-compare-sql-2026-10-30/README.md).
- [ ] G4.2 vẫn mở cho phân nhóm/chỉ số khác và oracle SQL riêng ranh giới tuần/tháng. Không áp Cloud, không gọi model, không push trong đợt này.

### Tiếp tục G4.2/G4.4 sau checkpoint e126355d — 29/10/2026

- [x] Đã push checkpoint `e126355d45026a5de961ff64e25c72fb7487b134` lên `origin/feat/guest-admin-identity`; SHA remote khớp. Các ghi chú chưa push/472da7ed phía trên là mốc trước checkpoint này.
- [x] Siết scope so sánh thực thu: từ chối bộ lọc ngoài start_at/end_at và múi giờ nguồn trái hợp đồng; giữ nguồn hợp lệ, không giả 0 hoặc tính chênh lệch khi thiếu kỳ. Giữ nguyên tối đa 2 nguồn so sánh và ngân sách chung.
- [x] Bổ sung kiểm tra hồi quy: 12 nhóm so sánh, tổng 243 kiểm tra offline và 40 ca nghiệp vụ đạt; diff sạch lỗi khoảng trắng. Thay đổi bổ sung sau checkpoint đang local.
- [ ] Oracle SQL cho so sánh kết hợp, phân nhóm và các phần G4 còn lại vẫn chưa hoàn tất. Không áp migrations135–154 lên Cloud trong đợt push này.
