// Kiểm thử offline lớp tính toán tab Quản trị vận hành. Chạy: node scripts/test/dashboard_operations_metrics.cjs
// Dữ liệu dưới đây là fixture kiểm thử trong bộ nhớ, không ghi vào CSDL và không dùng trong giao diện.
const assert = require('node:assert/strict');
const path = require('node:path');
const M = require(path.join(__dirname, '../../pages/admin/modules/dashboard/operations-metrics.js'));

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log(`  ok  ${name}`); }
    catch (error) { console.error(`  FAIL ${name}`); throw error; }
}

const NOW = new Date('2026-11-09T03:00:00Z'); // 10:00 ngày 09/11/2026 giờ Việt Nam
const iso = (vnLocal) => new Date(`${vnLocal}+07:00`).toISOString();
const appt = (id, status, startVn, extra = {}) => ({
    id, appointment_code: `LH-${id}`, appointment_status: status, scheduled_start_at: iso(startVn),
    scheduled_end_at: extra.endVn ? iso(extra.endVn) : new Date(new Date(iso(startVn)).getTime() + 3_600_000).toISOString(),
    created_at: extra.created || iso('2026-11-08T08:00:00'), staff_id: extra.staff ?? null, items: extra.items || []
});

console.log('Khoảng thời gian và múi giờ');
test('Hôm nay theo giờ Việt Nam, kể cả khi UTC còn ngày hôm trước', () => {
    const p = M.resolvePeriod('today', new Date('2026-11-08T18:30:00Z')); // 01:30 ngày 09/11 tại VN
    assert.equal(p.from, '2026-11-09');
    assert.equal(p.startIso, '2026-11-09T00:00:00+07:00');
    assert.equal(p.endIso, '2026-11-10T00:00:00+07:00');
});
test('7 ngày gồm hôm nay, đủ 7 ngày', () => {
    const p = M.resolvePeriod('7d', NOW);
    assert.equal(p.from, '2026-11-03');
    assert.equal(p.days, 7);
});
test('Ngày tùy chọn không hợp lệ thì từ chối, không tạo truy vấn', () => {
    assert.equal(M.resolvePeriod('custom', NOW, { from: '2026-11-10', to: '2026-11-01' }).ok, false);
    assert.equal(M.resolvePeriod('custom', NOW, { from: '2026-02-30', to: '2026-03-01' }).ok, false);
    assert.equal(M.resolvePeriod('custom', NOW, { from: '2026-01-01', to: '2026-12-31' }).ok, false);
    assert.equal(M.resolvePeriod('custom', NOW, { from: '', to: '2026-11-01' }).ok, false);
    assert.equal(M.resolvePeriod('bogus', NOW).ok, false);
});
test('Lịch lúc 23:30 giờ VN thuộc đúng ngày đó trong mật độ lịch', () => {
    const map = M.appointmentHeatmap([appt('a', 'confirmed', '2026-11-08T23:30:00')]); // Chủ nhật
    assert.equal(map.matrix[6][23], 1);
    assert.equal(map.total, 1);
});

