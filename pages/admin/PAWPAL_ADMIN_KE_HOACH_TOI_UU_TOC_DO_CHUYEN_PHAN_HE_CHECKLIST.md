# PAWPAL ADMIN — KẾ HOẠCH TỐI ƯU TỐC ĐỘ TẢI DỮ LIỆU & CHUYỂN 8 PHÂN HỆ

> **Phiên bản:** 1.0 — 17/10/2026  
> **Loại tài liệu:** Checklist thực thi từng giai đoạn — có thứ tự sửa, hướng dẫn cụ thể, kiểm thử, điều kiện PASS/FAIL và rollback.  
> **Phạm vi:** 8 phân hệ Admin: Dashboard, Khách hàng, Thú cưng, Dịch vụ, Bán hàng & Kho, Nhân sự, Khiếu nại, Cấu hình hệ thống. **Không bao gồm tối ưu AI Chatbot/Copilot** (có kế hoạch riêng).  
> **Nguồn đối chiếu:** 8 file core (`dashboard.js`, `customers.js`, `pets.js`, `services.js`, `orders.js`, `staff.js`, `complaints.js`, `settings.js`), JS các subtab, và báo cáo `PAWPAL_ADMIN_AUDIT_LOI_8_PHAN_HE.md` v0.4.  
> **Giới hạn xác minh:** Chưa có file router trung tâm `admin.js`, số liệu performance thực tế, schema/index/RLS và môi trường production. Các con số mục tiêu trong tài liệu là **đề xuất để nghiệm thu**, không phải kết quả đo. Không tự thay schema hoặc giả định có endpoint chưa được xác minh.

---

## 0. ĐÍCH ĐẾN — SỬA TRẢI NGHIỆM GÌ?

**Vấn đề người dùng gặp:** đang ở Khách hàng → bấm Thú cưng → Dịch vụ → Bán hàng → quay lại Khách hàng, mỗi lần lại thấy tải/chờ trước khi có thể làm việc. Yêu cầu là **điều hướng mượt, màn hình phản hồi ngay, dữ liệu vẫn đúng và cập nhật được**.

### Kết quả mong muốn (KPI đề xuất; chốt lại sau đo baseline)

| Thước đo | Định nghĩa đo | Mục tiêu đề xuất cho staging |
|---|---|---|
| Tương tác điều hướng | Từ click menu đến khi **khung trang/subtab xuất hiện**, chưa cần hoàn tất fetch | p95 ≤ 300 ms trên desktop trong điều kiện ấm |
| Quay lại phân hệ đã mở | Click → dữ liệu cache hợp lệ hiển thị | p95 ≤ 700 ms, không màn hình trắng |
| Vào phân hệ lần đầu | Click → danh sách chính có dữ liệu có thể thao tác | P75 ≤ 2 giây với dữ liệu staging và mạng chuẩn đã thống nhất |
| Request khi quay lại ngay | Số Supabase GET phát sinh khi A→B→A trong TTL và không có invalidation | 0 GET trùng lặp cho cùng dữ liệu |
| Truy vấn trùng đồng thời | Cùng `cacheKey`, nhiều event cùng gọi loader | Tối đa 1 request đang bay cho mỗi `cacheKey` |
| Độ mới sau ghi | Đổi trạng thái đơn/kho/lịch/ticket và mở lại màn hình liên quan | Thấy dữ liệu authoritative sau khi thao tác xác nhận thành công; không chờ 90 giây |
| Sai dữ liệu / bảo mật | Dữ liệu lỗi fetch, switch tài khoản/chi nhánh, RLS từ chối | Không lộ dữ liệu phiên cũ, không thay lỗi bằng số `0` hoặc dữ liệu mẫu |
| Mất event listener / DOM | Chuyển 8 phân hệ 50 vòng và thao tác nút | Không tăng listener/subscription vô hạn; không bấm một lần chạy nhiều handler |

**Định nghĩa p95:** 95% số lượt đo có thời gian không vượt mức; P75 tương tự cho 75%. Nếu máy thật/đường truyền không phù hợp các mốc này, ghi baseline và thỏa thuận ngưỡng lại trước khi sửa.

### Bằng chứng tĩnh đã tìm được trong code

| Phân hệ | Vị trí / hành vi quan sát được | Hướng xử lý |
|---|---|---|
| Dashboard | `dashboard.js:74–118`: 11 nguồn dữ liệu `Promise.all`; orders/appointments tới 500; TTL 90 giây; realtime có thể trả cache cũ (`D-04`) | KPI bằng RPC/view/tổng hợp; widget riêng; invalidation đúng nguồn |
| Khách hàng | `customers.js:204–240`: 9 nguồn dữ liệu trước khi dựng danh sách; một số bảng khách/profile/address/pet không giới hạn theo trang; TTL 90 giây (`C-10`) | Danh sách phân trang; 360° chỉ load khi vào profile; ledger chỉ load khi mở PawPoints |
| Thú cưng | `pets.js:213–253`: `care_log` chạy vòng `.range()` cho **toàn bộ lịch sử**; weight history `Promise.race` timeout 5s (`P-16`) | Lấy pet list trước; care log/cân nặng theo pet và theo trang/ngày |
| Dịch vụ | `services.js:290–370`: 9 nguồn + join lồng sâu trên lịch hẹn, đọc review/care_log trước khi xem danh sách | Booking list tối giản, drill-down theo appointment; subtab review/catalog load độc lập |
| Bán hàng & Kho | `orders.js:505–...`: đọc categories rồi products rồi các nguồn liên quan, nhiều record `select` rộng; TTL 90 giây (`O-24`) | Tách danh sách đơn, sản phẩm, kho, voucher; danh sách có pagination, detail on demand |
| Nhân sự | `staff.js:208–280`: `staff.select('*')`, lịch/đơn đổi ca `select('*')`; cache 90 giây (`N-28`) | Tải staff list mỏng; roster theo tuần; profile/assessment on demand |
| Khiếu nại | `complaints.js:274–319`: 9 nguồn; `support_ticket_message.select('*')` toàn bảng; TTL 90 giây và realtime bị cache chặn (`K-20`) | List ticket trước; messages theo ticket; customer/order/appointment theo FK cần tra cứu |
| Cấu hình | `settings.js:430–457`: 9 nguồn, nhiều `select('*')`; `settings.js:664–672,780–800` realtime/focus/init gọi lại full load (`CFG-09`) | Chia subtab + cache/in-flight dedup; chỉ refresh nguồn thay đổi; audit theo trang |

**Phân loại chứng cứ:** Các dòng gọi DB/TTL nói trên **xác nhận qua mã nguồn**. Mức chậm cụ thể ở máy bạn, hiệu ứng JS nặng so với mạng, hoặc router tạo lại DOM/script ở mỗi lần bấm **chưa được đo**. `admin.js` là đầu vào bắt buộc cho phần sửa router; tuyệt đối không thay router theo phỏng đoán.

