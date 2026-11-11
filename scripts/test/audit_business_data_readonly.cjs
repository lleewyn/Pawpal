const fs = require('node:fs');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
  const credentials = fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt', 'utf8');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  try {
    await page.route('**/rest/v1/**', route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      const allowed = ['get_staff_login_context', 'admin_customer_page', 'own_complaint_reply_notices'];
      if (!['GET', 'HEAD'].includes(req.method()) && !allowed.some(name => path === '/rest/v1/rpc/' + name)) return route.abort();
      return route.continue();
    });
    await page.goto('https://pawpalgr3.vercel.app/admin/login');
    await page.locator('#inputAdminEmail').fill(credentials.match(/^Email: (.+)$/m)[1].trim());
    await page.locator('#inputAdminPassword').fill(credentials.match(/^Password: (.+)$/m)[1].trim());
    await page.locator('#btnSubmitAdminLogin').click();
    await page.waitForURL(url => !url.pathname.includes('login'));
    await page.waitForFunction(() => typeof window.getSupabaseClient === 'function');
    console.log('Authenticated; reading business tables only.');
    const result = await page.evaluate(async () => {
      const client = getSupabaseClient();
      const queries = {
        customer: 'id,customer_code,customer_status,note,created_at',
        customer_profile: 'customer_id,full_name,date_of_birth',
        customer_phone: 'id,customer_id,phone_number,is_primary',
        customer_address: 'id,customer_id,is_default',
        pet_profile: 'id,customer_id,pet_code,pet_name,date_of_birth,status',
        appointment: 'id,appointment_code,customer_id,pet_id,staff_id,appointment_status,scheduled_start_at,scheduled_end_at,check_in_time,check_out_time,note,created_at',
        appointment_item: 'id,appointment_id,service_id,service_addon_id,is_primary,quantity,unit_price,discount_amount,duration_minutes,status',
        sales_order: 'id,order_code,customer_id,order_status,note,created_at,shipped_at,delivered_at',
        sales_order_detail: 'id,order_id,quantity,unit_price,discount_amount',
        payment: 'id,payment_code,customer_id,payment_type,amount,transaction_status,order_id,appointment_id,succeeded_at,created_at',
        support_ticket: 'id,ticket_code,customer_id,order_id,appointment_id,subject,description,status,priority,created_at,first_response_at,closed_at,resolved_at',
        return_request: 'id,sales_order_id,reason,description,request_status,created_at',
        review: 'id,rating,review_content,review_status,sales_order_detail_id,appointment_item_id',
        staff: 'id,full_name,employment_status',
        staff_schedule: 'id,staff_id,start_at,end_at,schedule_status,reason',
        paw_point_transaction: 'id,customer_id,payment_id,review_id,points,description',
        inventory: 'product_variant_id,quantity_in_stock,minimum_stock',
        stock_reservation: 'id,product_variant_id,quantity,status,expires_at'
      };
      const data = {}, coverage = {};
      for (const [table, columns] of Object.entries(queries)) {
        const rows = [];
        const key = table === 'customer_profile' ? 'customer_id' : table === 'inventory' ? 'product_variant_id' : 'id';
        let count = null, error = null;
        for (let offset = 0; offset < 10000; offset += 500) {
          const res = await client.from(table).select(columns, { count: 'exact' }).order(key).range(offset, offset + 499);
          if (res.error) { error = { code: res.error.code, message: res.error.message }; break; }
          count = res.count;
          rows.push(...res.data);
          if (res.data.length < 500) break;
        }
        data[table] = rows;
        coverage[table] = { total: count, read: rows.length, complete: !error && rows.length === count, error };
      }
      const issues = [];
      const sample = (table, rows) => rows.slice(0, 12).map(row => row.appointment_code || row.order_code || row.customer_code || row.pet_code || row.ticket_code || row.payment_code || row.staff_code || row.id || row.customer_id || row.product_variant_id);
      const add = (key, table, rows, note) => { if (rows.length) issues.push({ key, table, count: rows.length, examples: sample(table, rows), note }); };
      const marker = /(?:\b(?:test|testing|demo|dummy|mock|seed|e2e|qa|fixture|sandbox|playwright|smoke|regression)\b|\b(?:QA|E2E)\d+|\bAPP-GEN-|giả lập|kiểm thử|thử nghiệm|du lieu mau|dữ liệu mẫu)/i;
      for (const [table, rows] of Object.entries(data)) {
        add('test_marker', table, rows.filter(row => marker.test(Object.entries(row).filter(([key]) => /code|name|note|description|subject|content|reason/.test(key)).map(([, value]) => value || '').join(' '))), 'Có từ khóa kiểm thử; chỉ là nghi vấn, chưa đủ căn cứ xóa.');
      }
      const index = table => new Map(data[table].map(row => [row.id, row]));
      const customers = index('customer'), pets = index('pet_profile');
      const today = new Date().toISOString().slice(0, 10), now = Date.now();
      const closed = value => /^(completed|complete|cancelled|canceled|expired|no_show|closed|resolved|rejected|refunded|returned|hoan_thanh|da_huy|da_dong|da_giai_quyet)$/i.test(String(value));
      const activeAppointment = row => /^(pending|confirmed|checked_in|in_progress)$/i.test(row.appointment_status);
      add('overdue_appointment', 'appointment', data.appointment.filter(row => activeAppointment(row) && Date.parse(row.scheduled_end_at) < now - 86400000), 'Lịch kết thúc hơn 24 giờ nhưng trạng thái vẫn mở; cần đối chiếu vận hành.');
      add('old_open_order', 'sales_order', data.sales_order.filter(row => /^(pending|confirmed|processing|shipping)$/i.test(row.order_status) && Date.parse(row.created_at) < now - 30 * 86400000), 'Đơn mở quá 30 ngày.');
      add('old_open_ticket', 'support_ticket', data.support_ticket.filter(row => !closed(row.status) && Date.parse(row.created_at) < now - 30 * 86400000), 'Yêu cầu chưa đóng quá 30 ngày.');
      add('old_pending_payment', 'payment', data.payment.filter(row => row.transaction_status === 'pending' && Date.parse(row.created_at) < now - 30 * 86400000), 'Thanh toán chờ quá 30 ngày; không tự đổi sang thành công hoặc hủy.');
      add('payment_without_business_link', 'payment', data.payment.filter(row => !row.order_id && !row.appointment_id), 'Thanh toán chưa liên kết đơn/lịch; có thể là nạp ví, cần đối chiếu loại thanh toán.');
      add('succeeded_payment_without_time', 'payment', data.payment.filter(row => row.transaction_status === 'succeeded' && !row.succeeded_at), 'Thanh toán thành công thiếu thời điểm thành công.');
      add('invalid_appointment_time', 'appointment', data.appointment.filter(row => Date.parse(row.scheduled_end_at) <= Date.parse(row.scheduled_start_at) || (row.check_out_time && row.check_in_time && Date.parse(row.check_out_time) < Date.parse(row.check_in_time))), 'Thứ tự thời gian không hợp lệ.');
      add('invalid_schedule_time', 'staff_schedule', data.staff_schedule.filter(row => Date.parse(row.end_at) <= Date.parse(row.start_at)), 'Ca có giờ kết thúc không sau giờ bắt đầu.');
      if (coverage.pet_profile.complete) add('appointment_pet_owner_mismatch', 'appointment', data.appointment.filter(row => pets.has(row.pet_id) && pets.get(row.pet_id).customer_id !== row.customer_id), 'Chủ nuôi trong lịch khác chủ hiện tại của bé; có thể do chuyển chủ, cần xác nhận.');
      for (const table of ['customer_profile', 'pet_profile']) add('future_birth_date', table, data[table].filter(row => row.date_of_birth > today), 'Ngày sinh trong tương lai.');
      for (const table of ['appointment_item', 'sales_order_detail']) add('invalid_item_amount', table, data[table].filter(row => Number(row.quantity) <= 0 || Number(row.unit_price) < 0 || Number(row.discount_amount) < 0 || Number(row.discount_amount) > Number(row.quantity) * Number(row.unit_price)), 'Số lượng hoặc tiền giảm giá bất hợp lý; chưa đối chiếu quy ước giảm giá theo đơn vị.');
      add('invalid_rating', 'review', data.review.filter(row => row.rating < 1 || row.rating > 5), 'Điểm đánh giá ngoài 1–5.');
      add('negative_inventory', 'inventory', data.inventory.filter(row => row.quantity_in_stock < 0 || row.minimum_stock < 0), 'Số tồn hoặc tồn tối thiểu âm; chỉ đọc, không thay đổi.');
      const links = [
        ['pet_profile','customer_id','customer'], ['appointment','customer_id','customer'], ['appointment','pet_id','pet_profile'], ['appointment','staff_id','staff'],
        ['appointment_item','appointment_id','appointment'], ['sales_order','customer_id','customer'], ['sales_order_detail','order_id','sales_order'],
        ['payment','customer_id','customer'], ['payment','order_id','sales_order'], ['payment','appointment_id','appointment'],
        ['support_ticket','customer_id','customer'], ['support_ticket','order_id','sales_order'], ['support_ticket','appointment_id','appointment'],
        ['return_request','sales_order_id','sales_order'], ['review','sales_order_detail_id','sales_order_detail'], ['review','appointment_item_id','appointment_item'],
        ['staff_schedule','staff_id','staff'], ['paw_point_transaction','customer_id','customer'], ['paw_point_transaction','payment_id','payment'], ['paw_point_transaction','review_id','review']
      ];
      for (const [table, field, parent] of links) if (coverage[parent].complete) {
        const parents = index(parent);
        add('unresolved_link:' + field, table, data[table].filter(row => row[field] && !parents.has(row[field])), 'Không thấy bản ghi cha trong phiên Admin này; có thể do RLS, chưa kết luận mất dữ liệu.');
      }
      const countsBy = (table, field) => data[table].reduce((acc, row) => { const key = row[field] ?? '(null)'; acc[key] = (acc[key] || 0) + 1; return acc; }, {});
      const groups = (rows, field) => { const map = new Map(); rows.forEach(row => { const list = map.get(row[field]) || []; list.push(row); map.set(row[field], list); }); return map; };
      for (const [table, flag] of [['customer_phone','is_primary'],['customer_address','is_default']]) {
        const entries = [...groups(data[table], 'customer_id')];
        add('multiple_defaults', table, entries.filter(([, rows]) => rows.filter(row => row[flag]).length > 1).map(([id]) => ({ customer_id: id })), 'Một khách có nhiều giá trị mặc định.');
        add('missing_default', table, entries.filter(([, rows]) => rows.every(row => !row[flag])).map(([id]) => ({ customer_id: id })), 'Có dữ liệu nhưng chưa chọn mặc định.');
      }
      const profiles = new Set(data.customer_profile.map(row => row.customer_id));
      const testCustomerIds = new Set(data.customer.filter(row => marker.test([row.customer_code, row.note].join(' '))).map(row => row.id));
      data.customer_profile.filter(row => marker.test(row.full_name)).forEach(row => testCustomerIds.add(row.customer_id));
      const linkedTestCounts = {};
      for (const table of ['pet_profile','appointment','sales_order','payment','support_ticket','paw_point_transaction']) {
        linkedTestCounts[table] = data[table].filter(row => testCustomerIds.has(row.customer_id)).length;
      }
      if (coverage.customer_profile.complete) add('missing_customer_profile', 'customer', data.customer.filter(row => !profiles.has(row.id)), 'Khách chưa có hồ sơ tên.');
      if (coverage.appointment_item.complete) {
        const grouped = groups(data.appointment_item, 'appointment_id');
        add('appointment_without_items', 'appointment', data.appointment.filter(row => !grouped.has(row.id)), 'Lịch chưa có dòng dịch vụ.');
      }
      if (coverage.sales_order_detail.complete) {
        const grouped = groups(data.sales_order_detail, 'order_id');
        add('order_without_items', 'sales_order', data.sales_order.filter(row => !grouped.has(row.id)), 'Đơn chưa có dòng sản phẩm; bản nháp có thể hợp lệ.');
      }
      const textChanges = [];
      for (const [table, rows] of Object.entries(data)) {
        for (const row of rows) for (const field of ['full_name', 'pet_name', 'note', 'subject', 'description', 'review_content', 'reason']) {
          if (typeof row[field] !== 'string') continue;
          const before = row[field];
          const after = /^(full_name|pet_name|subject)$/.test(field) ? before.trim().replace(/[\t ]{2,}/g, ' ') : before.trim();
          if (before !== after) textChanges.push({ table, id: row.id || row.customer_id, field, before, after });
        }
      }
      const testDetails = {
        customers: data.customer_profile.filter(row => testCustomerIds.has(row.customer_id)).map(row => ({ id: row.customer_id, name: row.full_name })),
        appointments: data.appointment.filter(row => marker.test([row.appointment_code, row.note].join(' '))).map(row => ({ id: row.id, code: row.appointment_code, status: row.appointment_status, customer: row.customer_id, pet: row.pet_id, start: row.scheduled_start_at, end: row.scheduled_end_at, note: (row.note || '').slice(0,180), payments: data.payment.filter(p => p.appointment_id === row.id).map(p => ({ id: p.id, status: p.transaction_status, amount: p.amount })) })),
        pets: data.pet_profile.filter(row => marker.test([row.pet_code,row.pet_name].join(' '))).map(row => ({ id: row.id, code: row.pet_code, name: row.pet_name, customer: row.customer_id }))
      };
      return { checkedAt: new Date().toISOString(), coverage, issues, textChanges, testDetails, testCustomerLinks: { suspectedCustomers: testCustomerIds.size, dependentRows: linkedTestCounts }, statusCounts: {
        appointment: countsBy('appointment','appointment_status'), sales_order: countsBy('sales_order','order_status'),
        support_ticket: countsBy('support_ticket','status'), payment: countsBy('payment','transaction_status'),
        return_request: countsBy('return_request','request_status')
      }, limitations: ['Dữ liệu theo quyền nhìn thấy của phiên Admin (RLS).', 'Không đọc Auth, Logs, danh mục sản phẩm/dịch vụ; không ghi dữ liệu.', 'Từ khóa test và bản ghi cũ chỉ là dấu hiệu, không chứng minh được phép xóa.', 'Mỗi bảng tối đa 10.000 dòng, có kiểm tra số lượng và độ đầy đủ.'] };
    });
    fs.mkdirSync('docs/verification/data-audit', { recursive: true });
    const lines = ['# Rà soát dữ liệu nghiệp vụ — chỉ đọc', '', `Thời điểm UTC: ${result.checkedAt}`, '', '## Phạm vi đọc', ...Object.entries(result.coverage).map(([table, info]) => `- ${table}: ${info.read}/${info.total ?? '?'} dòng; ${info.complete ? 'đọc đủ trong phạm vi RLS' : 'chưa đầy đủ'}${info.error ? '; lỗi: ' + info.error.message : ''}`), '', '## Phát hiện cần xác nhận', ...result.issues.flatMap(issue => [`### ${issue.key} — ${issue.table}: ${issue.count}`, issue.note, `Mẫu mã/ID (tối đa 12): ${issue.examples.join(', ')}`, '']), '## Liên kết khách có dấu hiệu kiểm thử', `Số khách nghi vấn (không cộng trùng): ${result.testCustomerLinks.suspectedCustomers}`, ...Object.entries(result.testCustomerLinks.dependentRows).map(([table,count]) => `- ${table}: ${count}`), '', '## Phân bố trạng thái', ...Object.entries(result.statusCounts).flatMap(([table, values]) => [`### ${table}`, ...Object.entries(values).map(([state, count]) => `- ${state}: ${count}`)]), '', '## Giới hạn', ...result.limitations.map(text => '- ' + text)];
    fs.writeFileSync('docs/verification/data-audit/business-data-audit.md', lines.join('\n'), 'utf8');
    const draft = ['# Dự thảo làm sạch dữ liệu — chưa ghi Supabase', '', 'Chỉ là danh sách để xác định phạm vi; chưa thực hiện thêm, sửa hoặc xóa bản ghi.', '', '## Chuẩn hóa khoảng trắng (giữ nguyên ý nghĩa)', ...result.textChanges.flatMap(change => [`- ${change.table} / ${change.id} / ${change.field}`, `  - Trước: ${change.before.replace(/\n/g, ' / ')}`, `  - Sau: ${change.after.replace(/\n/g, ' / ')}`]), '', '## Khách có dấu hiệu kiểm thử', ...result.testDetails.customers.map(row => `- ${row.id}: ${row.name}`), '', '## Lịch có dấu hiệu kiểm thử', ...result.testDetails.appointments.flatMap(row => [`- ${row.code} / ${row.id}: ${row.status}; ${row.start} → ${row.end}`, `  - Ghi chú: ${row.note.replace(/\n/g,' / ')}`, `  - Thanh toán liên quan: ${row.payments.length}; ${row.payments.map(p => p.status + ': ' + p.amount).join('; ') || 'không có trong phạm vi phiên Admin'}`]), '', '## Thú cưng có dấu hiệu kiểm thử', ...result.testDetails.pets.map(row => `- ${row.code} / ${row.id}: ${row.name}`)];
    fs.writeFileSync('docs/verification/data-audit/cleanup-draft.md', draft.join('\n'), 'utf8');
    console.log(JSON.stringify({ checkedAt: result.checkedAt, textChanges: result.textChanges, testDetails: result.testDetails, testCustomerLinks: result.testCustomerLinks, errors: Object.entries(result.coverage).filter(([,value]) => !value.complete) }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