console.log('Trạng thái và đếm không trùng');
test('Phân loại đúng giá trị thật và giá trị cũ, không phân biệt hoa thường', () => {
    assert.equal(M.classifyAppointment('PENDING'), 'pending');
    assert.equal(M.classifyAppointment('checked_in'), 'checked_in');
    assert.equal(M.classifyAppointment('vang_mat'), 'no_show');
    assert.equal(M.classifyOrder('shipped'), 'shipping');
    assert.equal(M.classifyOrder('packing'), 'processing');
    assert.equal(M.classifyOrder('delivered'), 'completed');
    assert.equal(M.isTicketOpen('waiting_customer'), true);
    assert.equal(M.isTicketOpen('resolved'), false);
});
test('Trạng thái lạ được tách riêng để báo, không gộp nhầm', () => {
    const result = M.appointmentStatusBreakdown([appt('a', 'pending', '2026-11-09T09:00:00'), appt('b', 'weird_status', '2026-11-09T09:00:00')]);
    assert.equal(result.total, 2);
    assert.deepEqual(result.unknownStatuses, [{ status: 'weird_status', count: 1 }]);
});
test('Một lịch xuất hiện hai lần chỉ đếm một', () => {
    const a = appt('a', 'pending', '2026-11-09T09:00:00');
    assert.equal(M.appointmentStatusBreakdown([a, a]).total, 1);
    assert.equal(M.appointmentHeatmap([a, a]).total, 1);
});
test('Top dịch vụ cộng theo dòng, bỏ dòng hủy, lịch hủy và dòng addon', () => {
    const items = [
        { id: 'i1', service_id: 's1', name_snapshot: 'Tắm sấy', quantity: 1, status: 'pending' },
        { id: 'i2', service_id: 's2', name_snapshot: 'Cắt tỉa', quantity: 1, status: 'pending' },
        { id: 'i3', service_id: 's2', name_snapshot: 'Cắt tỉa', quantity: 1, status: 'cancelled' },
        { id: 'i4', service_id: null, service_addon_id: 'x', name_snapshot: 'Addon', quantity: 1, status: 'pending' }
    ];
    const list = M.topServices([
        appt('a', 'confirmed', '2026-11-09T09:00:00', { items }),
        appt('b', 'completed', '2026-11-09T11:00:00', { items: [{ id: 'i5', service_id: 's1', name_snapshot: 'Tắm sấy', quantity: 2, status: 'completed' }] }),
        appt('c', 'cancelled', '2026-11-09T12:00:00', { items: [{ id: 'i6', service_id: 's2', name_snapshot: 'Cắt tỉa', quantity: 5, status: 'pending' }] })
    ]);
    assert.deepEqual(list.map(s => [s.serviceId, s.quantity, s.appointmentCount]), [['s1', 3, 2], ['s2', 1, 1]]);
});
test('Đếm lịch cần xử lý: chờ xác nhận và lịch sắp tới chưa có KTV, không tính lịch đã có KTV', () => {
    const rows = [
        appt('a', 'pending', '2026-11-20T09:00:00'),
        appt('b', 'confirmed', '2026-11-09T15:00:00'),
        appt('c', 'confirmed', '2026-11-09T15:00:00', { items: [{ id: 'x', service_id: 's', staff_id: 'st1', status: 'pending' }] }),
        appt('d', 'confirmed', '2026-11-15T15:00:00')
    ];
    assert.deepEqual(M.countPendingAppointments(rows, NOW), { total: 2, pending: 1, unassigned: 1 });
});
test('Đơn cần xử lý gồm chờ xác nhận và đang chuẩn bị', () => {
    assert.equal(M.countActionOrders([
        { id: 1, order_status: 'pending' }, { id: 2, order_status: 'confirmed' }, { id: 3, order_status: 'shipped' }, { id: 4, order_status: 'draft' }
    ]), 3);
});

console.log('Nhân sự');
const period = M.resolvePeriod('today', NOW);
test('Ca nghỉ phép hoặc đã hủy không tính, nhân viên nghỉ việc không tính có ca', () => {
    const result = M.staffAllocation({
        appointments: [], now: NOW, period,
        staff: [{ id: 's1', full_name: 'An', employment_status: 'active' }, { id: 's2', full_name: 'Bình', employment_status: 'resigned' }, { id: 's3', full_name: 'Chi', employment_status: 'active' }],
        schedules: [
            { staff_id: 's1', start_at: iso('2026-11-09T08:00:00'), end_at: iso('2026-11-09T17:00:00'), schedule_status: 'active', availability_status: 'available' },
            { staff_id: 's2', start_at: iso('2026-11-09T08:00:00'), end_at: iso('2026-11-09T17:00:00'), schedule_status: 'active', availability_status: 'available' },
            { staff_id: 's3', start_at: iso('2026-11-09T08:00:00'), end_at: iso('2026-11-09T17:00:00'), schedule_status: 'active', availability_status: 'leave' }
        ]
    });
    assert.equal(result.staffWithShift, 1);
    assert.equal(result.onShiftNow, 1);
});
test('Mức sử dụng ca dựa trên thời lượng dòng dịch vụ; tỷ lệ hoàn thành N/A khi chưa có lịch kết thúc', () => {
    const result = M.staffAllocation({
        now: NOW, period,
        staff: [{ id: 's1', full_name: 'An', employment_status: 'active' }],
        schedules: [{ staff_id: 's1', start_at: iso('2026-11-09T08:00:00'), end_at: iso('2026-11-09T12:00:00'), schedule_status: 'active', availability_status: 'available' }],
        appointments: [
            appt('a', 'confirmed', '2026-11-09T09:00:00', { items: [{ id: 'i', service_id: 'x', staff_id: 's1', duration_minutes: 120, status: 'pending' }] })
        ]
    });
    const row = result.rows[0];
    assert.equal(row.assigned, 1);
    assert.equal(row.utilization, 0.5);
    assert.equal(row.completionRate, null);
});
test('Khung giờ thiếu người: 2 lịch cùng lúc, 1 nhân viên có ca; không có ca thì không kết luận', () => {
    const appointments = [appt('a', 'confirmed', '2026-11-09T09:00:00'), appt('b', 'confirmed', '2026-11-09T09:00:00')];
    const schedules = [{ staff_id: 's1', start_at: iso('2026-11-09T08:00:00'), end_at: iso('2026-11-09T17:00:00'), schedule_status: 'active', availability_status: 'available' }];
    const risk = M.capacityRisks(appointments, schedules, period);
    assert.equal(risk.evaluated, true);
    assert.equal(risk.items.length, 1);
    assert.equal(risk.items[0].demand, 2);
    assert.equal(risk.items[0].staffCount, 1);
    assert.equal(M.capacityRisks(appointments, [], period).evaluated, false);
});
test('Ngày có lịch nhưng chưa xếp ca nào: báo thiếu dữ liệu ca, không kết luận thiếu người', () => {
    const p7 = M.resolvePeriod('7d', NOW);
    const appointments = [appt('a', 'confirmed', '2026-11-05T09:00:00'), appt('b', 'confirmed', '2026-11-09T09:00:00'), appt('c', 'confirmed', '2026-11-09T09:00:00')];
    const schedules = [{ staff_id: 's1', start_at: iso('2026-11-09T08:00:00'), end_at: iso('2026-11-09T17:00:00'), schedule_status: 'active', availability_status: 'available' }];
    const risk = M.capacityRisks(appointments, schedules, p7);
    assert.deepEqual(risk.unscheduledDays.map(d => [d.dateKey, d.appointmentCount]), [['2026-11-05', 1]]);
    assert.deepEqual(risk.items.map(i => i.dateKey), ['2026-11-09']);
});
test('Cảnh báo nhân sự chỉ giữ khung giờ chưa qua', () => {
    const alerts = M.buildAlerts({
        now: NOW, pendingAppointments: [], activeOrders: [], openReturns: [], openTickets: [], stockRisks: [],
        capacity: { items: [
            { slot: new Date(iso('2026-11-09T08:00:00')).getTime(), demand: 3, staffCount: 1, label: 'đã qua' },
            { slot: new Date(iso('2026-11-09T14:00:00')).getTime(), demand: 2, staffCount: 1, label: 'sắp tới' }
        ] }
    });
    assert.deepEqual(alerts.map(a => a.ref), ['sắp tới']);
});
test('Giá trị thật trong CSDL: ưu tiên "Khẩn cấp" có dấu, đổi trả "da_duyet" còn mở', () => {
    assert.equal(M.isUrgentPriority('Khẩn cấp'), true);
    assert.equal(M.isUrgentPriority('Cao'), true);
    assert.equal(M.isUrgentPriority('Trung bình'), false);
    assert.equal(M.isReturnOpen('da_duyet'), true);
    assert.equal(M.isReturnOpen('received'), false);
});