---

## GIAI ĐOẠN 0 — CHUẨN BỊ, ĐO BASELINE & BẢO VỆ DỮ LIỆU

**Mục đích:** biết mất thời gian ở đâu trước khi sửa. **Đầu ra:** bảng đo baseline, video/screenshot Network, branch Git và danh sách điểm nghẽn.

### Checklist

- [ ] **PERF-00.01** Tạo nhánh `perf/admin-module-navigation` từ mã mới nhất; không sửa trực tiếp `main`.
- [ ] **PERF-00.02** Sao lưu commit, các file `admin.js`, 8 core JS, JS subtab và CSS/HTML; chụp trạng thái UI hiện tại. Không sao chép token/PII lên repo public.
- [ ] **PERF-00.03** Xác minh môi trường staging dùng DB test hoặc dữ liệu đã ẩn danh; không thử tạo/xóa thật trên production.
- [ ] **PERF-00.04** Lấy `admin.js`/router và xác minh `loadModule`, cách inject HTML, nạp CSS/JS, lifecycle `init`, event `admin:module-show`/`admin:subtab-change`. Đánh dấu đây là **blocker nếu thiếu**.
- [ ] **PERF-00.05** DevTools → Network → Fetch/XHR, bật **Preserve log**; đo lần đầu với Disable cache, sau đó **tắt Disable cache** để đo warm navigation. Không trộn hai kết quả.
- [ ] **PERF-00.06** DevTools → Performance ghi 3 kịch bản: A→B, A→B→A, A→B→C→D→A. Kiểm tra vùng *Network/DOMContentLoaded/Long tasks/Recalculate style/Layout*.
- [ ] **PERF-00.07** Mỗi phân hệ đo: thời gian click→UI xuất hiện, click→danh sách usable, số GET, bytes tải, request chậm nhất, lỗi 4xx/5xx, thời gian JS render. Lấy ≥10 vòng warm để chẩn đoán; ≥30 lượt khi cần tính p95 nghiệm thu.
- [ ] **PERF-00.08** Mở tab **Performance Monitor** hoặc công cụ tương đương, chụp DOM nodes/JS heap/listeners trước và sau 50 lần chuyển phân hệ.
- [ ] **PERF-00.09** Đo 3 tình huống dữ liệu: ít bản ghi, nhiều bản ghi (nếu có staging), người dùng quyền hạn thấp / RLS. Ghi rõ mọi khác biệt về chi nhánh.
- [ ] **PERF-00.10** Đánh nhãn cho mỗi nguồn chậm: `NETWORK`, `QUERY_DB`, `JS_INIT`, `RENDER_DOM`, `DUPLICATE_FETCH`, `REALTIME`, `UNKNOWN`. Không kết luận do Supabase chỉ vì đang hiển thị skeleton.
- [ ] **PERF-00.11** Kiểm tra trình duyệt gửi nhiều `GET /rest/v1/...` cho **một lần click** hay có tải thêm file JS/CSS nhiều lần.
- [ ] **PERF-00.12** Đặt request id/tên sự kiện ở log **development only** (không log dữ liệu khách, token). Ví dụ `module=Pets`, `action=show`, `requestId`, `durationMs`, `recordCount`.

### Mẫu bảng đo (điền trước/sau)

| Luồng | Before click→UI | Before click→usable | GET / lần | After click→UI | After click→usable | PASS? |
|---|---:|---:|---:|---:|---:|---|
| Dashboard → Khách hàng | ... | ... | ... | ... | ... | ☐ |
| Khách hàng → Thú cưng | ... | ... | ... | ... | ... | ☐ |
| Thú cưng → Dịch vụ | ... | ... | ... | ... | ... | ☐ |
| Dịch vụ → Bán hàng | ... | ... | ... | ... | ... | ☐ |
| Bán hàng → Nhân sự | ... | ... | ... | ... | ... | ☐ |
| Nhân sự → Khiếu nại | ... | ... | ... | ... | ... | ☐ |
| Khiếu nại → Cấu hình | ... | ... | ... | ... | ... | ☐ |
| Cấu hình → Khách hàng (quay lại) | ... | ... | ... | ... | ... | ☐ |

**PASS giai đoạn 0:** có baseline thực tế; biết router load kiểu nào; có branch và cách rollback; không cần chứng minh đã tăng tốc ở bước này.

---

## GIAI ĐOẠN 1 — SỬA ROUTER / VÒNG ĐỜI MODULE (ƯU TIÊN CAO)

**Mục đích:** bấm menu thấy giao diện ngay, không phải đợi toàn bộ Supabase; không khởi tạo trùng và không phá trạng thái mỗi lần quay lại.

**File:** `admin.js` (chưa có), 8 file core và các subtab phụ thuộc DOM.

### Checklist chi tiết

- [ ] **PERF-01.01** Đọc router thật, vẽ lifecycle hiện tại: **click → load HTML/CSS/JS → init → query → render**. Xác định đoạn `await` nào chặn việc hiển thị module.
- [ ] **PERF-01.02** Thiết kế lifecycle thống nhất: `mount` (DOM/listener 1 lần) → `show` (hiển thị ngay, dùng cache) → `refresh` (fetch nền) → `hide` (dừng hiệu ứng/timer không cần) → `destroy` (chỉ khi thực sự tháo module).
- [ ] **PERF-01.03** **Không chờ các truy vấn 9 bảng trước khi hiển thị bộ khung**. Render sidebar/header/bộ lọc/skeleton trước; fetch danh sách chính sau.
- [ ] **PERF-01.04** Chỉ `init` một lần cho **cùng instance DOM**. Nếu router thay `innerHTML` của module, phải gắn lại listener đúng cách hoặc tái sử dụng DOM có chủ đích; không dùng `isInitialized=true` mù khi DOM đã bị thay.
- [ ] **PERF-01.05** Ưu tiên giữ nguyên DOM và filter/scroll/drawer của vài module được truy cập gần đây **nếu RAM cho phép**. Nếu unmount, giữ state qua module store rồi restore khi mount.
- [ ] **PERF-01.06** Nếu có dynamic `script`/`link`, chỉ nạp một lần cho mỗi file (theo URL/phiên bản), chống chạy lại IIFE tạo listener global.
- [ ] **PERF-01.07** Chặn hai lượt click nhanh A→B→C làm response B ghi đè C; dùng `navigationVersion`/`AbortController` cho fetch read đã hỗ trợ abort, không hủy thao tác ghi.
- [ ] **PERF-01.08** Đảm bảo hash URL, `sessionStorage` subtab, deep-link và back/forward vẫn hoạt động; không để `admin:module-show` và `init()` cùng khởi động fetch lặp.
- [ ] **PERF-01.09** Kiểm tra CSS giữa các phân hệ không làm layout reflow hoặc tràn style (`S-26`, vấn đề CSS global scope ở audit).
- [ ] **PERF-01.10** Với module không có dữ liệu, vẫn render trạng thái trống hợp lệ; không để cache logic kiểu “length > 0” buộc refetch mãi.

