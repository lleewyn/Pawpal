/* Read-only business aggregates. Schema: v1/001_schema.sql, 002_rules.sql, 044_admin_dashboard_cashflow.sql. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.PawpalBusinessMetrics = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const zone = 'Asia/Ho_Chi_Minh';
    const dayKey = value => new Intl.DateTimeFormat('sv-SE', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
    function shift(day, count) {
        const date = new Date(day + 'T00:00:00Z');
        date.setUTCDate(date.getUTCDate() + count);
        return date.toISOString().slice(0, 10);
    }
    function period(from, to) {
        const valid = day => /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day;
        if (!valid(from) || !valid(to)) throw Error('Chọn ngày bắt đầu và kết thúc hợp lệ.');
        const length = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
        if (length < 1 || length > 92) throw Error('Khoảng thời gian phải từ 1 đến 92 ngày.');
        return { from, to, length, start: from + 'T00:00:00+07:00', end: shift(to, 1) + 'T00:00:00+07:00', previousFrom: shift(from, -length), previousTo: shift(from, -1) };
    }
    function number(value) {
        if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) throw Error('invalid_metric');
        return Number(value);
    }
    function totals(days) {
        return days.reduce((sum, day) => ({ collected: sum.collected + number(day.collected), refunded: sum.refunded + number(day.refunded), net: sum.net + number(day.collected) - number(day.refunded) }), { collected: 0, refunded: 0, net: 0 });
    }
    const growth = (current, previous) => previous === 0 ? null : (current - previous) / Math.abs(previous) * 100;
    function sources(payments) {
        const result = { products: 0, services: 0, other: 0 };
        for (const payment of payments) {
            if (payment.transaction_status !== 'succeeded') continue;
            const key = payment.order_id && !payment.appointment_id ? 'products' : payment.appointment_id && !payment.order_id ? 'services' : 'other';
            result[key] += number(payment.amount);
        }
        return result;
    }
    function rank(rows, type, sort = 'value') {
        if(rows.every(r=>r.aggregate===true))return [...rows].sort((a,b)=>number(b[sort])-number(a[sort])||String(a.id).localeCompare(String(b.id))).slice(0,10);
        const grouped = new Map();
        const seen = new Set();
        for (const row of rows) {
            if (seen.has(row.id)) continue;
            seen.add(row.id);
            if (type === 'services' && row.status !== 'completed') continue;
            const id = type === 'products' ? row.product_variant_id : row.service_id || row.service_addon_id;
            if (!id) continue;
            const entry = grouped.get(id) || { id, name: row.product_name_snapshot || row.name_snapshot, quantity: 0, value: 0 };
            entry.quantity += number(row.quantity);
            entry.value += number(row.quantity) * number(row.unit_price) - number(row.discount_amount);
            grouped.set(id, entry);
        }
        return [...grouped.values()].sort((a, b) => b[sort] - a[sort] || String(a.id).localeCompare(String(b.id))).slice(0, 10);
    }
    function bucket(days, mode) {
        const groups = new Map();
        for (const row of days) {
            const key = mode === 'month' ? row.day.slice(0, 7) : mode === 'week' ? shift(row.day, -((new Date(row.day + 'T00:00:00Z').getUTCDay() + 6) % 7)) : row.day;
            const value = groups.get(key) || { day: key, collected: 0, refunded: 0, net: 0 };
            value.collected += number(row.collected); value.refunded += number(row.refunded);
            value.net = value.collected - value.refunded;
            groups.set(key, value);
        }
        return [...groups.values()];
    }
    // Never return a truncated total: excessive ranges must be narrowed by the user.
    async function readAll(build, key = 'id') {
        const rows = [];
        for (let offset = 0; offset < 20000; offset += 500) {
            const { data, error } = await build().order(key).range(offset, offset + 499);
            if (error) throw error;
            if (!Array.isArray(data)) throw Error('invalid_response');
            rows.push(...data);
            if (data.length < 500) return rows;
        }
        throw Object.assign(Error('range_too_large'), { code: 'RANGE_LIMIT' });
    }
    // Existing RPC validates dates and financial permissions on the server; max 31 dates per request.
    async function cashflow(db, range) {
        const days = [];
        let undated = 0;
        for (let start = range.from; start <= range.to; start = shift(start, 31)) {
            const end = shift(start, 30) < range.to ? shift(start, 30) : range.to;
            const { data, error } = await db.rpc('get_admin_dashboard_cashflow', { p_from: start, p_to: end });
            if (error) throw error;
            const expected = period(start, end).length;
            if (!Array.isArray(data?.days) || data.days.length !== expected || data.days.some((d, i) => d.day !== shift(start, i))) throw Error('invalid_response');
            totals(data.days);
            days.push(...data.days);
            undated = Math.max(undated, number(data.undated_receipts) + number(data.undated_refunds));
        }
        return { days, undated, ...totals(days) };
    }
    function returningCustomers(orders, appointments) {
        const counts = new Map(), seen = new Set();
        for (const [type, rows] of [['order', orders], ['appointment', appointments]]) {
            for (const row of rows) {
                const valid = type === 'order' ? ['completed', 'delivered'].includes(row.order_status) : row.appointment_status === 'completed';
                const id = `${type}:${row.id}`;
                if (!valid || !row.id || !row.customer_id || seen.has(id)) continue;
                seen.add(id);
                counts.set(row.customer_id, (counts.get(row.customer_id) || 0) + 1);
            }
        }
        const eligible = counts.size;
        const returning = [...counts.values()].filter(count => count >= 2).length;
        return { eligible, returning, rate: eligible ? returning / eligible * 100 : null };
    }
    async function load(db, key, range) {
        // Validate all ranges before starting a database request, including retry paths.
        range = period(range.from, range.to);
        if (key === 'cash') return cashflow(db, range);
        if (key === 'previous') return cashflow(db, period(range.previousFrom, range.previousTo));
        if (!['sources','customers','returning','membership','vouchers','points','products','services'].includes(key))throw Error('unknown_resource');
        const {data,error}=await db.rpc('admin_business_metric',{p_key:key,p_from:range.from,p_to:range.to});
        if(error)throw error;
        if(data==null)throw Error('invalid_response');
        return data;
        throw Error('unknown_resource');
    }
    const customerCount=rows=>rows?.reduce((n,r)=>n+number(r.count??1),0);
    return { customerCount, zone, dayKey, shift, period, totals, growth, sources, rank, bucket, readAll, cashflow, returningCustomers, load };
});
