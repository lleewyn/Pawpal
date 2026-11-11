(function () {
    'use strict';
    const M = window.PawpalBusinessMetrics;
    const keys = ['cash', 'previous', 'sources', 'products', 'services', 'customers', 'membership', 'vouchers', 'points', 'returning'];
    const permissions = { cash: ['payment.read', 'refund_transaction.read'], previous: ['payment.read', 'refund_transaction.read'], sources: ['payment.read'], products: ['sales_order.read', 'sales_order_detail.read'], services: ['appointment.read', 'appointment_item.read'], customers: ['customer.read'], membership: ['customer_membership.read', 'membership_tier.read'], vouchers: ['voucher_redemption.read'], points: ['paw_point_transaction.read'] };
    permissions.returning = ['sales_order.read', 'appointment.read'];
    const state = { root: null, range: null, data: {}, errors: {}, loading: new Set(), sort: 'value', bucket: 'day', generation: 0, updated: null, timer: null, pending: null };
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const num = value => Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
    const money = value => num(value) + ' đ';
    const date = value => value.split('-').reverse().join('/');
    const $ = selector => state.root?.querySelector(selector);
    const visible = () => state.root?.isConnected && !!state.root.getClientRects().length && !document.hidden;
    function getMetrics() {
        const d = state.data;
        const definitions = [
            ['collected', 'cash', d.cash?.collected, 'VND', 'payment.succeeded_at', 'Tổng thanh toán thành công trong kỳ.'],
            ['refunded', 'cash', d.cash?.refunded, 'VND', 'refund_transaction.completed_at', 'Tổng hoàn tiền thành công trong kỳ.'],
            ['net', 'cash', d.cash?.net, 'VND', 'get_admin_dashboard_cashflow', 'Tiền thu trừ hoàn tiền, không phải lợi nhuận.'],
            ['growth', 'previous', d.cash && d.previous ? M.growth(d.cash.net, d.previous.net) : null, '%', 'get_admin_dashboard_cashflow', 'Chênh lệch thu thuần chia trị tuyệt đối kỳ trước cùng độ dài.'],
            ['products', 'sources', d.sources?.products, 'VND', 'payment.order_id', 'Thu thành công liên kết duy nhất với đơn hàng.'],
            ['services', 'sources', d.sources?.services, 'VND', 'payment.appointment_id', 'Thu thành công liên kết duy nhất với lịch hẹn.'],
            ['newCustomers', 'customers', d.customers?.length, 'customers', 'customer.registered_at', 'Hồ sơ khách được ghi nhận trong kỳ.'],
            ['returningRate', 'returning', d.returning?.rate, '%', 'sales_order.delivered_at; appointment.check_out_time', 'Khách có ít nhất 2 đơn/lịch hoàn thành chia khách có ít nhất 1 trong kỳ; mỗi đơn/lịch tính một lần.']
        ];
        return definitions.map(([id, key, value, unit, source, definition]) => ({
            id, value: key && !state.errors[key] && !state.loading.has(key) ? value ?? null : null,
            unit, period: state.range ? { from: state.range.from, to: state.range.to, timezone: M.zone } : null,
            comparison: id === 'growth' && state.range ? { from: state.range.previousFrom, to: state.range.previousTo } : null,
            updatedAt: state.updated ? new Date(state.updated).toISOString() : null,
            status: key && state.errors[key] ? 'error' : !key || value == null || state.loading.has(key) ? 'unavailable' : value === 0 ? 'empty' : 'ok',
            definition, source
        }));
    }
    function safeError(error) {
        if (error.code === '42501') return 'Bạn chưa có quyền xem nhóm dữ liệu này.';
        if (error.code === 'RANGE_LIMIT') return 'Dữ liệu vượt giới hạn tải. Hãy chọn khoảng ngày ngắn hơn.';
        if (['PGRST202', 'PGRST204', 'PGRST200', '42P01', '42703'].includes(error.code)) return 'Nguồn dữ liệu chưa sẵn sàng. Cần đối chiếu cấu hình hệ thống.';
        return 'Không tải được dữ liệu. Vui lòng thử lại.';
    }
    const panel = (key, title, wide = false) => `<section class="admin-card biz-panel ${wide ? 'biz-wide' : ''}"><h2>${title}</h2><div data-biz-panel="${key}"></div></section>`;
    function shell() {
        state.root.innerHTML = `<header class="biz-toolbar">
          <div class="biz-presets" role="group" aria-label="Khoảng thời gian">${[['today', 'Hôm nay'], ['7', '7 ngày'], ['30', '30 ngày'], ['90', '90 ngày']].map(([id, label]) => `<button type="button" data-biz-preset="${id}" aria-pressed="false">${label}</button>`).join('')}</div>
          <div class="biz-dates"><label>Từ ngày <input class="admin-input" type="date" data-biz-from></label><label>Đến ngày <input class="admin-input" type="date" data-biz-to></label><button type="button" class="admin-btn admin-btn-secondary" data-biz-apply>Áp dụng</button></div>
          <button type="button" class="admin-btn admin-btn-secondary" data-biz-refresh>Làm mới</button>
        </header><p class="biz-error" data-biz-error role="alert" hidden></p>
        <div class="biz-meta"><span data-biz-period></span><span data-biz-updated role="status"></span></div>
        <div class="biz-kpis" data-biz-kpis></div>
        <div class="biz-grid">
          <section class="admin-card biz-panel biz-wide"><header class="biz-heading"><h2>Tiền thu theo thời gian</h2><label>Gộp theo <select class="admin-select" data-biz-bucket><option value="day">Ngày</option><option value="week">Tuần</option><option value="month">Tháng</option></select></label></header><div data-biz-panel="cash"></div></section>
          ${panel('sources', 'Cơ cấu tiền thu')}
          ${panel('insights', 'Xu hướng và nhận xét')}
          <div class="biz-wide biz-ranking-filter"><label>Xếp hạng theo <select class="admin-select" data-biz-sort><option value="value">Giá trị dòng giao dịch</option><option value="quantity">Số lượng</option></select></label></div>
          ${panel('products', 'Sản phẩm nổi bật')}${panel('services', 'Dịch vụ nổi bật')}
          ${panel('customers', 'Khách hàng mới')}${panel('membership', 'Hạng thành viên hiện tại')}
          ${panel('vouchers', 'Sử dụng voucher')}${panel('points', 'Biến động điểm thưởng')}
          ${panel('forecast', '<svg class="biz-forecast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 20v-5m5 5v-8m5 8v-5m5 5V7M3 11l6-6 5 5 7-8m-5 0h5v5"/></svg>Dự báo', true)}
        </div>`;
        state.root.addEventListener('click', click);
        state.root.addEventListener('change', change);
        $('[data-biz-bucket]').value = state.bucket;
        $('[data-biz-sort]').value = state.sort;
    }
    function status(key) {
        if (state.loading.has(key)) return '<div class="biz-skeleton" role="status">Đang tải dữ liệu…</div>';
        if (state.errors[key]) return `<p class="biz-error">${esc(state.errors[key])}</p><button class="biz-text-button" type="button" data-biz-retry="${key}">Thử lại</button>`;
        return '';
    }
    function customerColumns(rows) {
        if (!rows.length) return '<p class="biz-empty">Chưa có khách hàng mới trong kỳ.</p>';
        const max = Math.max(...rows.map(row => row.value));
        return `<div class="biz-customer-chart" role="region" aria-label="Khách hàng mới theo ngày" tabindex="0"><div class="biz-customer-columns">${rows.map(row => `<div class="biz-customer-column"><div class="biz-customer-plot"><span class="biz-customer-bar" style="height:${row.value / max * 140}px" title="${esc(row.name)}: ${num(row.value)} khách"><strong>${num(row.value)}</strong></span></div><span class="biz-customer-date">${esc(row.name.slice(0, 5))}</span></div>`).join('')}</div></div>`;
    }
    function membershipStack(rows) {
        rows = rows.filter(row => !['đồng', 'bronze'].includes(String(row.name).normalize('NFC').trim().toLocaleLowerCase('vi-VN')));
        const total = rows.reduce((sum, row) => sum + row.value, 0);
        const colors = ['#308264', '#C5A253', '#6799B3', '#BCA58B', '#887A9C'];
        return '' +
            `<div class="biz-membership-stack" role="img" aria-label="Phân bố hạng của ${num(total)} khách">${rows.map((row, i) => row.value > 0 && total > 0 ? `<span style="width:${row.value / total * 100}%;background:${colors[i % colors.length]}" title="${esc(row.name)}: ${num(row.value)} khách"></span>` : '').join('')}</div>` +
            `<ul class="biz-membership-legend">${rows.map((row, i) => `<li><span><i style="background:${colors[i % colors.length]}" aria-hidden="true"></i>${esc(row.name)}</span><strong>${num(row.value)} khách · ${total ? num(row.value / total * 100) + '%' : '—'}</strong></li>`).join('')}</ul>` +
            (total ? '' : '<p class="biz-caption">Chưa có khách được gán hạng.</p>');
    }
    function bars(rows, unit) {
        if (!rows.length || !rows.some(r => r.value > 0)) return '<p class="biz-empty">Chưa có dữ liệu trong khoảng thời gian này.</p>';
        const max = Math.max(...rows.map(r => r.value), 1);
        return `<div class="biz-bars">${rows.map(r => `<div class="biz-bar-row"><span>${esc(r.name)}</span><strong>${esc(unit(r.value))}</strong><span class="biz-bar-track" aria-hidden="true"><span style="width:${Math.max(0, r.value / max * 100)}%"></span></span></div>`).join('')}</div>`;
    }
    function sourceDonut(source) {
        const rows = [
            { name: 'Sản phẩm', value: source.products, color: '#236B48' },
            { name: 'Dịch vụ', value: source.services, color: '#729BB1' },
            { name: 'Chưa phân loại', value: source.other, color: '#C4A475' }
        ];
        const total = rows.reduce((sum, row) => sum + row.value, 0);
        const circumference = 2 * Math.PI * 85;
        let offset = 0;
        const slices = rows.filter(row => row.value > 0).map(row => {
            const length = row.value / total * circumference;
            const slice = `<circle data-biz-slice cx="120" cy="120" r="85" fill="none" stroke="${row.color}" stroke-width="23" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 120 120)"><title>${row.name}: ${money(row.value)} · ${num(row.value / total * 100)}%</title></circle>`;
            offset += length;
            return slice;
        }).join('');
        return `<div class="biz-donut-layout"><div class="biz-donut"><svg viewBox="0 0 240 240" role="img" aria-label="Cơ cấu tiền thu, tổng ${money(total)}"><circle cx="120" cy="120" r="85" fill="none" stroke="#ECF2EE" stroke-width="23"/>${slices}</svg><div class="biz-donut-center"><strong>${money(total)}</strong><span>Tổng tiền thu</span></div></div>
          <ul class="biz-donut-legend">${rows.map(row => `<li><span class="biz-legend-dot" style="background:${row.color}" aria-hidden="true"></span><span>${row.name}<strong>${money(row.value)}</strong></span><span>${total > 0 ? num(row.value / total * 100) + '%' : '—'}</span></li>`).join('')}</ul></div>${total === 0 ? '<p class="biz-caption">Chưa có tiền thu trong kỳ; chưa xác định tỷ trọng.</p>' : ''}`;
    }
    function comparisonChart(percentage) {
        if (state.loading.has('cash') || state.errors.cash || !state.data.cash) return '<p class="biz-empty">Nhận xét sẽ hiển thị khi tải được dòng tiền.</p>';
        const current = state.data.cash.net;
        const previousReady = state.data.previous && !state.loading.has('previous') && !state.errors.previous;
        let html = `<div class="biz-comparison-total"><span>Thu thuần kỳ này</span><strong>${money(current)}</strong></div>`;
        if (!previousReady) return html + status('previous');
        const previous = state.data.previous.net;
        html += percentage === null ? '<p class="biz-caption">Không tính tỷ lệ tăng trưởng vì thu thuần kỳ trước bằng 0.</p>' : `<span class="biz-comparison-badge ${percentage < 0 ? 'is-down' : ''}">${percentage > 0 ? '↑ Tăng' : percentage < 0 ? '↓ Giảm' : 'Không đổi'}${percentage !== 0 ? ' ' + num(Math.abs(percentage)) + '%' : ''} so với kỳ trước</span>`;
        const min = Math.min(0, previous, current), max = Math.max(0, previous, current);
        const scale = Math.max(max - min, 1);
        const y = value => 35 + (max - value) / scale * 135;
        const zero = y(0);
        const periods = [
            { x: 110, value: previous, color: '#A6C2B2', label: 'Kỳ trước', from: state.range.previousFrom, to: state.range.previousTo },
            { x: 310, value: current, color: '#236B48', label: 'Kỳ này', from: state.range.from, to: state.range.to }
        ];
        html += `<svg class="biz-comparison-chart" viewBox="0 0 440 240" role="img" aria-label="So sánh thu thuần: kỳ trước ${money(previous)}, kỳ này ${money(current)}"><text x="12" y="16">VNĐ</text><line x1="35" x2="415" y1="${zero}" y2="${zero}" stroke="#AEC8B9"/><text x="25" y="${zero + 4}" text-anchor="end">0</text>${periods.map(p => `<rect x="${p.x - 35}" y="${Math.min(zero, y(p.value))}" width="70" height="${Math.abs(y(p.value) - zero)}" fill="${p.color}"><title>${p.label}: ${money(p.value)}</title></rect><text x="${p.x}" y="${p.value >= 0 ? y(p.value) - 8 : y(p.value) + 15}" text-anchor="middle" class="biz-comparison-value">${money(p.value)}</text><text x="${p.x}" y="205" text-anchor="middle">${p.label}</text><text x="${p.x}" y="225" text-anchor="middle">${date(p.from)} – ${date(p.to)}</text>`).join('')}</svg>`;
        const difference = current - previous;
        html += `<p class="biz-caption">Thu thuần ${difference === 0 ? 'không đổi' : `${difference > 0 ? 'cao hơn' : 'thấp hơn'} ${money(Math.abs(difference))}`} so với kỳ trước cùng số ngày.${current < 0 ? ' Hoàn tiền kỳ này lớn hơn tiền thu.' : ''}</p>`;
        return html;
    }
    function lineChart(rows) {
        if (!rows.length) return '<p class="biz-empty">Chưa có dữ liệu trong khoảng thời gian này.</p>';
        const series = [['collected', 'Tiền thu', '#236B48', ''], ['refunded', 'Hoàn tiền', '#A56C36', '6 3'], ['net', 'Thu thuần', '#497F9F', '2 3']];
        const values = rows.flatMap(r => series.map(([key]) => Number(r[key])));
        const min = Math.min(0, ...values), max = Math.max(1, ...values), span = max - min;
        const x = i => 95 + i / Math.max(1, rows.length - 1) * 725;
        const y = value => 225 - (value - min) / span * 195;
        return `<div class="biz-chart-legend">${series.map(([, name, color, dash]) => `<span><i style="border-color:${color};border-top-style:${dash ? 'dashed' : 'solid'}"></i>${name}</span>`).join('')}</div><svg class="biz-chart" viewBox="0 0 860 270" role="img" aria-label="Tiền thu, hoàn tiền và thu thuần, đơn vị VNĐ"><text x="12" y="15">VNĐ</text>
          ${[0, 1, 2, 3].map(i => { const v = min + span * i / 3; return `<line x1="95" x2="820" y1="${y(v)}" y2="${y(v)}" stroke="#ECF2EE"/><text x="88" y="${y(v) + 4}" text-anchor="end">${num(Math.round(v))}</text>`; }).join('')}
          ${series.map(([key, label, color, dash]) => `<polyline fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="${dash}" points="${rows.map((r, i) => `${x(i)},${y(r[key])}`).join(' ')}"/>${rows.map((r, i) => `<circle tabindex="0" cx="${x(i)}" cy="${y(r[key])}" r="4" fill="${color}"><title>${esc(date(r.day))} · ${label}: ${money(r[key])}</title></circle>`).join('')}`).join('')}
          ${rows.filter((r, i) => i % Math.max(1, Math.ceil(rows.length / 6)) === 0 || i === rows.length - 1).map(r => `<text x="${x(rows.indexOf(r))}" y="250" text-anchor="middle">${esc(date(r.day))}</text>`).join('')}</svg>
          <details><summary>Xem số liệu biểu đồ</summary><div class="biz-table-wrap"><table class="admin-table"><thead><tr><th>Kỳ</th><th>Tiền thu</th><th>Hoàn tiền</th><th>Thu thuần</th></tr></thead><tbody>${rows.map(r => `<tr><td>${date(r.day)}</td><td>${money(r.collected)}</td><td>${money(r.refunded)}</td><td>${money(r.net)}</td></tr>`).join('')}</tbody></table></div></details>`;
    }
    function ranking(key) {
        const rows = M.rank(state.data[key], key, state.sort);
        const note = key === 'products' ? 'Đơn hoàn thành hoặc đã giao, theo ngày tạo đơn; xếp hạng theo SKU.' : 'Dòng dịch vụ hoàn thành của ca hoàn thành, theo ngày hẹn; gồm dịch vụ bổ sung.';
        return `<p class="biz-caption">${note}</p><p class="biz-caption">Giá trị dòng đã trừ giảm giá dòng, chưa trừ voucher và hoàn tiền.</p>` + (rows.length ? `<div class="biz-table-wrap"><table class="admin-table"><thead><tr><th>${key === 'products' ? 'Sản phẩm' : 'Dịch vụ'}</th><th>Số lượng</th><th>Giá trị dòng</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.name)}</td><td>${num(r.quantity)}</td><td>${money(r.value)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="biz-empty">Chưa có giao dịch hoàn thành trong khoảng thời gian này.</p>');
    }
    function render() {
        if (!state.root?.isConnected) return;
        const d = state.data, cashReady = !!d.cash && !state.loading.has('cash') && !state.errors.cash;
        const value = (key, fn, unit = num) => state.loading.has(key) ? 'Đang tải…' : state.errors[key] || !d[key] ? '—' : unit(fn(d[key]));
        const percentage = cashReady && d.previous && !state.errors.previous && !state.loading.has('previous') ? M.growth(d.cash.net, d.previous.net) : null;
        const cards = [
            ['Tiền thu thành công', value('cash', d => d.collected, money), 'Giao dịch thành công theo ngày thu tiền.'],
            ['Hoàn tiền thành công', value('cash', d => d.refunded, money), 'Theo ngày hoàn tiền; bao gồm hoàn một phần.'],
            ['Tiền thu thuần', value('cash', d => d.net, money), 'Tiền thu trừ hoàn tiền; không phải lợi nhuận.'],
            ['Tăng trưởng thu thuần', percentage === null ? 'N/A' : num(percentage) + '%', percentage !== null ? 'So với kỳ trước cùng số ngày.' : state.errors.previous ? 'Chưa tải được kỳ trước.' : cashReady && d.previous && !state.loading.has('previous') && d.previous.net === 0 ? 'Thu thuần kỳ trước bằng 0.' : 'Chưa đủ dữ liệu so sánh.'],
            ['Tiền thu sản phẩm', value('sources', d => d.products, money), 'Thu từ đơn sản phẩm trong kỳ.'],
            ['Tiền thu dịch vụ', value('sources', d => d.services, money), 'Thu từ lịch dịch vụ trong kỳ.'],
            ['Khách hàng mới', value('customers', d => d.length), 'Hồ sơ mới, gồm khách tại quầy.'],
            ['Tỷ lệ khách quay lại', value('returning', d => d.rate, rate => rate === null ? 'N/A' : num(rate) + '%')]
        ];
        const metrics = getMetrics();
        $('[data-biz-kpis]').innerHTML = cards.map(([label, val], i) => `<article class="kpi-card biz-kpi" data-metric="${metrics[i].id}" data-status="${metrics[i].status}"><span>${label}</span><strong>${esc(val)}</strong></article>`).join('');
        for (const key of keys.filter(k => !['previous', 'returning'].includes(k))) {
            const target = $(`[data-biz-panel="${key}"]`);
            const message = status(key);
            target.setAttribute('aria-busy', String(state.loading.has(key)));
            if (message || !d[key]) { target.innerHTML = message; continue; }
            if (key === 'cash') target.innerHTML = lineChart(M.bucket(d.cash.days, state.bucket)) + (d.cash.undated ? '<p class="biz-error">Có giao dịch thiếu ngày ghi nhận, chưa được tính vào biểu đồ.</p>' : '');
            if (key === 'sources') target.innerHTML = sourceDonut(d.sources);
            if (key === 'products' || key === 'services') target.innerHTML = ranking(key);
            if (key === 'customers') {
                const daily = new Map();
                d.customers.forEach(row => { const day = M.dayKey(row.registered_at); daily.set(day, (daily.get(day) || 0) + 1); });
                target.innerHTML = '<p class="biz-caption">Số khách mới theo ngày trong kỳ</p>' + customerColumns([...daily].sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ name: date(day), value: count })));
            }
            if (key === 'membership') target.innerHTML = membershipStack(d.membership);
            if (key === 'vouchers') target.innerHTML = `<dl class="biz-stat-pair"><div><dt>Lượt áp dụng còn hiệu lực</dt><dd>${num(d.vouchers.count)}</dd></div><div><dt>Giá trị giảm đã chốt</dt><dd>${money(d.vouchers.discount)}</dd></div></dl>${d.vouchers.count > 0 ? '<p class="biz-caption">Theo ngày áp dụng, loại lượt đã đảo hoặc hủy.</p>' : ''}`;
            if (key === 'points') target.innerHTML = `<dl class="biz-stat-pair"><div><dt>Điểm cộng ↗</dt><dd>${num(d.points.credited)}</dd></div><div><dt>Điểm trừ ↘</dt><dd>${num(d.points.debited)}</dd></div></dl>`;
        }
        $('[data-biz-panel="insights"]').innerHTML = comparisonChart(percentage);
        $('[data-biz-panel="forecast"]').innerHTML = '<p class="biz-empty">Chưa đủ điều kiện để dự báo: chưa có chuỗi lịch sử và kết quả kiểm định sai số được xác nhận.</p>';
        $('[data-biz-panel="insights"]').insertAdjacentHTML('beforeend', status('returning'));
        $('[data-biz-updated]').textContent = state.loading.size ? 'Đang cập nhật…' : state.updated ? `Cập nhật ${new Date(state.updated).toLocaleString('vi-VN', { timeZone: M.zone })}${Object.keys(state.errors).length ? ' · Một số dữ liệu chưa tải được' : ''}` : 'Chưa cập nhật';
    }
    async function reload(requested = keys) {
        if (!state.root?.isConnected || !state.range) return;
        const turn = ++state.generation, range = { ...state.range };
        const db = window.getSupabaseClient?.() || window.SupabaseClient;
        state.loading = new Set(requested);
        requested.forEach(key => { delete state.errors[key]; });
        render();
        const access = window.PawpalAdminAccess;
        await access?.ready;
        if (turn !== state.generation) return;
        const load = async key => {
            try {
                if (!access?.isAdmin() || !permissions[key].every(code => access.state.user.permissions.includes(code))) throw Object.assign(Error('forbidden'), { code: '42501' });
                if (!db) throw Error('no_connection');
                const data = await M.load(db, key, range);
                if (turn === state.generation) { state.data[key] = data; state.updated = Date.now(); }
            } catch (error) {
                if (turn === state.generation) { delete state.data[key]; state.errors[key] = safeError(error); }
            } finally {
                if (turn === state.generation) { state.loading.delete(key); render(); }
            }
        };
        // Keep at most three resource queries active at once.
        const queue = [...requested];
        const job = Promise.all(Array.from({ length: 3 }, async () => { while (queue.length && turn === state.generation) await load(queue.shift()); }));
        state.pending = job;
        await job;
        if (state.pending === job) state.pending = null;
    }
    function apply(from, to) {
        try {
            const range = M.period(from, to);
            state.range = range; state.data = {}; state.errors = {}; state.updated = null;
            $('[data-biz-error]').hidden = true;
            $('[data-biz-from]').value = from; $('[data-biz-to]').value = to;
            $('[data-biz-period]').textContent = `${date(from)} – ${date(to)} · Giờ Việt Nam`;
            state.root.querySelectorAll('[data-biz-preset]').forEach(button => button.setAttribute('aria-pressed', String(to === M.dayKey(new Date()) && range.length === (button.dataset.bizPreset === 'today' ? 1 : Number(button.dataset.bizPreset)))));
            sessionStorage.setItem('pawpal_admin_business_range', JSON.stringify({ from, to }));
            return reload();
        } catch (error) { $('[data-biz-error]').textContent = error.message; $('[data-biz-error]').hidden = false; }
    }
    function click(event) {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.dataset.bizPreset) { const today = M.dayKey(new Date()); return apply(M.shift(today, -(button.dataset.bizPreset === 'today' ? 1 : Number(button.dataset.bizPreset)) + 1), today); }
        if (button.hasAttribute('data-biz-apply')) return apply($('[data-biz-from]').value, $('[data-biz-to]').value);
        if (button.hasAttribute('data-biz-refresh')) return state.pending || reload();
        if (button.dataset.bizRetry) return state.pending || reload([button.dataset.bizRetry]);
    }
    function change(event) {
        if (event.target.matches('[data-biz-sort]')) state.sort = event.target.value;
        if (event.target.matches('[data-biz-bucket]')) state.bucket = event.target.value;
        render();
    }
    async function init() {
        const root = document.querySelector('[data-business-root]');
        if (!root) return;
        if (root === state.root && root.children.length) { document.body.classList.add('business-dashboard-active'); return state.pending || (state.updated && Date.now() - state.updated < 90000 ? undefined : reload()); }
        unmount(); state.root = root; document.body.classList.add('business-dashboard-active'); shell();
        let saved; try { saved = JSON.parse(sessionStorage.getItem('pawpal_admin_business_range')); if (saved) M.period(saved.from, saved.to); } catch { saved = null; }
        const today = M.dayKey(new Date());
        // Existing workspace invalidation signals also trigger refresh; polling is a fallback.
        state.timer = setInterval(() => { if (visible() && !state.pending) reload(); }, 120000);
        await apply(saved?.from || M.shift(today, -29), saved?.to || today);
    }
    function unmount() {
        document.body.classList.remove('business-dashboard-active');
        state.generation++; clearInterval(state.timer); state.pending = null;
        state.root?.removeEventListener('click', click); state.root?.removeEventListener('change', change);
        state.root = null;
    }
    let invalidationTimer;
    window.addEventListener('pawpal:workspace-invalidated', () => {
        clearTimeout(invalidationTimer);
        invalidationTimer = setTimeout(() => { state.updated = null; if (visible() && !state.pending) reload(); }, 500);
    });
    window.addEventListener('pawpal:access-invalidated', () => { if (state.root) state.root.replaceChildren(); unmount(); state.data = {}; });
    const api = { init, refresh: () => state.pending || reload(), unmount, getMetrics, getLastUpdatedTime: () => state.updated ? new Date(state.updated).toLocaleTimeString('vi-VN', { timeZone: M.zone }) : 'Chưa cập nhật' };
    window.PawpalDashboardOverview = api;
    window.PawpalDashboard = window.PawpalDashboard || {};
    window.PawpalDashboard.subtabs = window.PawpalDashboard.subtabs || {};
    window.PawpalDashboard.subtabs.overview = api;
})();