### Luồng đúng để coder làm theo

1. Khi click menu, router xác minh permission module → đổi trạng thái active/menu/header → **hiện khung module ngay**.
2. Nếu JS/HTML chưa từng load: load code một lần, mount DOM, gắn listener một lần.
3. Đọc cache theo `module + subtab + filter + role + branch` → có dữ liệu thì render ngay; chưa có thì skeleton ở **vùng danh sách**, không khóa toàn trang.
4. Song song ở nền: hỏi data store có cần refresh không. Khi response hoàn tất, cập nhật state nếu nó còn thuộc `navigationVersion` hợp lệ.
5. Khi rời module: tránh refresh/polling không cần thiết; **không xóa cache** chỉ vì chuyển tab.

**PASS:** đi qua 8 module 20 vòng, mỗi click thấy khung ngay; back/forward hoạt động; 1 click không gây 2 `init`/2 lượt fetch; không phát sinh JS error.

**Rollback:** chỉ đảo commit thay router/lifecycle; giữ nguyên schema, không cần khôi phục dữ liệu.

---

## GIAI ĐOẠN 2 — DATA STORE/CACHE CHUNG & SINGLE-FLIGHT

**Mục đích:** đã xem dữ liệu rồi thì quay lại không phải chờ; nguồn nào thay đổi thì cập nhật đúng nguồn đó.

**File:** tạo tiện ích ví dụ `admin-data-cache.js` hoặc `admin-data-store.js` (tên đề xuất, chưa tồn tại), nối với 8 core module và router.

### Checklist

- [ ] **PERF-02.01** Xác định dữ liệu của từng module theo ba cấp: `LIST/SUMMARY` (mở màn hình), `DETAIL` (khi bấm một bản ghi), `HEAVY_HISTORY` (nhật ký, ledger, audit, biểu đồ dài hạn).
- [ ] **PERF-02.02** Data store có trường tối thiểu: `data`, `status`, `error`, `updatedAt`, `inFlight`, `version`, `cacheKey`, `stale`.
- [ ] **PERF-02.03** `cacheKey` phải chứa `actor/session identity`, `branch/tenant`, `permission scope`, tên resource, sort/filter/page; tuyệt đối không chia sẻ cache nhạy cảm giữa 2 tài khoản.
- [ ] **PERF-02.04** Implement **single-flight**: cùng key, nếu promise đang chạy thì dùng lại promise; không tạo request thứ hai.
- [ ] **PERF-02.05** Implement **stale-while-revalidate**: có cache → render ngay + nhãn cập nhật lúc; stale → refresh nền; không bỏ đi nội dung cũ nếu mạng chập chờn.
- [ ] **PERF-02.06** Tách `hasLoaded` khỏi `data.length`: bảng không có dòng vẫn là tải thành công; nếu lỗi thì không ghi nhận `lastFetchedAt` như thành công.
- [ ] **PERF-02.07** Phân biệt `force` của nút Làm mới với refresh do tab chuyển; tránh force fetch toàn bộ module cho một dòng thay đổi.
- [ ] **PERF-02.08** Khi mutation DB **được xác nhận thành công**, gọi invalidate các `cacheKey` liên quan; không invalidate sớm khi request còn đang pending rồi coi như thành công.
- [ ] **PERF-02.09** Xử lý response cũ: gán `version` khi bắt đầu fetch; kết quả cũ không ghi đè state mới đã refresh xong.
- [ ] **PERF-02.10** TTL theo tính chất dữ liệu, không dùng chung 90 giây cho tất cả: ví dụ config/danh mục 5–15 phút; list khách/thú cưng 1–5 phút; đơn/ticket/lịch/kho ngắn hơn hoặc event-driven. **Các khoảng này chỉ là giá trị khởi tạo để đo, không thay thế xác minh sau ghi.**
- [ ] **PERF-02.11** Chiến lược **no persistent PII cache**: chỉ memory cache mặc định; nếu dùng IndexedDB cần mã hóa/quy định lưu và cơ chế xóa; không đưa dữ liệu khách/lương/role vào localStorage thông thường.
- [ ] **PERF-02.12** Khi logout, đổi tài khoản, chi nhánh hoặc quyền: clear toàn bộ cache nhạy cảm và subscription, invalid session in-flight; backend/RLS vẫn xác minh quyền trên từng request.
- [ ] **PERF-02.13** Cache riêng từng subtab, tránh rời/đến voucher kéo luôn nhật ký audit; cache key của chi tiết theo UUID thật.
- [ ] **PERF-02.14** Quy hoạch giới hạn bộ nhớ: LRU/TTL, tối đa N module/resource và giới hạn kích thước record; không giữ hàng chục nghìn row/tệp ảnh trong DOM hoặc memory.
- [ ] **PERF-02.15** Định nghĩa sự kiện chia sẻ invalidation: `order.updated` → list đơn + KPI/stock nếu tác động; `appointment.updated` → lịch + Dashboard + staff workload; `ticket.updated` → Khiếu nại + Dashboard; `setting.updated` → resource cấu hình.

### Mẫu pseudo-code để triển khai (điều chỉnh theo router và Supabase thực tế)

```js
// Mẫu tư duy, KHÔNG phải mã copy đè trực tiếp; cần nối auth/scope,
// in-flight version, invalidation và lifecycle thật của PawPal.
const resources = new Map();

async function getResource(key, fetcher, { ttlMs = 60_000, force = false } = {}) {
  const now = Date.now();
  let entry = resources.get(key);
  if (entry?.inFlight) return entry.inFlight;
  if (!force && entry?.hasLoaded && now - entry.updatedAt < ttlMs) {
    return entry.data;
  }
  const version = (entry?.version || 0) + 1;
  const job = Promise.resolve().then(fetcher).then((data) => {
    const latest = resources.get(key);
    if (latest?.version === version) {
      resources.set(key, {
        data, hasLoaded: true, updatedAt: Date.now(),
        version, inFlight: null, error: null
      });
    }
    return data;
  }).catch((error) => {
    const latest = resources.get(key);
    if (latest?.version === version) {
      resources.set(key, { ...latest, inFlight: null, error });
    }
    throw error;
  });
  resources.set(key, {
    ...entry, data: entry?.data, hasLoaded: entry?.hasLoaded || false,
    updatedAt: entry?.updatedAt || 0, version, inFlight: job
  });
  return job;
}

function invalidateResource(key) {
  const entry = resources.get(key);
  if (entry) resources.set(key, {
    ...entry, updatedAt: 0, version: entry.version + 1,
    inFlight: null
  });
}
```

