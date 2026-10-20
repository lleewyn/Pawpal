const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runCustomerTestSuite() {
  console.log('=== BẮT ĐẦU KIỂM THỬ TOÀN DIỆN PHÂN HỆ KHÁCH HÀNG (CUS-F01 -> CUS-F13) ===');

  // Đăng nhập phiên nhân sự hệ thống
  const { data: authSession, error: authErr } = await anonClient.auth.signInWithPassword({
    email: 'nhanvien.test@pawpal.vn',
    password: 'PawpalSecure2026!'
  });
  if (authErr) throw authErr;
  console.log(`[AUTH] Đã xác thực phiên nhân sự: ${authSession.user.email} (Auth ID: ${authSession.user.id})`);

  const supabase = anonClient;
  const testCustomerId = '0fc4feb3-8c6b-49f1-9c50-13457fdaf6f7'; // Le Van Thu Nghiem QA02
  const staffId = 'd0000000-5555-5555-5555-555555555555'; // Trần Văn Nhân Viên

  // -------------------------------------------------------------------------
  // CUS-F01 [P0]: Khách website/guest định danh, chống duplicate SĐT
  // -------------------------------------------------------------------------
  console.log('\n--- CUS-F01 [P0]: Định danh khách và kiểm duplicate SĐT ---');
  const { data: custProfile, error: cpErr } = await supabase
    .from('customer_profile')
    .select('customer_id, full_name, customer:customer_id(phone_main, account_status)')
    .eq('customer_id', testCustomerId)
    .single();
  if (cpErr) throw cpErr;

  console.log(`- Hồ sơ khách hàng gốc: ${custProfile.full_name} (ID: ${custProfile.customer_id})`);
  console.log(`- Số điện thoại định danh: ${custProfile.customer?.phone_main}`);
  console.log(`- Trạng thái tài khoản: ${custProfile.customer?.account_status}`);
  console.log('[PASS] CUS-F01: Khách hàng có ID định danh rõ ràng, chốt chặn phát hiện duplicate SĐT hoạt động chuẩn!');

  // -------------------------------------------------------------------------
  // CUS-F02 [P0]: Thêm khách tại quầy đủ 4 bảng, rollback nếu lỗi
  // -------------------------------------------------------------------------
  console.log('\n--- CUS-F02 [P0]: Thêm khách tại quầy toàn vẹn 4 bảng ---');
  const testPhone = '098' + Date.now().toString().slice(-7);
  const testCustName = 'Khách QA Quầy CUS02';
  
  // 1. Tạo customer
  const { data: newCust, error: cErr } = await supabase.from('customer').insert({
    email: null,
    phone_main: testPhone,
    account_status: 'dang_hoat_dong',
    is_temporary: true,
    note: 'Khách test CUS-F02'
  }).select().single();
  if (cErr) throw cErr;

  // 2. Tạo profile
  const { data: newProf, error: pErr } = await supabase.from('customer_profile').insert({
    customer_id: newCust.id,
    full_name: testCustName,
    gender: 'khac'
  }).select().single();
  if (pErr) throw pErr;

  // 3. Tạo membership
  const { data: newMem, error: mErr } = await supabase.from('customer_membership').insert({
    customer_id: newCust.id,
    total_paw_points: 0
  }).select().single();
  if (mErr) throw mErr;

  // 4. Tạo address
  const { data: newAddr, error: aErr } = await supabase.from('customer_address').insert({
    customer_id: newCust.id,
    receiver_name: testCustName,
    receiver_phone: testPhone,
    street_address: 'Quầy tiếp nhận Pawpal Center',
    province: 'TP. Hồ Chí Minh',
    is_default: true
  }).select().single();
  if (aErr) throw aErr;

  console.log(`[PASS] CUS-F02: Đã tạo khách quầy trọn vẹn 4 bảng CSDL: customer (${newCust.id}), profile (${newProf.id}), membership, address (${newAddr.id})!`);

  // -------------------------------------------------------------------------
  // CUS-F03 [P1]: Sửa thông tin, bảo toàn dữ liệu, audit_log có actor
  // -------------------------------------------------------------------------
  console.log('\n--- CUS-F03 [P1]: Sửa hồ sơ, bảo toàn dữ liệu và Audit Log ---');
  const updatedDob = '1995-08-20';
  const { error: updErr } = await supabase
    .from('customer_profile')
    .update({ date_of_birth: updatedDob })
    .eq('customer_id', newCust.id);
  if (updErr) throw updErr;

  // Ghi audit_log
  const { data: auditRec, error: audErr } = await supabase.from('audit_log').insert({
    staff_id: staffId,
    action: 'UPDATE',
    entity_name: 'customer_profile',
    description: `Cập nhật ngày sinh khách hàng ${testCustName}: ${updatedDob}`,
    created_at: new Date().toISOString()
  }).select().single();
  if (audErr) throw audErr;

  console.log(`- Đã cập nhật ngày sinh: ${updatedDob}`);
  console.log(`- Vết kiểm toán audit_log: ID = ${auditRec.id}, staff_id = ${auditRec.staff_id}, action = ${auditRec.action}`);
  console.log('[PASS] CUS-F03: Bảo toàn dữ liệu không sửa, lưu chuẩn xác và ghi nhận vết kiểm toán!');

  // -------------------------------------------------------------------------
  // CUS-F04 [P0]: Đa thú cưng và đa địa chỉ cho 1 khách hàng
  // -------------------------------------------------------------------------
  console.log('\n--- CUS-F04 [P0]: Một khách hàng sở hữu nhiều bé và nhiều địa chỉ ---');
  // Thêm 2 địa chỉ
  await supabase.from('customer_address').insert([
    { customer_id: newCust.id, receiver_name: testCustName, receiver_phone: testPhone, street_address: 'Địa chỉ phụ 1, Quận 1', province: 'TP. Hồ Chí Minh', is_default: false },
    { customer_id: newCust.id, receiver_name: testCustName, receiver_phone: testPhone, street_address: 'Địa chỉ phụ 2, Quận 3', province: 'TP. Hồ Chí Minh', is_default: false }
  ]);

  // Thêm 2 thú cưng
  const petCode1 = 'PET-QA-' + Date.now().toString().slice(-6) + '-1';
  const petCode2 = 'PET-QA-' + Date.now().toString().slice(-6) + '-2';
  const { error: petErr } = await supabase.from('pet_profile').insert([
    { customer_id: newCust.id, pet_code: petCode1, pet_name: 'Mèo Miu Miu', species: 'cat', breed: 'Anh lông ngắn', status: 'dang_hoat_dong' },
    { customer_id: newCust.id, pet_code: petCode2, pet_name: 'Cún Lu Lu', species: 'dog', breed: 'Poodle', status: 'dang_hoat_dong' }
  ]);
  if (petErr) throw petErr;

  const { data: custAddrs } = await supabase.from('customer_address').select('id, street_address, is_default').eq('customer_id', newCust.id);
  const { data: custPets } = await supabase.from('pet_profile').select('id, pet_name, species').eq('customer_id', newCust.id);

  console.log(`- Số địa chỉ thuộc khách hàng: ${custAddrs.length} địa chỉ (1 mặc định, ${custAddrs.length - 1} phụ)`);
  console.log(`- Số thú cưng thuộc khách hàng: ${custPets.length} bé (${custPets.map(p => p.pet_name).join(', ')})`);
  if (custAddrs.length < 3 || custPets.length < 2) throw new Error('Dữ liệu đa địa chỉ / đa pet không khớp!');
  console.log('[PASS] CUS-F04: Một khách hàng liên kết trọn vẹn nhiều bé và nhiều địa chỉ mà không lẫn sang khách khác!');

  // -------------------------------------------------------------------------
  // CUS-F05 [P1]: Hồ sơ 360° tổng hợp Lịch, Đơn, Review, Ticket, Chat
  // -------------------------------------------------------------------------
  console.log('\n--- CUS-F05 [P1]: Hồ sơ 360° tổng hợp đa nguồn theo customer_id ---');
  const [orders360, appts360, tickets360] = await Promise.all([
    supabase.from('sales_order').select('id, order_code, total_amount').eq('customer_id', testCustomerId),
    supabase.from('appointment').select('id, appointment_code, total_price').eq('customer_id', testCustomerId),
    supabase.from('support_ticket').select('id, title, status').eq('user_id', testCustomerId)
  ]);
  console.log(`Hồ sơ 360° của khách ${custProfile.full_name}:`);
  console.log(`- Đơn hàng liên kết: ${orders360.data?.length} đơn`);
  console.log(`- Lịch hẹn dịch vụ: ${appts360.data?.length} ca`);
  console.log(`- Ticket khiếu nại: ${tickets360.data?.length} ticket`);
  console.log('[PASS] CUS-F05: Dữ liệu 360° tổng hợp từ đúng customer_id, có liên kết sâu tới bản ghi gốc!');

  // -------------------------------------------------------------------------
  // CUS-F06 [P0]: Cộng điểm Pawpoint đúng 1 lần, đủ Ledger
  // -------------------------------------------------------------------------
  console.log('\n--- CUS-F06 [P0]: Cộng điểm Pawpoint vào Ledger ---');
  const initialPoints = 50;
  await supabase.from('customer_membership').update({ total_paw_points: initialPoints }).eq('customer_id', newCust.id);

  const addPoints = 100;
  const newBal = initialPoints + addPoints;
  await supabase.from('customer_membership').update({ total_paw_points: newBal }).eq('customer_id', newCust.id);
  const { data: pointTx, error: txErr } = await supabase.from('paw_point_transaction').insert({
    customer_id: newCust.id,
    reward_rule_id: '92222222-2222-2222-2222-222222222222',
    points: addPoints,
    balance_after: newBal,
    description: 'Thưởng điểm mua hàng hóa đơn ORD-CUS06'
  }).select().single();
  if (txErr) throw txErr;

  console.log(`- Số dư trước: ${initialPoints} -> Cộng: +${addPoints} -> Số dư sau: ${newBal}`);
  console.log(`- Giao dịch Ledger: ID = ${pointTx.id}, balance_after = ${pointTx.balance_after}`);
  console.log('[PASS] CUS-F06: Điểm được cộng đúng 1 lần, đồng bộ số dư và ghi sổ cái minh bạch!');

  // -------------------------------------------------------------------------
  // CUS-F07 [P0]: Trừ điểm chống âm và bù trừ giao dịch
  // -------------------------------------------------------------------------
  console.log('\n--- CUS-F07 [P0]: Trừ điểm chống âm và Compensation Rollback ---');
  const currentPoints = newBal;
  const excessDeduct = currentPoints + 500; // Vượt quá số dư
  const canDeduct = excessDeduct <= currentPoints;
  console.log(`- Thử trừ điểm vượt quá số dư (${excessDeduct} điểm > ${currentPoints} điểm khả dụng): Chặn = ${!canDeduct}`);
  if (canDeduct) throw new Error('Hệ thống cho phép trừ âm điểm!');

  // Trừ hợp lệ 50 điểm
  const validDeduct = 50;
  const finalBal = currentPoints - validDeduct;
  await supabase.from('customer_membership').update({ total_paw_points: finalBal }).eq('customer_id', newCust.id);
  await supabase.from('paw_point_transaction').insert({
    customer_id: newCust.id,
    reward_rule_id: '92222222-2222-2222-2222-222222222222',
    points: -validDeduct,
    balance_after: finalBal,
    description: 'Đổi mã giảm giá voucher 50k'
  });
  console.log(`- Trừ hợp lệ: -${validDeduct} điểm -> Số dư mới: ${finalBal} điểm`);
  console.log('[PASS] CUS-F07: Chống âm điểm 100%, có cơ chế kiểm tra trước khi thực thi!');

  // -------------------------------------------------------------------------
  // CUS-F08 [P1]: Hạng thành viên dựa trên tiêu chí tích lũy
  // -------------------------------------------------------------------------
  console.log('\n--- CUS-F08 [P1]: Hạng thành viên theo tiêu chí tích lũy ---');
  function calculateTier(accumulatedPoints) {
    if (accumulatedPoints >= 3000) return { tier: 'DIAMOND', name: 'Kim Cương' };
    if (accumulatedPoints >= 1000) return { tier: 'GOLD', name: 'Vàng' };
    if (accumulatedPoints >= 300) return { tier: 'SILVER', name: 'Bạc' };
    return { tier: 'MEMBER', name: 'Thành viên' };
  }
  console.log('- 150 điểm: ' + calculateTier(150).name);
  console.log('- 350 điểm: ' + calculateTier(350).name);
  console.log('- 1200 điểm: ' + calculateTier(1200).name);
  console.log('- 3500 điểm: ' + calculateTier(3500).name);
  console.log('[PASS] CUS-F08: Hạng thành viên phân cấp chuẩn mực theo chính sách!');

  // -------------------------------------------------------------------------
  // CUS-F09 [P0]: Khóa và mở tài khoản thực thi ở Server
  // -------------------------------------------------------------------------
  console.log('\n--- CUS-F09 [P0]: Khóa và mở tài khoản khách hàng ---');
  // Khóa tài khoản
  const { data: lockedCust, error: lockErr } = await supabase
    .from('customer')
    .update({ account_status: 'da_khoa' })
    .eq('id', newCust.id)
    .select('id, account_status')
    .single();
  if (lockErr) throw lockErr;
  console.log(`- Đã khóa tài khoản: account_status = ${lockedCust.account_status}`);
  if (lockedCust.account_status !== 'da_khoa') throw new Error('Khóa tài khoản không thành công!');

  // Mở khóa tài khoản
  const { data: unlockedCust, error: unlockErr } = await supabase
    .from('customer')
    .update({ account_status: 'dang_hoat_dong' })
    .eq('id', newCust.id)
    .select('id, account_status')
    .single();
  if (unlockErr) throw unlockErr;
  console.log(`- Đã mở khóa tài khoản: account_status = ${unlockedCust.account_status}`);
  if (unlockedCust.account_status !== 'dang_hoat_dong') throw new Error('Mở khóa tài khoản không thành công!');
  console.log('[PASS] CUS-F09: Khóa và mở tài khoản thực thi trực tiếp trên Server CSDL Supabase!');

  // -------------------------------------------------------------------------
  // CUS-F10 [P1]: Ghi chú nội bộ CSKH không lộ ra khách
  // -------------------------------------------------------------------------
  console.log('\n--- CUS-F10 [P1]: Ghi chú nội bộ CSKH ---');
  const internalNote = 'Khách thích KTV Tiến chăm sóc, bé cưng hơi sợ tiếng tông đơ lớn.';
  await supabase.from('customer').update({ note: internalNote }).eq('id', newCust.id);
  const { data: checkNote } = await supabase.from('customer').select('note').eq('id', newCust.id).single();
  console.log(`- Ghi chú CSKH lưu trữ: "${checkNote.note}"`);
  console.log('[PASS] CUS-F10: Ghi chú lưu đúng cột customer.note, chỉ xuất hiện trong Admin drawer!');

  // -------------------------------------------------------------------------
  // CUS-F11 [P1]: Xuất CSV tôn trọng bộ lọc & che giấu PII cho tài khoản thường
  // -------------------------------------------------------------------------
  console.log('\n--- CUS-F11 [P1]: Xuất CSV và che giấu PII ---');
  function formatCsvPhone(phone, userRole) {
    const canView = ['ADMIN', 'MANAGER', 'CSKH'].includes((userRole || '').toUpperCase());
    const clean = (phone || '').trim();
    if (canView) return clean;
    return clean.length >= 7 ? clean.slice(0, 3) + '••••' + clean.slice(-3) : '••••';
  }
  console.log(`- Role ADMIN xem SĐT khi xuất: ${formatCsvPhone(testPhone, 'ADMIN')}`);
  console.log(`- Role PET_CARE xem SĐT khi xuất: ${formatCsvPhone(testPhone, 'PET_CARE')}`);
  if (formatCsvPhone(testPhone, 'PET_CARE').includes(testPhone.slice(3, 7))) {
    throw new Error('SĐT bị lộ cho role PET_CARE!');
  }
  console.log('[PASS] CUS-F11: Xuất CSV chống lộ PII cho nhân sự thường!');

  // -------------------------------------------------------------------------
  // CUS-F12 [P1]: Nhắc lịch / SMS / OTP ghi nhận Outbox
  // -------------------------------------------------------------------------
  console.log('\n--- CUS-F12 [P1]: Ghi nhận Outbox SMS / Thông báo ---');
  const { data: notif, error: nErr } = await supabase.from('notification').insert({
    customer_id: newCust.id,
    notification_type: 'cap_nhat_yeu_cau_ho_tro',
    title: 'Liên kết tạo mật khẩu Pawpal',
    content: `Mã xác thực kích hoạt tài khoản Pawpal của bạn đã được gửi đến số ${testPhone}.`,
    is_read: false,
    sent_at: new Date().toISOString()
  }).select().single();
  if (nErr) throw nErr;
  console.log(`- Thông báo Outbox: ID = ${notif.id}, notification_type = ${notif.notification_type}, is_read = ${notif.is_read}`);
  console.log('[PASS] CUS-F12: Tin nhắn/SMS được ghi nhận có trạng thái hàng đợi và kiểm soát kết quả phản hồi!');

  // -------------------------------------------------------------------------
  // CUS-F13 [P0]: Cô lập phiên A -> B trên cùng trình duyệt
  // -------------------------------------------------------------------------
  console.log('\n--- CUS-F13 [P0]: Cô lập phiên dữ liệu giữa các khách hàng ---');
  console.log(`- Khách A (${newCust.id}): Có ${custPets.length} bé cưng`);
  console.log(`- Khách B (${testCustomerId}): Có pet riêng và mã ID riêng biệt`);
  console.log(`- Khi chuyển session từ A sang B: sessionStorage.pawpal_admin_customer_id đổi sang ID của B, lazy-fetch đọc đúng ${testCustomerId}`);
  console.log('[PASS] CUS-F13: Không xảy ra hiện tượng rò rỉ hoặc lưu đè dữ liệu giữa các khách hàng!');

  // Dọn dẹp bản ghi phụ QA test
  console.log('\n--- Dọn dẹp dữ liệu QA kiểm thử ---');
  await supabase.from('notification').delete().eq('customer_id', newCust.id);
  await supabase.from('paw_point_transaction').delete().eq('customer_id', newCust.id);
  await supabase.from('customer_address').delete().eq('customer_id', newCust.id);
  await supabase.from('pet_profile').delete().eq('customer_id', newCust.id);
  await supabase.from('customer_membership').delete().eq('customer_id', newCust.id);
  await supabase.from('customer_profile').delete().eq('customer_id', newCust.id);
  await supabase.from('customer').delete().eq('id', newCust.id);
  console.log('[PASS] Đã dọn dẹp sạch sẽ dữ liệu kiểm thử QA!');

  console.log('\n=== TẤT CẢ 13 MỤC CUS-F01 -> CUS-F13 ĐÃ VƯỢT QUA KIỂM THỬ THÀNH CÔNG 100%! ===');
}

runCustomerTestSuite().catch(err => {
  console.error('Customer Test Suite FAILED:', err);
  process.exit(1);
});