console.log('Tồn kho');
test('Tồn khả dụng trừ giữ hàng; tồn tối thiểu = 0 không làm cảnh báo; tốc độ bán 0 thì không tính số ngày', () => {
    const risks = M.inventoryRisks([
        { product_variant_id: 'v1', sku: 'A', product_name: 'Hạt A', quantity_in_stock: 10, minimum_stock: 5 },
        { product_variant_id: 'v2', sku: 'B', product_name: 'Hạt B', quantity_in_stock: 3, minimum_stock: 0 },
        { product_variant_id: 'v3', sku: 'C', product_name: 'Hạt C', quantity_in_stock: 4, minimum_stock: 4 },
        { product_variant_id: 'v4', sku: 'D', product_name: 'Hạt D', quantity_in_stock: 100, minimum_stock: 5 }
    ], { reservedByVariant: new Map([['v1', 10]]), soldByVariant: new Map([['v4', 300]]) });
    const byId = Object.fromEntries(risks.map(r => [r.variantId, r]));
    assert.equal(byId.v1.level, 'out');
    assert.equal(byId.v1.available, 0);
    assert.equal(byId.v2, undefined);
    assert.equal(byId.v3.level, 'high');
    assert.equal(byId.v3.coverDays, null);
    assert.equal(byId.v4.level, 'watch'); // 10/ngày, đủ 10 ngày
    assert.equal(Math.round(byId.v4.coverDays), 10);
    assert.deepEqual(risks.map(r => r.variantId), ['v1', 'v3', 'v4']);
});

console.log('Chất lượng phục vụ');
test('Không có đánh giá thì trung bình là null, không phải 0; ẩn đánh giá bị từ chối', () => {
    const empty = M.serviceQuality({ reviews: [], ticketsInPeriod: [], openTickets: [], now: NOW });
    assert.equal(empty.averageRating, null);
    assert.equal(empty.medianFirstResponseHours, null);
    const q = M.serviceQuality({
        now: NOW,
        reviews: [{ rating: 5, review_status: 'published' }, { rating: 1, review_status: 'rejected' }, { rating: 3, review_status: 'pending' }],
        ticketsInPeriod: [
            { status: 'resolved', created_at: iso('2026-11-09T08:00:00'), first_response_at: iso('2026-11-09T09:00:00') },
            { status: 'pending', created_at: iso('2026-11-09T08:00:00'), first_response_at: iso('2026-11-09T11:00:00') }
        ],
        openTickets: [{ status: 'pending', created_at: iso('2026-11-09T08:00:00'), first_response_at: null }]
    });
    assert.equal(q.reviewCount, 2);
    assert.equal(q.averageRating, 4);
    assert.equal(q.medianFirstResponseHours, 2);
    assert.equal(q.ticketsResolved, 1);
    assert.equal(q.waitingFirstResponse, 1);
});