> **Lưu ý race-condition:** Mẫu trên minh họa chiến lược; `invalidateResource()` không tự hủy HTTP request cũ, nên code thật cần kiểm tra `version` ở mọi callback, xử lý refresh ngay sau invalidate nếu màn hình đang hiện, và không làm mất promise của thao tác ghi. Nếu dùng thư viện cache có sẵn trong dự án, ưu tiên dùng thư viện đó thay vì tự viết lại.

**PASS:** test A→B→A trong TTL không có GET trùng; một tài nguyên bị invalidate chỉ tái tải một lần; logout/đổi chi nhánh không thấy dữ liệu cũ; fetch lỗi không bị cache là thành công.

---

## GIAI ĐOẠN 3 — CHIA NHỎ LUỒNG ĐỌC THEO 8 PHÂN HỆ

**Quy tắc thống nhất:** `LIST/SEARCH/FILTER` chỉ dùng dữ liệu cần cho danh sách; `DETAIL` theo `id`; `HISTORY` chỉ tải khi bấm xem; trang tiếp theo qua server pagination. Không thêm cột/table/enum giả định nếu chưa so schema.

### 3.1 Dashboard — `dashboard.js`

- [ ] **PERF-03.D01** Liệt kê 11 nguồn dữ liệu ở `loadDashboardData`; phân loại widget nào thật sự cần mỗi nguồn, loại bỏ bảng không dùng ở màn hình đầu.
- [ ] **PERF-03.D02** Thay tải tối đa 500 đơn + 500 lịch rồi tính KPI tại client bằng các query tổng hợp/count hoặc **view/RPC aggregate** đúng định nghĩa doanh thu (`D-01`); xin phê duyệt định nghĩa kế toán trước.
- [ ] **PERF-03.D03** KPI trên màn hình render độc lập; widget doanh thu bị lỗi không khóa thống kê lịch hoặc ticket.
- [ ] **PERF-03.D04** Chỉ load danh sách lịch/ngày đang chọn; chuyển tháng → fetch phạm vi tháng đó, cache theo range.
- [ ] **PERF-03.D05** Realtime chỉ invalidate KPI/widget chịu ảnh hưởng; không reset cả dashboard cho mỗi `support_ticket`/`chat_conversation`.
- [ ] **PERF-03.D06** Giữ cache dashboard khi chuyển đi; `focus` sau 5 phút chỉ làm mới khi module hiện; test `D-04`,`D-08`,`D-10`,`D-11`.

**PASS:** Dashboard hiện skeleton KPI riêng; dữ liệu chuẩn so sánh DB; click 5 module quay lại không chờ dựng toàn bộ KPI nếu cache còn hợp lệ.

### 3.2 Khách hàng — `customers.js`, `tab-customer-*.js`

- [ ] **PERF-03.C01** Trang danh sách: query `customer + customer_profile` với cột tối thiểu, phân trang tại server (`range`, sort ổn định), tìm kiếm server có debounce 250–400ms.
- [ ] **PERF-03.C02** Không tải toàn bộ `sales_order`, `appointment`, `support_ticket`, `paw_point_transaction` trong lần mở danh sách.
- [ ] **PERF-03.C03** Bấm hồ sơ 360° mới tải đơn, lịch, pet, ticket **theo `customer_id`**, có `.limit`/cursor rõ ràng.
- [ ] **PERF-03.C04** Subtab PawPoints mới tải ledger theo khách và trang; summary dựa nguồn số dư authoritative, không cộng giả từ 500 giao dịch gần nhất.
- [ ] **PERF-03.C05** Sau thêm/sửa khách hoặc cộng/trừ điểm, invalidation đúng danh sách + hồ sơ + balance (`C-04`, `C-10`).
- [ ] **PERF-03.C06** Kiểm thử tìm kiếm khách cuối cùng sau 5.000 khách; không bị mất khách do limit cũ, không lộ khách ngoài chi nhánh/quyền.

**PASS:** lần đầu có danh sách trong khi lịch sử tải sau; quay lại tab danh sách không gọi 9 nguồn; hồ sơ đúng theo ID.

### 3.3 Thú cưng — `pets.js`, `tab-pet-*.js`

- [ ] **PERF-03.P01** Gỡ vòng `for offset += 1000` đọc hết `care_log` khỏi loader danh sách thú cưng (`pets.js:226–233`).
- [ ] **PERF-03.P02** Trang danh sách chỉ lấy pet + owner tối thiểu, có phân trang/filter tại DB.
- [ ] **PERF-03.P03** Chỉ khi mở profile/care log của **một pet** mới `care_log.eq('pet_id', petId).order(...).range(...)`; có trạng thái trang tiếp theo.
- [ ] **PERF-03.P04** Lịch sử cân nặng query theo `pet_id`, theo 10–30 bản ghi/giai đoạn; bỏ cơ chế lấy toàn bảng rồi `Promise.race(5s)` biến timeout thành `[]` (`P-16`).
- [ ] **PERF-03.P05** Tab nhắc tiêm/reminders load dữ liệu riêng; không ép danh sách pet chờ lịch tiêm và nhật ký dài.
- [ ] **PERF-03.P06** Sau lưu cân nặng/nhật ký, cập nhật đúng cache của pet, owner và tab đang mở; không refresh 8 nguồn không liên quan.

**PASS:** thú cưng có 20.000 care logs vẫn vào danh sách nhanh; click pet A chỉ tải log của A; timeout hiển thị lỗi, không giả “không có lịch sử”.

### 3.4 Dịch vụ — `services.js`, `tab-service-*.js`

- [ ] **PERF-03.S01** Tách 9 query `Promise.all` của loader core theo tab: `bookings-list`, `service-catalog`, `service-reviews`, `booking-detail`.
- [ ] **PERF-03.S02** Danh sách lịch hẹn dùng cột minimal (`id`, status/date/time, service/customer/pet names nếu cần), range theo ngày/tuần, hạn chế join lồng 2–3 tầng.
- [ ] **PERF-03.S03** Mở chi tiết ca mới lấy SOP, các bước chăm sóc, care_log, hình ảnh, ghi chú; chỉ theo `appointment_id`.
- [ ] **PERF-03.S04** Tab Danh mục lấy service và bảng giá theo dịch vụ/trang; tab Đánh giá chỉ query review khi tab được chọn.
- [ ] **PERF-03.S05** Không lấy `care_log` toàn hệ thống để hiển thị màn lịch; không bỏ log quan trọng — thay bằng lazy detail.
- [ ] **PERF-03.S06** Sau nhận/hủy/hoàn thành ca, invalidate lịch/ngày và số ca staff; không hiển thị cache cũ (`S-03`,`S-11`,`S-21`).

