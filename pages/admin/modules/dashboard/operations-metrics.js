/**
 * Tab Quản trị vận hành — lớp tính toán thuần (không DOM, không Supabase).
 * Mọi hàm nhận dữ liệu thô đã đọc từ CSDL và trả về số liệu tổng hợp để hiển thị.
 * Dùng chung cho trình duyệt (window.PawpalOpsMetrics) và kiểm thử Node (module.exports).
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.PawpalOpsMetrics = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const TIME_ZONE = 'Asia/Ho_Chi_Minh';
    const DAY_MS = 86_400_000;
    const HOUR_MS = 3_600_000;
    const MAX_CUSTOM_DAYS = 92;

    // Ngưỡng cảnh báo (VH07). CSDL chưa lưu SLA nào cho lịch, đơn, hỗ trợ (pawpal_setting không có khóa này),
    // nên ngưỡng lịch và đơn lấy đúng như phân hệ Dịch vụ (services.js) và Bán hàng (orders.js) đang dùng;
    // ngưỡng hỗ trợ, đổi trả, tồn kho là đề xuất, chờ nghiệp vụ chốt.
    const THRESHOLDS = {
        appointmentPendingWarnMinutes: 15,   // lịch chờ xác nhận từ 15 phút: cần xử lý (như services.js)
        appointmentPendingUrgentMinutes: 30, // quá 30 phút: khẩn cấp (như services.js)
        appointmentStartSoonHours: 1,        // còn không quá 1 giờ tới giờ hẹn mà chưa xác nhận/chưa có KTV
        appointmentUnassignedHours: 24,      // lịch đã xác nhận trong 24 giờ tới mà chưa phân công KTV
        appointmentLateMinutes: 30,          // quá giờ hẹn 30 phút khách chưa đến
        orderPendingWarnMinutes: 15,         // đơn chờ xác nhận từ 15 phút (như orders.js)
        orderPendingUrgentMinutes: 30,       // quá 30 phút: khẩn cấp (như orders.js)
        orderProcessingHours: 4,             // đơn đã xác nhận từ 4 giờ chưa giao (như orders.js)
        returnPendingHours: 48,              // yêu cầu đổi trả chờ xử lý quá 48 giờ
        ticketFirstResponseHours: 4,         // yêu cầu hỗ trợ chưa phản hồi lần đầu quá 4 giờ
        ticketResolveHours: 48,              // chưa giải quyết quá 48 giờ
        ticketResolveUrgentHours: 24,        // mức ưu tiên cao hoặc khẩn: quá 24 giờ
        stockCoverHighDays: 7,               // đủ hàng dưới 7 ngày: ưu tiên cao
        stockCoverWatchDays: 14,             // đủ hàng dưới 14 ngày: cần theo dõi
        staffUtilizationHigh: 0.9,           // giờ phục vụ dự kiến vượt 90% giờ ca
        salesWindowDays: 30                  // cửa sổ tính tốc độ bán
    };

    // Nhóm trạng thái theo giá trị thật trong migrations (RPC ghi chữ thường) và các giá trị cũ còn đọc được.
    // So khớp không phân biệt hoa thường.
    const STATUS_GROUPS = {
        appointment: {
            pending: ['pending', 'cho_xac_nhan'],
            confirmed: ['confirmed', 'da_xac_nhan'],
            checked_in: ['checked_in'],
            in_progress: ['in_progress', 'dang_thuc_hien', 'processing'],
            completed: ['completed', 'da_hoan_tat', 'da_hoan_thanh'],
            cancelled: ['cancelled', 'canceled', 'da_huy'],
            no_show: ['no_show', 'vang_mat'],
            expired: ['expired', 'da_het_han', 'dang_giu_cho']
        },
        appointmentItem: {
            cancelled: ['cancelled', 'canceled', 'da_huy']
        },
        order: {
            pending: ['pending', 'draft', 'cho_xac_nhan'],
            processing: ['confirmed', 'packing', 'dang_dong_goi', 'da_xac_nhan'],
            shipping: ['shipped', 'shipping', 'dang_giao_hang', 'dang_giao'],
            completed: ['completed', 'delivered', 'da_giao_hang', 'da_giao'],
            cancelled: ['cancelled', 'canceled', 'da_huy'],
            returned: ['returned', 'da_tra_hang']
        },
        ticket: {
            closed: ['closed', 'resolved', 'completed', 'rejected', 'da_dong', 'da_giai_quyet', 'tu_choi']
        },
        returnRequest: {
            open: ['pending', 'approved', 'da_duyet']
        },
        schedule: {
            active: ['active'],
            available: ['available']
        },
        staff: {
            active: ['active']
        },
        reservation: {
            active: ['active']
        },
        review: {
            hidden: ['hidden', 'rejected']
        },
        productInactive: ['inactive', 'discontinued', 'ngung_ban'],
        // CSDL đang có cả giá trị tiếng Việt có dấu ("Khẩn cấp", "Cao") lẫn mã không dấu.
        urgentPriority: ['urgent', 'high', 'khan_cap', 'cao', 'khẩn cấp']
    };

    const APPOINTMENT_LABELS = {
        pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', checked_in: 'Khách đã đến', in_progress: 'Đang thực hiện',
        completed: 'Hoàn thành', no_show: 'Khách không đến', cancelled: 'Đã hủy', expired: 'Hết hạn giữ chỗ', other: 'Trạng thái khác'
    };
    const ORDER_LABELS = {
        pending: 'Chờ xác nhận', processing: 'Đang chuẩn bị', shipping: 'Đang giao',
        completed: 'Hoàn thành', cancelled: 'Đã hủy', returned: 'Trả hàng', other: 'Trạng thái khác'
    };
    const TONES = {
        pending: 'pending', confirmed: 'progress', checked_in: 'progress', in_progress: 'progress', processing: 'progress', shipping: 'progress',
        completed: 'done', cancelled: 'bad', no_show: 'bad', expired: 'neutral', returned: 'bad', other: 'neutral'
    };
    const WEEKDAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

    // ------------------------------------------------------------------
    // Thời gian theo múi giờ Việt Nam
    // ------------------------------------------------------------------
    const partsFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short'
    });
    const WEEKDAY_INDEX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

    function toDate(value) {
        if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
        if (value === null || value === undefined || value === '') return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function vnParts(value) {
        const date = toDate(value);
        if (!date) return null;
        const parts = {};
        for (const part of partsFormatter.formatToParts(date)) parts[part.type] = part.value;
        return {
            dateKey: `${parts.year}-${parts.month}-${parts.day}`,
            hour: Number(parts.hour),
            minute: Number(parts.minute),
            weekday: WEEKDAY_INDEX[parts.weekday]
        };
    }

    function vnDateKey(value) {
        return vnParts(value)?.dateKey || null;
    }

    function isDateKey(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
        const date = new Date(`${value}T00:00:00Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }

    function shiftDateKey(dateKey, days) {
        const date = new Date(`${dateKey}T00:00:00Z`);
        date.setUTCDate(date.getUTCDate() + days);
        return date.toISOString().slice(0, 10);
    }

    function daysBetween(fromKey, toKey) {
        return Math.round((new Date(`${toKey}T00:00:00Z`) - new Date(`${fromKey}T00:00:00Z`)) / DAY_MS);
    }

    // Mốc đầu ngày VN (UTC+7, Việt Nam không đổi giờ mùa hè) dạng ISO có múi giờ.
    function vnStartIso(dateKey) {
        return `${dateKey}T00:00:00+07:00`;
    }

    function formatDateKey(dateKey) {
        const [y, m, d] = dateKey.split('-');
        return `${d}/${m}/${y}`;
    }

    /**
     * Khoảng thời gian lọc. `to` là ngày cuối (bao gồm), truy vấn dùng [startIso, endIso).
     * Trả về { ok:false, error } khi ngày tùy chỉnh không hợp lệ để không gửi truy vấn.
     */
    function resolvePeriod(preset, now, custom = {}) {
        const today = vnDateKey(now || new Date());
        let from;
        let to = today;
        if (preset === 'today') from = today;
        else if (preset === '7d') from = shiftDateKey(today, -6);
        else if (preset === '30d') from = shiftDateKey(today, -29);
        else if (preset === '90d') from = shiftDateKey(today, -89);
        else if (preset === 'custom') {
            if (!isDateKey(custom.from) || !isDateKey(custom.to)) return { ok: false, error: 'Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc hợp lệ.' };
            if (custom.from > custom.to) return { ok: false, error: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' };
            if (daysBetween(custom.from, custom.to) + 1 > MAX_CUSTOM_DAYS) return { ok: false, error: `Khoảng ngày tùy chọn tối đa ${MAX_CUSTOM_DAYS} ngày.` };
            from = custom.from;
            to = custom.to;
        } else {
            return { ok: false, error: 'Khoảng thời gian không hợp lệ.' };
        }
        const days = daysBetween(from, to) + 1;
        return {
            ok: true, preset, from, to, days, today,
            startIso: vnStartIso(from),
            endIso: vnStartIso(shiftDateKey(to, 1)),
            label: from === to ? formatDateKey(from) : `${formatDateKey(from)} – ${formatDateKey(to)}`
        };
    }

    // ------------------------------------------------------------------
    // Phân loại trạng thái
    // ------------------------------------------------------------------
    function norm(value) {
        return String(value ?? '').trim().toLowerCase();
    }

    function inGroup(value, list) {
        const key = norm(value);
        return Boolean(key) && list.includes(key);
    }

    function classify(value, groups) {
        const key = norm(value);
        for (const [group, values] of Object.entries(groups)) {
            if (values.includes(key)) return group;
        }
        return 'other';
    }

    const classifyAppointment = status => classify(status, STATUS_GROUPS.appointment);
    const classifyOrder = status => classify(status, STATUS_GROUPS.order);
    const isTicketOpen = status => !inGroup(status, STATUS_GROUPS.ticket.closed);
    const isItemCancelled = status => inGroup(status, STATUS_GROUPS.appointmentItem.cancelled);
    const isReturnOpen = status => inGroup(status, STATUS_GROUPS.returnRequest.open);
    const isUrgentPriority = priority => inGroup(priority, STATUS_GROUPS.urgentPriority);

    // Lịch hợp lệ cho thống kê nhu cầu: loại lịch đã hủy và giữ chỗ đã hết hạn.
    function isValidAppointment(appointment) {
        const group = classifyAppointment(appointment?.appointment_status);
        return group !== 'cancelled' && group !== 'expired';
    }

    // Lịch đã có người phụ trách (ca hoặc ít nhất một dòng dịch vụ chưa hủy).
    function hasAssignedStaff(appointment) {
        return Boolean(appointment?.staff_id) || activeItems(appointment).some(item => item.staff_id);
    }

    function activeItems(appointment) {
        return (appointment?.items || []).filter(item => !isItemCancelled(item.status));
    }

    // ------------------------------------------------------------------
    // Biểu đồ trạng thái (VH-C01, VH-C02)
    // ------------------------------------------------------------------
    function statusBreakdown(rows, statusKey, classifier, labels) {
        const counts = new Map();
        const unknown = new Map();
        const seen = new Set();
        for (const row of rows || []) {
            if (!row || seen.has(row.id)) continue;
            seen.add(row.id);
            const group = classifier(row[statusKey]);
            counts.set(group, (counts.get(group) || 0) + 1);
            if (group === 'other') {
                const raw = String(row[statusKey] ?? '(trống)');
                unknown.set(raw, (unknown.get(raw) || 0) + 1);
            }
        }
        const order = Object.keys(labels);
        const items = order
            .filter(group => counts.get(group))
            .map(group => ({ key: group, label: labels[group], value: counts.get(group), tone: TONES[group] || 'neutral' }));
        return { total: seen.size, items, unknownStatuses: [...unknown.entries()].map(([status, count]) => ({ status, count })) };
    }

    const appointmentStatusBreakdown = rows => statusBreakdown(rows, 'appointment_status', classifyAppointment, APPOINTMENT_LABELS);
    const orderStatusBreakdown = rows => statusBreakdown(rows, 'order_status', classifyOrder, ORDER_LABELS);

    // ------------------------------------------------------------------
    // Nhu cầu dịch vụ (VH-C03) và mật độ lịch (VH-C04)
    // ------------------------------------------------------------------
    function topServices(appointments, serviceNames = new Map(), limit = 8) {
        const byService = new Map();
        const seenAppointments = new Set();
        for (const appointment of appointments || []) {
            if (!appointment || seenAppointments.has(appointment.id) || !isValidAppointment(appointment)) continue;
            seenAppointments.add(appointment.id);
            for (const item of activeItems(appointment)) {
                if (!item.service_id) continue; // addon không phải dịch vụ chính
                const entry = byService.get(item.service_id) || {
                    serviceId: item.service_id,
                    name: serviceNames.get(item.service_id) || item.name_snapshot || 'Dịch vụ chưa đặt tên',
                    quantity: 0,
                    appointments: new Set()
                };
                entry.quantity += Number(item.quantity) > 0 ? Number(item.quantity) : 1;
                entry.appointments.add(appointment.id);
                byService.set(item.service_id, entry);
            }
        }
        return [...byService.values()]
            .map(entry => ({ serviceId: entry.serviceId, name: entry.name, quantity: entry.quantity, appointmentCount: entry.appointments.size }))
            .sort((a, b) => b.quantity - a.quantity || b.appointmentCount - a.appointmentCount || a.name.localeCompare(b.name, 'vi'))
            .slice(0, limit);
    }

    function appointmentHeatmap(appointments) {
        const matrix = Array.from({ length: 7 }, () => new Array(24).fill(0));
        const seen = new Set();
        let total = 0;
        let minHour = 24;
        let maxHour = -1;
        for (const appointment of appointments || []) {
            if (!appointment || seen.has(appointment.id) || !isValidAppointment(appointment)) continue;
            const parts = vnParts(appointment.scheduled_start_at);
            if (!parts) continue;
            seen.add(appointment.id);
            matrix[parts.weekday][parts.hour] += 1;
            total += 1;
            minHour = Math.min(minHour, parts.hour);
            maxHour = Math.max(maxHour, parts.hour);
        }
        const fromHour = total ? Math.min(minHour, 8) : 8;
        const toHour = total ? Math.max(maxHour, 20) : 20;
        const max = Math.max(0, ...matrix.flat());
        let peak = null;
        matrix.forEach((row, weekday) => row.forEach((count, hour) => {
            if (count && (!peak || count > peak.count)) peak = { weekday, hour, count, label: `${WEEKDAY_LABELS[weekday]}, ${String(hour).padStart(2, '0')}:00` };
        }));
        return { matrix, total, max, fromHour, toHour, peak, weekdayLabels: WEEKDAY_LABELS };
    }

    // ------------------------------------------------------------------
    // Nhân sự (VH-K04, VH-C05)
    // ------------------------------------------------------------------
    function overlapMs(startA, endA, startB, endB) {
        return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
    }

    // Ca hợp lệ: đang hiệu lực và nhân viên sẵn sàng làm (như M082, M131).
    function isActiveSchedule(schedule) {
        return inGroup(schedule?.schedule_status, STATUS_GROUPS.schedule.active)
            && inGroup(schedule?.availability_status, STATUS_GROUPS.schedule.available);
    }

    function isActiveStaff(staff) {
        return inGroup(staff?.employment_status, STATUS_GROUPS.staff.active);
    }

    function appointmentWindow(appointment) {
        const start = toDate(appointment.scheduled_start_at);
        const end = toDate(appointment.scheduled_end_at);
        if (!start) return null;
        const itemMinutes = activeItems(appointment).reduce((sum, item) => sum + (Number(item.duration_minutes) || 0), 0);
        const endMs = end && end > start ? end.getTime() : start.getTime() + Math.max(itemMinutes, 30) * 60_000;
        return { start: start.getTime(), end: endMs };
    }

    // Nhân viên phụ trách một lịch: người phụ trách ca và người làm từng dòng dịch vụ.
    function staffMinutesForAppointment(appointment) {
        const window = appointmentWindow(appointment);
        const spanMinutes = window ? Math.round((window.end - window.start) / 60_000) : 0;
        const minutes = new Map();
        const items = activeItems(appointment);
        for (const item of items) {
            const staffId = item.staff_id || appointment.staff_id;
            if (!staffId) continue;
            const value = Number(item.duration_minutes) > 0 ? Number(item.duration_minutes) : 0;
            minutes.set(staffId, (minutes.get(staffId) || 0) + value);
        }
        if (appointment.staff_id && !minutes.has(appointment.staff_id)) minutes.set(appointment.staff_id, 0);
        // Không có thời lượng dòng thì dùng khung giờ dự kiến của lịch.
        for (const [staffId, value] of minutes) if (!value) minutes.set(staffId, spanMinutes);
        return minutes;
    }

    function staffAllocation({ appointments, schedules, staff, period, now }) {
        const startMs = toDate(period.startIso).getTime();
        const endMs = toDate(period.endIso).getTime();
        const staffById = new Map((staff || []).map(person => [person.id, person]));
        const rows = new Map();
        const ensure = staffId => {
            if (!rows.has(staffId)) {
                const person = staffById.get(staffId);
                rows.set(staffId, {
                    staffId,
                    name: person?.full_name || 'Nhân viên không còn trong danh sách',
                    jobTitle: person?.job_title || '',
                    active: person ? isActiveStaff(person) : false,
                    shiftMinutes: 0,
                    assigned: 0,
                    completed: 0,
                    finished: 0,
                    bookedMinutes: 0
                });
            }
            return rows.get(staffId);
        };

        const activeSchedules = (schedules || []).filter(isActiveSchedule);
        for (const schedule of activeSchedules) {
            const s = toDate(schedule.start_at);
            const e = toDate(schedule.end_at);
            if (!s || !e) continue;
            const minutes = overlapMs(s.getTime(), e.getTime(), startMs, endMs) / 60_000;
            if (minutes > 0) ensure(schedule.staff_id).shiftMinutes += minutes;
        }

        const seen = new Set();
        for (const appointment of appointments || []) {
            if (!appointment || seen.has(appointment.id) || !isValidAppointment(appointment)) continue;
            seen.add(appointment.id);
            const group = classifyAppointment(appointment.appointment_status);
            for (const [staffId, minutes] of staffMinutesForAppointment(appointment)) {
                const row = ensure(staffId);
                row.assigned += 1;
                row.bookedMinutes += minutes;
                if (group === 'completed') row.completed += 1;
                if (group === 'completed' || group === 'no_show') row.finished += 1;
            }
        }

        const list = [...rows.values()]
            .filter(row => row.active || row.assigned > 0)
            .map(row => ({
                ...row,
                shiftHours: Math.round(row.shiftMinutes / 6) / 10,
                bookedHours: Math.round(row.bookedMinutes / 6) / 10,
                completionRate: row.finished > 0 ? row.completed / row.finished : null,
                utilization: row.shiftMinutes > 0 ? row.bookedMinutes / row.shiftMinutes : null,
                unscheduledWork: row.assigned > 0 && row.shiftMinutes === 0
            }))
            .sort((a, b) => b.assigned - a.assigned || b.shiftMinutes - a.shiftMinutes || a.name.localeCompare(b.name, 'vi'));

        // Chỉ tính nhân viên còn làm việc; nhân viên không có trong danh sách đã tải vẫn tính để không bỏ sót.
        const workingStaff = staffId => !staffById.has(staffId) || isActiveStaff(staffById.get(staffId));
        const onShiftNow = new Set();
        const nowMs = toDate(now || new Date()).getTime();
        for (const schedule of activeSchedules) {
            const s = toDate(schedule.start_at);
            const e = toDate(schedule.end_at);
            if (s && e && s.getTime() <= nowMs && nowMs < e.getTime() && workingStaff(schedule.staff_id)) onShiftNow.add(schedule.staff_id);
        }
        const staffWithShift = new Set(activeSchedules
            .filter(schedule => {
                const s = toDate(schedule.start_at);
                const e = toDate(schedule.end_at);
                return s && e && overlapMs(s.getTime(), e.getTime(), startMs, endMs) > 0;
            })
            .map(schedule => schedule.staff_id)
            .filter(workingStaff));

        return {
            rows: list,
            staffWithShift: staffWithShift.size,
            onShiftNow: onShiftNow.size,
            capacityRisks: capacityRisks(appointments, activeSchedules, period)
        };
    }

    /**
     * Khung giờ có nguy cơ thiếu năng lực phục vụ: số lịch diễn ra đồng thời trong khung giờ
     * vượt số nhân viên có ca hợp lệ trong khung đó.
     * Chỉ đánh giá ngày đã có xếp ca: ngày có lịch hẹn mà chưa xếp ca nào là thiếu dữ liệu ca,
     * được báo riêng ở unscheduledDays, không kết luận là thiếu người.
     */
    function capacityRisks(appointments, activeSchedules, period) {
        const startMs = toDate(period.startIso).getTime();
        const endMs = toDate(period.endIso).getTime();
        if (!activeSchedules.length) return { evaluated: false, items: [], unscheduledDays: [] };
        const scheduledDays = new Set();
        for (const schedule of activeSchedules) {
            const s = toDate(schedule.start_at);
            const e = toDate(schedule.end_at);
            if (!s || !e) continue;
            for (let t = s.getTime(); t < e.getTime(); t += HOUR_MS) scheduledDays.add(vnDateKey(t));
            scheduledDays.add(vnDateKey(e.getTime() - 1));
        }
        const slots = new Map();
        const unscheduledDays = new Map();
        const seen = new Set();
        for (const appointment of appointments || []) {
            if (!appointment || seen.has(appointment.id) || !isValidAppointment(appointment)) continue;
            seen.add(appointment.id);
            const window = appointmentWindow(appointment);
            if (!window) continue;
            const dayKey = vnDateKey(window.start);
            if (!scheduledDays.has(dayKey)) {
                if (window.start >= startMs && window.start < endMs) unscheduledDays.set(dayKey, (unscheduledDays.get(dayKey) || 0) + 1);
                continue;
            }
            for (let slot = Math.floor(Math.max(window.start, startMs) / HOUR_MS) * HOUR_MS; slot < Math.min(window.end, endMs); slot += HOUR_MS) {
                if (overlapMs(window.start, window.end, slot, slot + HOUR_MS) < 15 * 60_000) continue;
                slots.set(slot, (slots.get(slot) || 0) + 1);
            }
        }
        const items = [];
        for (const [slot, demand] of slots) {
            const staffIds = new Set(activeSchedules
                .filter(schedule => overlapMs(toDate(schedule.start_at).getTime(), toDate(schedule.end_at).getTime(), slot, slot + HOUR_MS) >= 30 * 60_000)
                .map(schedule => schedule.staff_id));
            if (demand > staffIds.size) {
                const parts = vnParts(slot);
                items.push({ slot, dateKey: parts.dateKey, hour: parts.hour, demand, staffCount: staffIds.size, label: `${formatDateKey(parts.dateKey)}, ${String(parts.hour).padStart(2, '0')}:00–${String((parts.hour + 1) % 24).padStart(2, '0')}:00` });
            }
        }
        items.sort((a, b) => (b.demand - b.staffCount) - (a.demand - a.staffCount) || a.slot - b.slot);
        return {
            evaluated: true,
            items,
            unscheduledDays: [...unscheduledDays.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dateKey, count]) => ({ dateKey, label: formatDateKey(dateKey), appointmentCount: count }))
        };
    }

    // ------------------------------------------------------------------
    // Tồn kho (VH-K05, VH-T01)
    // ------------------------------------------------------------------
    /**
     * rows: [{ product_variant_id, sku, product_name, quantity_in_stock, minimum_stock }]
     * reservedByVariant: Map variantId -> số lượng giữ hàng còn hiệu lực. Giữ hàng KHÔNG trừ vào quantity_in_stock
     *   (tồn chỉ giảm khi giao hàng, M122), nên tồn khả dụng = tồn kho − giữ hàng (đúng công thức M027).
     * soldByVariant: Map variantId -> số lượng bán trong cửa sổ salesWindowDays
     * Mức tối thiểu chỉ có hiệu lực khi > 0 (như get_admin_dashboard_low_stock, M088).
     */
    function inventoryRisks(rows, { reservedByVariant = new Map(), soldByVariant = new Map(), windowDays = THRESHOLDS.salesWindowDays } = {}) {
        const result = [];
        for (const row of rows || []) {
            const onHand = Number(row.quantity_in_stock);
            const minimum = Number(row.minimum_stock);
            if (!Number.isFinite(onHand) || !Number.isFinite(minimum)) continue;
            const reserved = Math.max(0, Number(reservedByVariant.get(row.product_variant_id)) || 0);
            const available = onHand - reserved;
            const sold = Math.max(0, Number(soldByVariant.get(row.product_variant_id)) || 0);
            const dailyRate = windowDays > 0 ? sold / windowDays : 0;
            const coverDays = dailyRate > 0 ? Math.max(0, available) / dailyRate : null;
            const belowMinimum = minimum > 0 && available <= minimum;
            let level = null;
            if (available <= 0) level = 'out';
            else if (belowMinimum || (coverDays !== null && coverDays < THRESHOLDS.stockCoverHighDays)) level = 'high';
            else if (coverDays !== null && coverDays < THRESHOLDS.stockCoverWatchDays) level = 'watch';
            if (!level) continue;
            result.push({
                variantId: row.product_variant_id,
                sku: row.sku || '',
                productName: row.product_name || 'Sản phẩm chưa đặt tên',
                onHand, reserved, available, minimum, sold, dailyRate, coverDays, level, belowMinimum
            });
        }
        const rank = { out: 0, high: 1, watch: 2 };
        return result.sort((a, b) => rank[a.level] - rank[b.level]
            || (a.coverDays ?? Infinity) - (b.coverDays ?? Infinity)
            || (a.available - a.minimum) - (b.available - b.minimum)
            || a.productName.localeCompare(b.productName, 'vi'));
    }

    // ------------------------------------------------------------------
    // Chất lượng phục vụ (VH06)
    // ------------------------------------------------------------------
    function median(values) {
        if (!values.length) return null;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    function serviceQuality({ reviews, ticketsInPeriod, openTickets, now }) {
        const visible = (reviews || []).filter(review => !inGroup(review.review_status, STATUS_GROUPS.review.hidden));
        const ratings = visible.map(review => Number(review.rating)).filter(value => value >= 1 && value <= 5);
        const distribution = [5, 4, 3, 2, 1].map(star => ({ star, count: ratings.filter(value => value === star).length }));
        const nowMs = toDate(now || new Date()).getTime();
        const firstResponseHours = (ticketsInPeriod || [])
            .map(ticket => {
                const created = toDate(ticket.created_at);
                const responded = toDate(ticket.first_response_at);
                return created && responded && responded >= created ? (responded - created) / HOUR_MS : null;
            })
            .filter(value => value !== null);
        const resolvedInPeriod = (ticketsInPeriod || []).filter(ticket => !isTicketOpen(ticket.status)).length;
        const open = (openTickets || []).filter(ticket => isTicketOpen(ticket.status));
        const waitingFirstResponse = open.filter(ticket => !ticket.first_response_at).length;
        const supportRatings = (ticketsInPeriod || []).map(ticket => Number(ticket.rating)).filter(value => value >= 1 && value <= 5);
        return {
            reviewCount: ratings.length,
            averageRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
            lowRatingCount: ratings.filter(value => value <= 2).length,
            distribution,
            ticketsCreated: (ticketsInPeriod || []).length,
            ticketsResolved: resolvedInPeriod,
            openCount: open.length,
            waitingFirstResponse,
            medianFirstResponseHours: median(firstResponseHours),
            supportRatingAverage: supportRatings.length ? supportRatings.reduce((a, b) => a + b, 0) / supportRatings.length : null,
            supportRatingCount: supportRatings.length,
            oldestOpenHours: open.length ? Math.max(...open.map(ticket => (nowMs - (toDate(ticket.created_at)?.getTime() ?? nowMs)) / HOUR_MS)) : null
        };
    }

    // ------------------------------------------------------------------
    // Công việc cần xử lý và cảnh báo (VH-T02, VH-T03)
    // ------------------------------------------------------------------
    function hoursSince(value, nowMs) {
        const date = toDate(value);
        return date ? (nowMs - date.getTime()) / HOUR_MS : null;
    }

    function buildAlerts({ pendingAppointments, activeOrders, openReturns, openTickets, stockRisks, capacity, now }) {
        const nowMs = toDate(now || new Date()).getTime();
        const alerts = [];
        const push = alert => alerts.push({ waitingHours: null, ...alert });

        const seenAppointments = new Set();
        for (const appointment of pendingAppointments || []) {
            if (!appointment || seenAppointments.has(appointment.id)) continue;
            seenAppointments.add(appointment.id);
            const group = classifyAppointment(appointment.appointment_status);
            const start = toDate(appointment.scheduled_start_at);
            const end = toDate(appointment.scheduled_end_at);
            const ref = appointment.appointment_code || appointment.id;
            const waitedMinutes = (hoursSince(appointment.created_at, nowMs) ?? 0) * 60;
            const untilStartHours = start ? (start.getTime() - nowMs) / HOUR_MS : null;
            const base = { kind: 'appointment', ref, recordId: appointment.id };
            if (group === 'pending') {
                if (untilStartHours !== null && untilStartHours < 0) {
                    push({ ...base, severity: 'urgent', reason: 'Đã qua giờ hẹn nhưng lịch vẫn chờ xác nhận', waitingHours: -untilStartHours });
                } else if (untilStartHours !== null && untilStartHours <= THRESHOLDS.appointmentStartSoonHours) {
                    push({ ...base, severity: 'urgent', reason: `Còn không quá ${THRESHOLDS.appointmentStartSoonHours} giờ tới giờ hẹn, chưa xác nhận`, waitingHours: waitedMinutes / 60 });
                } else if (waitedMinutes > THRESHOLDS.appointmentPendingUrgentMinutes) {
                    push({ ...base, severity: 'urgent', reason: `Chờ xác nhận quá ${THRESHOLDS.appointmentPendingUrgentMinutes} phút`, waitingHours: waitedMinutes / 60 });
                } else if (waitedMinutes >= THRESHOLDS.appointmentPendingWarnMinutes) {
                    push({ ...base, severity: 'warning', reason: `Chờ xác nhận từ ${THRESHOLDS.appointmentPendingWarnMinutes} phút`, waitingHours: waitedMinutes / 60 });
                }
            } else if (group === 'confirmed' && untilStartHours !== null && -untilStartHours * 60 >= THRESHOLDS.appointmentLateMinutes) {
                push({ ...base, severity: 'warning', reason: `Quá giờ hẹn ${THRESHOLDS.appointmentLateMinutes} phút khách chưa đến`, waitingHours: -untilStartHours });
            } else if ((group === 'confirmed' || group === 'checked_in') && !hasAssignedStaff(appointment) && untilStartHours !== null && untilStartHours <= THRESHOLDS.appointmentUnassignedHours) {
                push({ ...base, severity: untilStartHours <= THRESHOLDS.appointmentStartSoonHours ? 'urgent' : 'warning', reason: 'Lịch đã xác nhận nhưng chưa phân công KTV', waitingHours: untilStartHours < 0 ? -untilStartHours : null });
            } else if (group === 'in_progress' && end && nowMs > end.getTime()) {
                // Như services.js: quá hạn khi vượt giờ kết thúc dự kiến (giờ bắt đầu + thời lượng).
                push({ ...base, severity: 'warning', reason: 'Đang phục vụ quá giờ kết thúc dự kiến', waitingHours: (nowMs - end.getTime()) / HOUR_MS });
            }
        }

        for (const order of activeOrders || []) {
            const group = classifyOrder(order.order_status);
            const base = { kind: 'order', ref: order.order_code || order.id, recordId: order.id };
            if (group === 'pending') {
                const waitedMinutes = (hoursSince(order.created_at, nowMs) ?? 0) * 60;
                if (waitedMinutes > THRESHOLDS.orderPendingUrgentMinutes) push({ ...base, severity: 'urgent', reason: `Đơn chờ xác nhận quá ${THRESHOLDS.orderPendingUrgentMinutes} phút`, waitingHours: waitedMinutes / 60 });
                else if (waitedMinutes >= THRESHOLDS.orderPendingWarnMinutes) push({ ...base, severity: 'warning', reason: `Đơn chờ xác nhận từ ${THRESHOLDS.orderPendingWarnMinutes} phút`, waitingHours: waitedMinutes / 60 });
            } else if (group === 'processing') {
                const waited = hoursSince(order.updated_at || order.created_at, nowMs);
                if (waited !== null && waited >= THRESHOLDS.orderProcessingHours) push({ ...base, severity: 'warning', reason: `Đơn đã xác nhận từ ${THRESHOLDS.orderProcessingHours} giờ chưa giao`, waitingHours: waited });
            }
        }

        for (const request of openReturns || []) {
            if (!isReturnOpen(request.request_status)) continue;
            const waited = hoursSince(request.created_at, nowMs);
            if (waited !== null && waited >= THRESHOLDS.returnPendingHours) push({ severity: 'warning', kind: 'return', ref: request.order_code || request.id, recordId: request.id, reason: `Yêu cầu đổi trả chưa xử lý xong quá ${THRESHOLDS.returnPendingHours} giờ`, waitingHours: waited });
        }

        for (const ticket of openTickets || []) {
            if (!isTicketOpen(ticket.status)) continue;
            const waited = hoursSince(ticket.created_at, nowMs);
            if (waited === null) continue;
            const ref = ticket.ticket_code || ticket.id;
            const resolveLimit = isUrgentPriority(ticket.priority) ? THRESHOLDS.ticketResolveUrgentHours : THRESHOLDS.ticketResolveHours;
            if (!ticket.first_response_at && waited >= THRESHOLDS.ticketFirstResponseHours) {
                push({ severity: isUrgentPriority(ticket.priority) ? 'urgent' : 'warning', kind: 'ticket', ref, recordId: ticket.id, reason: `Chưa phản hồi khách quá ${THRESHOLDS.ticketFirstResponseHours} giờ`, waitingHours: waited });
            } else if (waited >= resolveLimit) {
                push({ severity: isUrgentPriority(ticket.priority) ? 'urgent' : 'warning', kind: 'ticket', ref, recordId: ticket.id, reason: `Chưa giải quyết quá ${resolveLimit} giờ`, waitingHours: waited });
            }
        }

        for (const item of stockRisks || []) {
            if (item.level === 'out') push({ severity: 'urgent', kind: 'stock', ref: item.sku || item.productName, recordId: item.variantId, reason: `Hết hàng khả dụng: ${item.productName}` });
            else if (item.level === 'high') push({ severity: 'warning', kind: 'stock', ref: item.sku || item.productName, recordId: item.variantId, reason: item.coverDays !== null && item.coverDays < THRESHOLDS.stockCoverHighDays ? `Chỉ đủ bán khoảng ${Math.max(0, Math.floor(item.coverDays))} ngày: ${item.productName}` : `Tồn dưới mức tối thiểu: ${item.productName}` });
        }

        // Chỉ cảnh báo khung giờ chưa qua: khung giờ đã qua không còn điều phối được.
        for (const risk of (capacity?.items || []).filter(item => item.slot + HOUR_MS > nowMs)) {
            push({ severity: risk.demand - risk.staffCount >= 2 ? 'urgent' : 'warning', kind: 'staff', ref: risk.label, recordId: null, reason: `${risk.demand} lịch diễn ra cùng lúc nhưng chỉ ${risk.staffCount} nhân viên có ca` });
        }

        const rank = { urgent: 0, warning: 1 };
        return alerts.sort((a, b) => rank[a.severity] - rank[b.severity] || (b.waitingHours ?? -1) - (a.waitingHours ?? -1));
    }

    // ------------------------------------------------------------------
    // KPI tổng quan (VH-K01..K06)
    // ------------------------------------------------------------------
    // Lịch cần xử lý: chờ xác nhận (mọi ngày hẹn) hoặc đã xác nhận, sắp diễn ra mà chưa có KTV (như services.js).
    function countPendingAppointments(rows, now) {
        const nowMs = toDate(now || new Date()).getTime();
        const seen = { pending: new Set(), unassigned: new Set() };
        for (const row of rows || []) {
            if (!row) continue;
            const group = classifyAppointment(row.appointment_status);
            if (group === 'pending') seen.pending.add(row.id);
            else if ((group === 'confirmed' || group === 'checked_in') && !hasAssignedStaff(row)) {
                const start = toDate(row.scheduled_start_at);
                if (start && (start.getTime() - nowMs) / HOUR_MS <= THRESHOLDS.appointmentUnassignedHours) seen.unassigned.add(row.id);
            }
        }
        return { total: seen.pending.size + seen.unassigned.size, pending: seen.pending.size, unassigned: seen.unassigned.size };
    }

    function countActionOrders(rows) {
        const seen = new Set();
        for (const row of rows || []) {
            const group = classifyOrder(row?.order_status);
            if (group === 'pending' || group === 'processing') seen.add(row.id);
        }
        return seen.size;
    }

    function formatWaiting(hours) {
        if (hours === null || hours === undefined || !Number.isFinite(hours)) return '—';
        if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} phút`;
        if (hours < 48) return `${Math.floor(hours)} giờ`;
        return `${Math.floor(hours / 24)} ngày`;
    }

    return {
        TIME_ZONE, THRESHOLDS, STATUS_GROUPS, APPOINTMENT_LABELS, ORDER_LABELS, WEEKDAY_LABELS,
        vnParts, vnDateKey, shiftDateKey, formatDateKey, resolvePeriod,
        norm, classifyAppointment, classifyOrder, isTicketOpen, isReturnOpen, isItemCancelled, isUrgentPriority,
        isActiveSchedule, isActiveStaff, isValidAppointment, hasAssignedStaff,
        appointmentStatusBreakdown, orderStatusBreakdown,
        topServices, appointmentHeatmap,
        staffAllocation, capacityRisks,
        inventoryRisks, serviceQuality, buildAlerts,
        countPendingAppointments, countActionOrders, formatWaiting, median
    };
});