console.log('Cảnh báo vận hành');
test('Ngưỡng 15/30 phút cho lịch và đơn chờ xác nhận, khẩn cấp xếp trước', () => {
    const alerts = M.buildAlerts({
        now: NOW,
        pendingAppointments: [
            appt('a', 'pending', '2026-11-12T09:00:00', { created: iso('2026-11-09T09:50:00') }), // 10 phút: chưa cảnh báo
            appt('b', 'pending', '2026-11-12T09:00:00', { created: iso('2026-11-09T09:40:00') }), // 20 phút: cần xử lý
            appt('c', 'pending', '2026-11-12T09:00:00', { created: iso('2026-11-09T09:00:00') }), // 60 phút: khẩn cấp
            appt('d', 'pending', '2026-11-09T09:00:00', { created: iso('2026-11-09T08:58:00') })  // đã qua giờ hẹn
        ],
        activeOrders: [
            { id: 'o1', order_code: 'DH1', order_status: 'pending', created_at: iso('2026-11-09T09:50:00') },
            { id: 'o2', order_code: 'DH2', order_status: 'pending', created_at: iso('2026-11-09T09:20:00') },
            { id: 'o3', order_code: 'DH3', order_status: 'confirmed', created_at: iso('2026-11-09T01:00:00'), updated_at: iso('2026-11-09T05:00:00') }
        ],
        openReturns: [], openTickets: [], stockRisks: [], capacity: { items: [] }
    });
    const refs = alerts.map(a => `${a.ref}:${a.severity}`);
    assert.ok(!refs.some(r => r.startsWith('LH-a')));
    assert.ok(refs.includes('LH-b:warning'));
    assert.ok(refs.includes('LH-c:urgent'));
    assert.ok(refs.includes('LH-d:urgent'));
    assert.ok(!refs.some(r => r.startsWith('DH1')));
    assert.ok(refs.includes('DH2:urgent'));
    assert.ok(refs.includes('DH3:warning'));
    const firstWarning = alerts.findIndex(a => a.severity === 'warning');
    assert.ok(alerts.slice(firstWarning).every(a => a.severity === 'warning'));
});
test('Hỗ trợ: chưa phản hồi quá 4 giờ, ưu tiên khẩn thành khẩn cấp; ticket đã đóng bỏ qua', () => {
    const alerts = M.buildAlerts({
        now: NOW,
        openTickets: [
            { id: 't1', ticket_code: 'HT1', status: 'pending', priority: 'normal', created_at: iso('2026-11-09T05:00:00'), first_response_at: null },
            { id: 't2', ticket_code: 'HT2', status: 'processing', priority: 'urgent', created_at: iso('2026-11-08T05:00:00'), first_response_at: iso('2026-11-08T06:00:00') },
            { id: 't3', ticket_code: 'HT3', status: 'closed', priority: 'urgent', created_at: iso('2026-11-01T05:00:00'), first_response_at: null }
        ],
        pendingAppointments: [], activeOrders: [], openReturns: [], stockRisks: [], capacity: { items: [] }
    });
    assert.deepEqual(alerts.map(a => `${a.ref}:${a.severity}`).sort(), ['HT1:warning', 'HT2:urgent']);
});
test('Lịch đã xác nhận chưa có KTV trong 24 giờ tới thì cảnh báo', () => {
    const alerts = M.buildAlerts({
        now: NOW,
        pendingAppointments: [appt('e', 'confirmed', '2026-11-09T10:30:00'), appt('f', 'confirmed', '2026-11-09T18:00:00', { staff: 'st1' })],
        activeOrders: [], openReturns: [], openTickets: [], stockRisks: [], capacity: { items: [] }
    });
    assert.deepEqual(alerts.map(a => `${a.ref}:${a.severity}`), ['LH-e:urgent']);
});
test('Định dạng thời gian chờ', () => {
    assert.equal(M.formatWaiting(0.2), '12 phút');
    assert.equal(M.formatWaiting(5.5), '5 giờ');
    assert.equal(M.formatWaiting(72), '3 ngày');
    assert.equal(M.formatWaiting(null), '—');
});

console.log(`\nTất cả ${passed} kiểm thử đạt.`);