**PASS:** chuyển Lịch ↔ Danh mục ↔ Đánh giá không lặp 9 queries; chi tiết đúng ca; server xác minh quy tắc booking/availability như trước.

### 3.5 Bán hàng & Kho — `orders.js`, `tab-order-*.js`

- [ ] **PERF-03.O01** Phân tách loader: `order-list`, `order-detail`, `product-list/inventory`, `voucher-list`, `return-list`; không yêu cầu load xong toàn bộ categories/products/orders/vouchers để mở một tab đơn hàng.
- [ ] **PERF-03.O02** Xóa waterfall không bắt buộc: category & product chỉ tải song song nếu tab sản phẩm cần; đơn hàng không cần chờ catalog.
- [ ] **PERF-03.O03** Danh sách đơn có pagination tại DB với `id,order_code,status,total,created_at,...`; chi tiết và item theo `order_id` khi mở đơn.
- [ ] **PERF-03.O04** Product/stock có phân trang và query cột nhỏ; không tải mô tả dài/media khi render bảng tồn kho.
- [ ] **PERF-03.O05** Mutation POS, COD, nhập/xuất, hoàn trả: chỉ invalidation sau transaction/RPC server xác nhận; không dùng cache để quyết định tồn/tiền (`O-03`,`O-11`,`O-16`,`O-24`).
- [ ] **PERF-03.O06** Kiểm thử cạnh tranh 2 thu ngân sửa cùng sản phẩm; dữ liệu trên UI có thể ấm nhưng giao dịch phải kiểm tra phiên bản/số tồn authoritative.

**PASS:** vào Đơn hàng không tải cả kho; chuyển sang Sản phẩm mới tải kho; sau bán hàng dữ liệu tồn cập nhật đúng, không xuất âm/hoàn tiền giả.

### 3.6 Nhân sự — `staff.js`, `tab-staff-*.js`

- [ ] **PERF-03.N01** Danh sách nhân sự chỉ SELECT cột dùng cho bảng; tránh `staff.select('*')` cho tất cả staff.
- [ ] **PERF-03.N02** Chỉ load lịch phân ca cho tuần/ngày hiện tại + nhân viên thuộc phạm vi chi nhánh; khi tuần đổi fetch tuần mới.
- [ ] **PERF-03.N03** Chỉ load yêu cầu đổi ca khi vào tab liên quan, có pagination trạng thái; không `staff_shift_request.select('*')` mọi lần.
- [ ] **PERF-03.N04** Hồ sơ nhân viên/đánh giá/KPI chỉ fetch khi chọn nhân viên, kiểm quyền xem lương/hồ sơ trước mọi request.
- [ ] **PERF-03.N05** Khi đổi ca/khóa KTV, invalidation staff roster + dịch vụ + dashboard tương ứng (`N-27`,`N-28`); không đợi TTL 90s.
- [ ] **PERF-03.N06** Kiểm thử 200+ staff/1 năm lịch với DB staging; không dùng data mẫu thay thế.

**PASS:** tab Danh sách load độc lập Lịch/Đánh giá; chuyển tuần mượt; bảo vệ quyền HR/Manager.

### 3.7 Khiếu nại — `complaints.js`, `tab-complaint-*.js`

- [ ] **PERF-03.K01** Trang ticket chỉ query ticket summary và thông tin người phụ trách tối thiểu, filter status/type/priority tại server; phân trang.
- [ ] **PERF-03.K02** **Không `support_ticket_message.select('*')` toàn bảng** khi mới vào; chỉ lấy message khi mở ticket, theo `ticket_id`, cursor/limit.
- [ ] **PERF-03.K03** Hồ sơ liên quan: customer/pet/appointment/order được query theo **FK tham chiếu từ ticket**, không đọc 400 đơn/lịch toàn hệ thống rồi dò tên.
- [ ] **PERF-03.K04** Tách `services-ticket-list`, `orders-ticket-list`, `ticket-detail`; không refetch 9 nguồn khi chỉ đổi filter.
- [ ] **PERF-03.K05** Realtime tới ticket/message tương ứng thì merge/invalidate **đúng ticket**; không bị cache 90s ngăn (`K-20`).
- [ ] **PERF-03.K06** Kiểm thử ticket không có tham chiếu, RLS từ chối, ticket bị đóng trên tab khác; không hiển thị ảnh/chứng cứ giả (`K-03`,`K-19`).

**PASS:** 10.000 messages ở DB nhưng mở danh sách ticket nhanh; xem ticket A chỉ load message A; có khách nhắn mới không cần refresh full 9 bảng.

### 3.8 Cấu hình — `settings.js`, `tab-settings-*.js`

- [ ] **PERF-03.CFG01** Bỏ full `loadSettingsModuleData()` ở cả top-level và `init` nếu cùng một lượt mount; thêm single-flight để tránh trùng.
- [ ] **PERF-03.CFG02** Chia resource: voucher/banner, blog/knowledge, system policy, audit_log; tab đang mở chỉ lấy phần đang xem.
- [ ] **PERF-03.CFG03** `audit_log` phân trang theo thời gian; blog content/image/video chỉ query detail khi mở bài viết.
- [ ] **PERF-03.CFG04** Bỏ `select('*')` khi không cần; cấu hình trả về frontend **không kèm token/API key**, kể cả được cache (`CFG-01`).
- [ ] **PERF-03.CFG05** Cập nhật voucher chỉ invalidation voucher; blog chỉ invalidate blog; audit có thể cập nhật append row thay vì fetch 9 bảng (`CFG-09`).
- [ ] **PERF-03.CFG06** Focus trình duyệt chỉ refresh sau TTL và khi tab thật sự cần; không làm nhiều yêu cầu trùng nhau.
- [ ] **PERF-03.CFG07** Kiểm tra quyền `settings.read/write`, log audit và Safe Mode server-side; tốc độ nhanh không được đánh đổi với RLS/RBAC (`CFG-04`,`CFG-12`).

**PASS:** mở Voucher không tải tất cả audit/blog; khi voucher khác cập nhật, UI refresh đúng; không render dữ liệu key nhạy cảm.

---

## GIAI ĐOẠN 4 — REALTIME, EVENT LISTENER & POLLING

**Mục đích:** ngăn 1 thay đổi DB kéo theo 8–11 query lặp ở nhiều module cùng lúc.

- [ ] **PERF-04.01** Liệt kê tất cả `.channel(...).on('postgres_changes')`, `setInterval`, `window.focus`, `visibilitychange`, `DOMContentLoaded`, `admin:module-show` và nguồn gọi loader.
- [ ] **PERF-04.02** Đảm bảo **mỗi module chỉ có số subscription cần thiết**, không subscribe trùng khi đi ra/vào subtab nhiều lần.
- [ ] **PERF-04.03** Với module không còn hiển thị, chọn chính sách: unsubscribe + invalidate khi quay lại; hoặc giữ subscription chung ở app data layer nếu cần cập nhật xuyên phân hệ. Không tạo 8 bản duplicate cho cùng table.
- [ ] **PERF-04.04** Chuyển callback realtime thành `invalidate(table/entityId)` hoặc merge delta; chỉ refresh data đang hiển thị, có debounce 200–500ms cho burst event.
- [ ] **PERF-04.05** Tránh `cache TTL` vô tình chặn realtime (`D-04`, `K-20`); invalidate rõ ràng thay vì `load()` mặc định và bị return vì TTL.
- [ ] **PERF-04.06** Đảm bảo `window.focus` không ép refresh mọi module cùng lúc; thêm backoff/jitter khi nhiều admin cùng focus sau giờ nghỉ.
- [ ] **PERF-04.07** Nếu realtime mất kết nối, chỉ fallback polling tối thiểu cho resource quan trọng và khi module visible; có reconnect backoff. Không thêm polling 10 giây toàn bảng.
- [ ] **PERF-04.08** Dùng `initOnce` và cleanup cho listener cục bộ của calendar, table, modal (`D-08`); không gắn `keydown` toàn trang thêm một lần trên mỗi navigation.
- [ ] **PERF-04.09** Kiểm tra thứ tự event: user mở ticket A, realtime ticket B tới, UI A không bị nhảy về B; response cũ không overwrite mới.
- [ ] **PERF-04.10** Ghi số realtime message, fetch refresh và active channels ở dev metrics, bỏ log nhạy cảm trước production.

**PASS:** bắn 20 event test liên tiếp → số request được gom hợp lý, không nhân theo số lần mở module; dữ liệu đúng; listener counts ổn định sau 50 lượt đổi tab.

---

## GIAI ĐOẠN 5 — SUPABASE / POSTGRES PERFORMANCE (SAU KHI ĐÃ TÁCH QUERY)

**Mục đích:** giảm thời gian DB và dung lượng payload mà vẫn giữ RLS đúng. Không đoán lỗi index trước khi phân tích.

- [ ] **PERF-05.01** Ghi những query thực có p95 cao/tải nhiều bytes; xuất thông số DB từ Supabase Query Performance/pg_stat_statements (nếu có quyền).
- [ ] **PERF-05.02** Với query chậm, chạy `EXPLAIN (ANALYZE, BUFFERS)` **trên staging** hoặc truy vấn an toàn; kiểm tra Seq Scan, Sort, Join, count(*) và RLS overhead.
- [ ] **PERF-05.03** Xác minh các cột FK/filter/order trong schema trước khi đề nghị index: `chat_conversation.updated_at`, `appointment.appointment_date`, `sales_order.created_at`, `support_ticket.status/created_at`, `support_ticket_message.ticket_id/created_at`, `care_log.pet_id/recorded_at`, `staff_schedule.staff_id/date`, `audit_log.created_at` (chỉ index thật sự dùng và tồn tại).
- [ ] **PERF-05.04** Kiểm tra index phục vụ filter theo `branch_id`/tenant + ngày + trạng thái nếu schema có; không viết `CREATE INDEX` trước khi đối chiếu số bản ghi, planner và migration đang tồn tại.
- [ ] **PERF-05.05** `SELECT` đúng cột, loại bỏ payload lớn như note/body, JSON, ảnh và lịch sử khỏi list view. Kiểm tra PostgREST nested joins có gây response nặng.
- [ ] **PERF-05.06** Dùng server pagination (`range`/cursor) với order ổn định; không lặp page; không dùng `.limit(500)` toàn hệ thống rồi giả rằng đã có *toàn bộ* dữ liệu.
- [ ] **PERF-05.07** Count/KPI có thể dùng aggregate RPC/view **SECURITY INVOKER** hoặc chính sách được review kỹ; không vô tình dùng service-role cho mọi request từ frontend.
- [ ] **PERF-05.08** Kiểm tra RLS policy và quyền sau query refactor: user không đọc dữ liệu chi nhánh khác; kiểm tra auth JWT; không đưa service key vào JS.
- [ ] **PERF-05.09** Query thay đổi logic phân trang phải thử với 0, 1, 50, 1.000, 10.000+ record và cùng ngày/đồng thời cập nhật; tránh duplicate/missing pages.
- [ ] **PERF-05.10** Nếu có migration index: lưu SQL migration, rollback, kết quả EXPLAIN trước/sau và monitoring write overhead; không chạy index lớn đột xuất trên production.

**PASS:** query nóng có số đo p95/bytes trước/sau; không giảm bảo mật; không phát sinh thiếu dòng/khác KPI; có kế hoạch rollback DB.

---

## GIAI ĐOẠN 6 — HIỂN THỊ NHANH, LOADING & BỘ LỌC

**Mục đích:** ngay cả lần đầu fetch chậm, hệ thống vẫn dễ dùng; dữ liệu cached/stale được ghi rõ.

- [ ] **PERF-06.01** Cố định header/sidebar/filter trong lúc tải; chỉ skeleton bảng/chỉ số cần nạp (không skeleton toàn trang).
- [ ] **PERF-06.02** 4 trạng thái hiển thị bắt buộc: `loading lần đầu`, `loaded`, `stale đang cập nhật nền`, `error`. Không đồng nhất lỗi thành danh sách rỗng.
- [ ] **PERF-06.03** Hiện `Cập nhật lúc HH:mm` và badge “Đang đồng bộ” khi hiển thị cache stale; có nút refresh riêng theo phân hệ.
- [ ] **PERF-06.04** Khi đổi filter, giữ dữ liệu hiện tại trong lúc query mới, báo spinner nhỏ/disable chọn dòng nếu scope thay đổi khiến dữ liệu cũ không còn hợp lệ.
- [ ] **PERF-06.05** Debounce tìm kiếm 250–400ms; tránh query mỗi lần gõ một ký tự; request kết quả cũ không được overwrite query mới.
- [ ] **PERF-06.06** Render bảng lớn theo trang; nếu 200+ hàng vẫn lag, dùng virtualization hoặc giới hạn hàng DOM; không render tất cả khi tải 10.000 record.
- [ ] **PERF-06.07** Ảnh/avatar lazy load, kích thước thumbnail, tránh blob/base64 lớn trên list; không tải media nếu cột không xuất hiện.
- [ ] **PERF-06.08** Modal/Drawer mới tải dữ liệu detail khi mở và báo tải riêng, giữ trang danh sách tương tác được.
- [ ] **PERF-06.09** Không cho button ghi tiền/điểm/tồn kho dựa vào dữ liệu stale; gọi server validate lại và báo conflict rõ ràng.
- [ ] **PERF-06.10** Accessibility: skeleton có aria-busy, focus không nhảy loạn, scroll và filter được giữ khi quay lại; lỗi đủ dễ đọc.

**PASS:** lần đầu thấy UI tức thì; slow network vẫn cuộn/lọc được; lỗi API không thành “0 khách/0 doanh thu”; thao tác ghi kiểm tra dữ liệu mới nhất.

---

## GIAI ĐOẠN 7 — KIỂM THỬ TÍCH HỢP, HỒI QUY & ĐO TĂNG TỐC

**Bắt buộc dùng staging, test cùng branch và role.** Mỗi bài test ghi: `PASS/FAIL`, dữ liệu đầu vào, request log, thời gian trước/sau, ảnh/clip nếu UI, mã commit sửa.

| ID | Tình huống kiểm thử | Kết quả mong đợi | PASS |
|---|---|---|:---:|
| PERF-T01 | Mở Admin lần đầu (cold cache) | Không trắng trang lâu; skeleton đúng; request có limit | ☐ |
| PERF-T02 | Dashboard → Khách hàng → Dashboard trong 30s | Không fetch lại 11 nguồn nếu không có thay đổi | ☐ |
| PERF-T03 | Khách hàng → Thú cưng → Dịch vụ → quay Khách hàng | Filter, danh sách, scroll giữ; GET trùng bằng 0 trong TTL | ☐ |
| PERF-T04 | 30 lần bấm liên tục A↔B | Không nhân listener, channel, request | ☐ |
| PERF-T05 | Click A→B→C thật nhanh | UI cuối vẫn là C; response A/B không ghi đè | ☐ |
| PERF-T06 | Khách hàng 0 bản ghi | Vẫn cache trạng thái loaded; không fetch vô hạn | ☐ |
| PERF-T07 | Thú cưng có 10.000 care logs | Pet list không tải 10.000 logs; profile log phân trang | ☐ |
| PERF-T08 | Dịch vụ tab Booking↔Catalog↔Reviews | Mỗi tab query đúng dữ liệu; không kéo 9 nguồn | ☐ |
| PERF-T09 | Bán hàng cập nhật stock từ user A khi user B đang mở kho | User B thấy trạng thái mới; tạo giao dịch kiểm tồn tại server | ☐ |
| PERF-T10 | Nhân sự đổi ca, Dịch vụ đang xem phân công | Invalidation đúng; không gán nhầm staff/khóa | ☐ |
| PERF-T11 | Khiếu nại thêm 1 tin vào ticket A | Chỉ ticket A cập nhật; không full reload 9 bảng | ☐ |
| PERF-T12 | Cấu hình thay đổi 1 voucher | Voucher cập nhật; audit/log đúng; không fetch full blog/notification | ☐ |
| PERF-T13 | Mất mạng 10s khi đã có cached data | Vẫn thấy cache với stale/error; không báo 0 | ☐ |
| PERF-T14 | API 403/RLS từ chối | Hiện lỗi, không cache data sai; không lộ dữ liệu | ☐ |
| PERF-T15 | Logout A, login B, cùng thiết bị | Không còn danh sách, chi tiết, notes của A | ☐ |
| PERF-T16 | Đổi branch X→Y | Không thấy dữ liệu X trong Y; cache key tách | ☐ |
| PERF-T17 | Realtime phát 20 events trong 1s | Số refresh được gom, không vượt rate budget đã đặt | ☐ |
| PERF-T18 | Back/forward URL, F5 sâu vào subtab | Khôi phục đúng module và subtab, không init duplicate | ☐ |
| PERF-T19 | Một bảng chậm 10s, bảng khác nhanh | Widget/list còn lại không bị khóa; có timeout/cancel hợp lệ | ☐ |
| PERF-T20 | 2 admin sửa cùng order/ticket | Không overwrite lặng lẽ, server xử lý conflict | ☐ |
| PERF-T21 | Trạng thái thanh toán/COD/hoàn tiền | Không sai business logic sau tối ưu | ☐ |
| PERF-T22 | Dữ liệu tăng 10 lần trên staging | p95 và payload vẫn trong ngân sách đã chốt | ☐ |
| PERF-T23 | Chạy 50 vòng chuyển 8 module | Heap/listener/channel ổn định sau GC; không memory leak | ☐ |
| PERF-T24 | Modal, subtab, filter, date-picker của 8 module | Nút thao tác hoạt động đúng một lần | ☐ |
| PERF-T25 | Tiện ích truy cập dữ liệu nhạy cảm từ role thấp | Backend 403/RLS; frontend không hiện cache/secret | ☐ |
| PERF-T26 | Đọc màn hình sau refresh nhanh (cache warmed) | P75/P95 đạt mục tiêu đã thống nhất hoặc được giải trình | ☐ |

### Cách tính kết quả định lượng

- Lấy **cùng máy, mạng, tài khoản, DB staging và cỡ dữ liệu** khi so before/after.
- Mỗi luồng lặp ≥30 lượt để tính p95; ghi cả **median**, **P75**, **P95**, **max** và bytes. Tránh dùng 1 lượt đẹp nhất làm kết quả.
- Chia kịch bản `cold` (không cache, tải lần đầu) và `warm` (cache đúng TTL) thành hai biểu đồ/bảng riêng.
- Không lấy giảm số GET làm thành công nếu sau đó số đơn/hồ sơ hiển thị thiếu hoặc sai thông tin.
- Tự động hóa Playwright/Cypress nếu dự án có; nếu chưa có, tối thiểu chạy ma trận manual với log Network và 2 tài khoản.

**PASS giai đoạn 7:** tất cả bài P0 data consistency/security PASS; các chỉ số performance cải thiện có thống kê; không regression 8 phân hệ.

---

## GIAI ĐOẠN 8 — PHÁT HÀNH, GIÁM SÁT & ROLLBACK

- [ ] **PERF-08.01** PR nhỏ theo giai đoạn: router/lifecycle; data store; mỗi module; realtime; DB; UI. Không merge tất cả 8 module và router trong 1 PR khó rollback.
- [ ] **PERF-08.02** Reviewer kiểm thử quyền/RLS riêng với các thay đổi cache và query, ưu tiên data correctness hơn cảm giác mượt.
- [ ] **PERF-08.03** Dùng feature flag cho loader mới trên staging; chuẩn bị bật theo 1–2 module trước, rồi 8 module.
- [ ] **PERF-08.04** Deploy canary nội bộ nếu hệ thống hỗ trợ; theo dõi API error rate, p95 query, payload, rate limit, counts request/tab, memory trước/sau.
- [ ] **PERF-08.05** Thu nhận phản hồi từ admin: A→B→A có còn phải đợi? Scroll/filter có mất? Có thấy stale/thiếu dòng không?
- [ ] **PERF-08.06** Nếu p95 xấu hơn > ngưỡng đã chốt hoặc dữ liệu sai, **tắt feature flag/rollback commit** ngay; migration DB nếu có rollback độc lập theo kế hoạch đã review.
- [ ] **PERF-08.07** Kiểm tra 24h/72h sau deploy khi có tải thật và realtime burst; không coi 1 phút demo nhanh là nghiệm thu.
- [ ] **PERF-08.08** Ghi lại sơ đồ lifecycle và quy tắc cache/invalidation trong tài liệu nhóm để lập trình viên thêm màn hình mới không mắc lại lỗi.

---

## 9. ƯU TIÊN THỰC TẾ / THỨ TỰ CẮT NGẮN THỜI GIAN

| Ưu tiên | Làm trước | Lý do |
|---|---|---|
| **P0 — phải kiểm chứng trước** | Giai đoạn 0 + đọc `admin.js`; xác nhận auth/RLS, dữ liệu authoritative | Không tối ưu nhầm chỗ hoặc rò dữ liệu |
| **P1 — nhanh cải thiện cảm nhận** | Giai đoạn 1 + cache single-flight (giai đoạn 2) | Không chờ full DB khi click và quay lại |
| **P1 — hiệu quả tải thực** | `pets.js` care_log; `complaints.js` ticket_message; `settings.js` 9 bảng lặp; `services.js` join sâu | Đây là các đường đọc có chi phí rõ trong code |
| **P1** | Khách hàng, Bán hàng, Nhân sự list/detail lazy + pagination | Giảm request/payload và chặn state stale |
| **P1** | Giai đoạn 4 realtime/invalidation | Không làm dữ liệu sai khi tăng cache |
| **P2** | Giai đoạn 5 index/aggregate theo số đo DB | Tránh tạo index vô ích hoặc sai schema |
| **P2** | Giai đoạn 6 trải nghiệm loading/virtualization | Giảm lag render và cảm giác chờ |
| **Gate triển khai** | Giai đoạn 7 và 8 | Không có test thì không xem là hoàn tất |

**Đề xuất chia việc nhóm:** một người phụ trách `admin.js` + store, mỗi người nhận 1–2 core module, một người đối chiếu schema/RLS và đo p95; người code chính review giao diện/semantics và merge từng phần. Tránh hai người cùng chỉnh router/store trên các branch khác nhau nếu chưa có interface thống nhất.

### Definition of Done (DoD) — bắt buộc trước khi tick “xong” một module

- [ ] Không fetch toàn bộ dữ liệu của subtab chưa mở.
- [ ] Danh sách có phân trang/sort/filter theo server nếu dữ liệu lớn; chi tiết theo UUID/FK thật.
- [ ] Quay lại trong TTL không chờ full loader; sau mutation/Realtime hiển thị dữ liệu mới.
- [ ] Không có request/lifecycle/listener trùng do navigation.
- [ ] Không mất dữ liệu, không phá nghiệp vụ, không mất quyền/RLS, không trả cache của user/branch cũ.
- [ ] Có log/bằng chứng đo `before` và `after` + checklist test PASS.
- [ ] PR review được, có đường rollback.

---

## 10. CẦN BỔ SUNG GÌ ĐỂ TRIỂN KHAI CHUẨN XÁC?

**Quan trọng nhất là `admin.js`** (hoặc file router thực dùng), vì quyết định nút chuyển phân hệ có `await` dữ liệu, có tạo lại HTML/JS hay có mount lại toàn module hay không. Các file nên cung cấp thêm:

1. `admin.js` + entry HTML/scripts của Admin + router sự kiện `admin:module-show`/`loadModule`.
2. Định nghĩa `window.getSupabaseClient`, hàm auth, chính sách role/branch (che token và secrets).
3. Schema SQL/metadata của các bảng `appointment`, `sales_order`, `support_ticket`, `support_ticket_message`, `care_log`, `pet_weight_history`, `staff_schedule`, `audit_log` và indexes; **không cần gửi dữ liệu khách thật**.
4. Một bản export Network HAR đã **xóa Authorization/cookie/token, query chứa PII** hoặc ảnh chụp waterfall với duration/response size.
5. Môi trường staging + tài khoản test theo vai trò nếu muốn xác nhận end-to-end (không gửi mật khẩu trong chat).

### Phân biệt phạm vi với các báo cáo trước

- `PAWPAL_ADMIN_AUDIT_LOI_8_PHAN_HE.md`: báo cáo **190 mục nghiệp vụ/bảo mật/hiệu năng**. Kế hoạch này **không đánh dấu những lỗi đó đã được sửa**; chỉ dẫn chiếu các lỗi ảnh hưởng tới tải dữ liệu.
- `PAWPAL_COPILOT_KE_HOACH_SUA_LOI_CHECKLIST_THEO_GIAI_DOAN.md`: kế hoạch **Chatbot/Copilot** riêng. Nếu router tải chatbot cùng 8 module, phải đo impact nhưng không trộn thay đổi AI 429/RAG vào sprint performance Admin.

---

## 11. BẢNG THEO DÕI TIẾN ĐỘ (CÓ THỂ COPY VÀO ISSUE TRACKER)

| Giai đoạn | Người phụ trách | Ngày bắt đầu | Ngày kiểm thử | Trạng thái | Commit/PR | Bằng chứng |
|---|---|---|---|---|---|---|
| 0 — Baseline | ... | ... | ... | ☐ Chưa làm | ... | ... |
| 1 — Router | ... | ... | ... | ☐ Chưa làm | ... | ... |
| 2 — Cache & Store | ... | ... | ... | ☐ Chưa làm | ... | ... |
| 3 — Dashboard | ... | ... | ... | ☐ Chưa làm | ... | ... |
| 3 — Customers | ... | ... | ... | ☐ Chưa làm | ... | ... |
| 3 — Pets | ... | ... | ... | ☐ Chưa làm | ... | ... |
| 3 — Services | ... | ... | ... | ☐ Chưa làm | ... | ... |
| 3 — Orders & Inventory | ... | ... | ... | ☐ Chưa làm | ... | ... |
| 3 — Staff | ... | ... | ... | ☐ Chưa làm | ... | ... |
| 3 — Complaints | ... | ... | ... | ☐ Chưa làm | ... | ... |
| 3 — Settings | ... | ... | ... | ☐ Chưa làm | ... | ... |
| 4 — Realtime | ... | ... | ... | ☐ Chưa làm | ... | ... |
| 5 — Database | ... | ... | ... | ☐ Chưa làm | ... | ... |
| 6 — UX | ... | ... | ... | ☐ Chưa làm | ... | ... |
| 7 — QA | ... | ... | ... | ☐ Chưa làm | ... | ... |
| 8 — Deploy | ... | ... | ... | ☐ Chưa làm | ... | ... |

**Nguyên tắc chốt:** chỉ tick PASS sau khi đã sửa, test, đo và xác nhận dữ liệu đúng trên staging. Tài liệu này là **kế hoạch**, không phải bằng chứng rằng hệ thống đã tăng tốc hay đã được triển khai.
