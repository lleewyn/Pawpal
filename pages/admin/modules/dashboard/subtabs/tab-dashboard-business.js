(function () {
    'use strict';
    const M = window.PawpalBusinessMetrics;
    const keys = ['cash', 'previous', 'sources', 'products', 'services', 'customers', 'membership', 'vouchers', 'points', 'returning', 'plan'];
    const permissions = { cash: ['payment.read', 'refund_transaction.read'], previous: ['payment.read', 'refund_transaction.read'], sources: ['payment.read'], products: ['sales_order.read', 'sales_order_detail.read'], services: ['appointment.read', 'appointment_item.read'], customers: ['customer.read'], membership: ['customer_membership.read', 'membership_tier.read'], vouchers: ['voucher_redemption.read'], points: ['paw_point_transaction.read'] };
    permissions.returning = ['sales_order.read', 'appointment.read'];
    permissions.plan = ['payment.read', 'refund_transaction.read'];
    const state = { root: null, range: null, data: {}, errors: {}, loading: new Set(), sort: 'value', bucket: 'day', generation: 0, updated: null, timer: null, pending: null, showCustom: false };
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const num = value => Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
    const money = value => num(value) + ' đ';
    const date = value => value.split('-').reverse().join('/');
    const $ = selector => state.root?.querySelector(selector);
    const visible = () => state.root?.isConnected && !!state.root.getClientRects().length && !document.hidden;
    let resizeObserver, observedWidth = 0;
    let realtimeChannel;

    function getMetrics() {
        const d = state.data;
        const definitions = [
            ['collected', 'cash', d.cash?.collected, 'VND', 'payment.succeeded_at', 'Tổng thanh toán thành công trong kỳ.'],
            ['refunded', 'cash', d.cash?.refunded, 'VND', 'refund_transaction.completed_at', 'Tổng hoàn tiền thành công trong kỳ.'],
            ['net', 'cash', d.cash?.net, 'VND', 'get_admin_dashboard_cashflow', 'Tiền thu trừ hoàn tiền, không phải lợi nhuận.'],
            ['growth', 'previous', d.cash && d.previous ? M.growth(d.cash.net, d.previous.net) : null, '%', 'get_admin_dashboard_cashflow', 'Chênh lệch thu thuần chia trị tuyệt đối kỳ trước cùng độ dài.'],
            ['products', 'sources', d.sources?.products, 'VND', 'payment.order_id', 'Thu thành công liên kết duy nhất với đơn hàng.'],
            ['services', 'sources', d.sources?.services, 'VND', 'payment.appointment_id', 'Thu thành công liên kết duy nhất với lịch hẹn.'],
            ['newCustomers', 'customers', d.customers?M.customerCount(d.customers):undefined, 'customers', 'customer.registered_at', 'Hồ sơ khách được ghi nhận trong kỳ.'],
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

    const panel = (key, title, wide = false, extra = '') => `
    <section class="admin-card dash-panel biz-panel ${wide ? 'biz-wide' : ''}">
      <header class="dash-panel-heading biz-panel-head">
        <h3 class="admin-card-title">${title}</h3>
        ${extra}
      </header>
      <div class="biz-panel-body" data-biz-panel="${key}"></div>
    </section>`;

    function shell() {
        state.root.innerHTML = `
        <header class="ops-toolbar biz-toolbar">
          <div class="ops-toolbar-left biz-toolbar-left">
            <div class="ops-range-group biz-presets" role="group" aria-label="Khoảng thời gian">
              ${[['today', 'Hôm nay'], ['month', 'Tháng này'], ['lastMonth', 'Tháng trước'], ['7', '7 ngày'], ['30', '30 ngày'], ['90', '90 ngày'], ['custom', 'Tùy chọn']].map(([id, label]) => `<button type="button" class="ops-range biz-range" data-biz-preset="${id}" aria-pressed="false">${label}</button>`).join('')}
            </div>
            <span class="ops-period-label biz-period-label" data-biz-period></span>
            <div class="ops-custom-range biz-dates" data-biz-custom hidden>
              <label class="ops-sr-only" for="bizRangeFrom">Từ ngày</label>
              <input class="admin-input" id="bizRangeFrom" type="date" data-biz-from>
              <span aria-hidden="true">–</span>
              <label class="ops-sr-only" for="bizRangeTo">Đến ngày</label>
              <input class="admin-input" id="bizRangeTo" type="date" data-biz-to>
              <button type="button" class="admin-btn admin-btn-secondary" data-biz-apply>Áp dụng</button>
            </div>
          </div>
          <div class="ops-sync biz-sync">
            <span aria-live="polite" class="ops-sync-status biz-sync-status is-live" data-biz-updated>Đã đồng bộ</span>
          </div>
        </header>
        <p class="ops-filter-error biz-error" data-biz-error role="alert" hidden></p>

        <div aria-label="Chỉ số kinh doanh" class="admin-kpi-grid biz-kpis" data-biz-kpis></div>

        <div class="biz-grid">
          <section class="admin-card dash-panel biz-panel biz-wide" id="bizProfitPanel">
            <header class="dash-panel-heading biz-panel-head biz-finance-head">
              <h3 class="admin-card-title">Tình hình kinh doanh</h3>
              <div class="biz-finance-actions">
                <span id="bizProfitStatusBadge" class="biz-caption" role="status">Chưa đủ dữ liệu</span>
                <button type="button" class="admin-btn admin-btn-secondary" id="btnEditPlan">Kế hoạch thu và chi</button>
                <button type="button" class="admin-btn admin-btn-secondary" id="btnExportProfitReport" disabled>Xuất ước tính</button>
              </div>
            </header>
            <div class="biz-panel-body biz-finance-body">
              <div data-biz-reading></div>
              <div id="bizTargetBody"></div>
              <div data-biz-panel="profit"></div>
            </div>
          </section>

          <section class="admin-card dash-panel biz-panel biz-wide">
            <header class="dash-panel-heading biz-panel-head">
              <h3 class="admin-card-title">Tiền thu theo thời gian</h3>
              <label class="biz-panel-control">Gộp theo <select class="admin-select" data-biz-bucket><option value="day">Ngày</option><option value="week">Tuần</option><option value="month">Tháng</option></select></label>
            </header>
            <div class="biz-panel-body" data-biz-panel="cash"></div>
          </section>
          <div class="admin-card biz-group biz-wide">
            ${panel('sources', 'Cơ cấu tiền thu')}
            ${panel('insights', 'So với kỳ trước')}
          </div>
          <div class="admin-card biz-group biz-wide">
          <div class="biz-wide biz-ranking-filter">
            <label class="biz-panel-control">Xếp hạng theo <select class="admin-select" data-biz-sort><option value="value">Giá trị dòng giao dịch</option><option value="quantity">Số lượng</option></select></label>
          </div>
          ${panel('products', 'Sản phẩm nổi bật')}
          ${panel('services', 'Dịch vụ nổi bật')}
          </div>
          <div class="admin-card biz-group biz-wide">
          ${panel('customers', 'Khách hàng mới')}
          ${panel('membership', 'Hạng thành viên hiện tại')}
          </div>
          <div class="admin-card biz-group biz-wide">
          ${panel('vouchers', 'Sử dụng voucher')}
          ${panel('points', 'Biến động điểm thưởng')}
          </div>
        </div>`;

        state.root.addEventListener('click', click);
        state.root.addEventListener('change', change);
        $('[data-biz-bucket]').value = state.bucket;
        $('[data-biz-sort]').value = state.sort;
    }

    function status(key) {
        if (state.loading.has(key)) return '<div class="biz-skeleton" role="status"><span class="ops-sr-only">Đang tải dữ liệu…</span><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span></div>';
        if (state.errors[key]) return `<div class="biz-panel-error" role="alert"><p class="biz-error">${esc(state.errors[key])}</p><button class="biz-text-button" type="button" data-biz-retry="${key}">Thử lại</button></div>`;
        return '';
    }

    function customerColumns(rows) {
        if (!rows.length) return '<p class="biz-empty">Chưa có khách hàng mới trong kỳ.</p>';
        const max = Math.max(...rows.map(row => row.value), 1);
        return `<div class="biz-customer-chart" role="region" aria-label="Khách hàng mới theo ngày" tabindex="0"><div class="biz-customer-columns">${rows.map(row => `<div class="biz-customer-column"><div class="biz-customer-plot"><span class="biz-customer-bar" style="height:${Math.max(4, row.value / max * 130)}px" title="${esc(row.name)}: ${num(row.value)} khách"><strong>${num(row.value)}</strong></span></div><span class="biz-customer-date">${esc(row.name.slice(0, 5))}</span></div>`).join('')}</div></div>`;
    }

    function customersByDay(rows) {
        const days = new Map();
        for (const row of rows) {
            if (!row.registered_at || !Number.isFinite(Date.parse(row.registered_at))) continue;
            const day = M.dayKey(new Date(row.registered_at));
            days.set(day, (days.get(day) || 0) + Number(row.count??1));
        }
        return [...days].sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => ({ name: date(day), value }));
    }

    function membershipStack(rows) {
        rows = rows.filter(row => !['đồng', 'bronze'].includes(String(row.name).normalize('NFC').trim().toLocaleLowerCase('vi-VN')));
        const total = rows.reduce((sum, row) => sum + row.value, 0);
        if (!total) return '<p class="biz-empty">Chưa có khách được gán hạng.</p>';
        const colors = ['#236B48', '#4F7A65', '#AEC8B9', '#729BB1', '#887A9C'];
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
            { name: 'Dịch vụ', value: source.services, color: '#4F7A65' },
            { name: 'Chưa phân loại', value: source.other, color: '#AEC8B9' }
        ];
        const total = rows.reduce((sum, row) => sum + row.value, 0);
        const circumference = 2 * Math.PI * 85;
        let offset = 0;
        const slices = rows.filter(row => row.value > 0).map(row => {
            const length = row.value / total * circumference;
            const slice = `<circle data-biz-slice cx="120" cy="120" r="85" fill="none" stroke="${row.color}" stroke-width="20" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 120 120)"><title>${row.name}: ${money(row.value)} · ${num(row.value / total * 100)}%</title></circle>`;
            offset += length;
            return slice;
        }).join('');
        return `<div class="biz-donut-layout"><div class="biz-donut"><svg viewBox="0 0 240 240" role="img" aria-label="Cơ cấu tiền thu, tổng ${money(total)}"><circle cx="120" cy="120" r="85" fill="none" stroke="#ECF2EE" stroke-width="20"/>${slices}</svg><div class="biz-donut-center"><strong>${money(total)}</strong><span>Tổng tiền thu</span></div></div>
          <ul class="biz-donut-legend">${rows.map(row => `<li><span class="biz-legend-dot" style="background:${row.color}" aria-hidden="true"></span><span>${row.name}<strong>${money(row.value)}</strong></span><span>${total > 0 ? num(row.value / total * 100) + '%' : '—'}</span></li>`).join('')}</ul></div>${total === 0 ? '<p class="biz-caption">Chưa có tiền thu trong kỳ; chưa xác định tỷ trọng.</p>' : ''}`;
    }

    function comparisonChart(percentage) {
        if (state.loading.has('cash') || state.errors.cash) return status('cash');
        if (!state.data.cash) return '<p class="biz-empty">Chưa có dữ liệu so sánh.</p>';
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
            { x: 110, value: previous, color: '#AEC8B9', label: 'Kỳ trước', from: state.range.previousFrom, to: state.range.previousTo },
            { x: 310, value: current, color: '#236B48', label: 'Kỳ này', from: state.range.from, to: state.range.to }
        ];
        html += `<svg class="biz-comparison-chart" viewBox="0 0 440 240" role="img" aria-label="So sánh thu thuần: kỳ trước ${money(previous)}, kỳ này ${money(current)}"><text x="12" y="16">VNĐ</text><line x1="35" x2="415" y1="${zero}" y2="${zero}" stroke="#ECF2EE"/><text x="25" y="${zero + 4}" text-anchor="end">0</text>${periods.map(p => `<rect x="${p.x - 35}" y="${Math.min(zero, y(p.value))}" width="70" height="${Math.abs(y(p.value) - zero)}" fill="${p.color}"><title>${p.label}: ${money(p.value)}</title></rect><text x="${p.x}" y="${p.value >= 0 ? y(p.value) - 8 : y(p.value) + 15}" text-anchor="middle" class="biz-comparison-value">${money(p.value)}</text><text x="${p.x}" y="205" text-anchor="middle">${p.label}</text><text x="${p.x}" y="225" text-anchor="middle">${date(p.from)} – ${date(p.to)}</text>`).join('')}</svg>`;
        const difference = current - previous;
        html += `<p class="biz-caption">Thu thuần ${difference === 0 ? 'không đổi' : `${difference > 0 ? 'cao hơn' : 'thấp hơn'} ${money(Math.abs(difference))}`} so với kỳ trước cùng số ngày.${current < 0 ? ' Hoàn tiền kỳ này lớn hơn tiền thu.' : ''}</p>`;
        return html;
    }

    function lineChart(rows) {
        if (!rows.length) return '<p class="biz-empty">Chưa có dữ liệu trong khoảng thời gian này.</p>';
        const series = [['collected', 'Tiền thu', '#236B48', ''], ['refunded', 'Hoàn tiền', '#729BB1', '6 3'], ['net', 'Thu thuần', '#4F7A65', '2 3']];
        const values = rows.flatMap(r => series.map(([key]) => Number(r[key])));
        const min = Math.min(0, ...values), max = Math.max(1, ...values), span = max - min;
        const width = Math.max(600, Math.round(state.root.clientWidth - 38));
        const right = width - 48;
        const x = i => 90 + i / Math.max(1, rows.length - 1) * (right - 90);
        const y = value => 225 - (value - min) / span * 195;
        return `<div class="biz-chart-legend">${series.map(([, name, color, dash]) => `<span><i style="border-color:${color};border-top-style:${dash ? 'dashed' : 'solid'}"></i>${name}</span>`).join('')}</div><div class="biz-chart-scroll"><svg class="biz-chart" viewBox="0 0 ${width} 270" role="img" aria-label="Tiền thu, hoàn tiền và thu thuần, đơn vị VNĐ"><text x="12" y="15">VNĐ</text>
          ${[0, 1, 2, 3].map(i => { const v = min + span * i / 3; return `<line x1="90" x2="${right}" y1="${y(v)}" y2="${y(v)}" stroke="#ECF2EE"/><text x="80" y="${y(v) + 4}" text-anchor="end">${num(Math.round(v))}</text>`; }).join('')}
          ${series.map(([key, label, color, dash]) => `<polyline fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-dasharray="${dash}" points="${rows.map((r, i) => `${x(i)},${y(r[key])}`).join(' ')}"/>${rows.map((r, i) => Number(r[key]) !== 0 ? `<circle tabindex="0" cx="${x(i)}" cy="${y(r[key])}" r="2.5" fill="${color}"><title>${esc(date(r.day))} · ${label}: ${money(r[key])}</title></circle>` : '').join('')}`).join('')}
          ${rows.filter((r, i) => i % Math.max(1, Math.ceil(rows.length / 6)) === 0 || i === rows.length - 1).map(r => `<text x="${x(rows.indexOf(r))}" y="250" text-anchor="middle">${esc(date(r.day))}</text>`).join('')}</svg></div>
          <details class="biz-details"><summary class="biz-summary">Xem bảng số liệu chi tiết</summary><div class="biz-table-wrap table-responsive-wrapper"><table class="admin-table"><thead><tr><th>Kỳ</th><th>Tiền thu</th><th>Hoàn tiền</th><th>Thu thuần</th></tr></thead><tbody>${rows.map(r => `<tr><td>${date(r.day)}</td><td>${money(r.collected)}</td><td>${money(r.refunded)}</td><td>${money(r.net)}</td></tr>`).join('')}</tbody></table></div></details>`;
    }
    function showToast(msg, type = 'success') {
        let container = document.getElementById('adminToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'adminToastContainer';
            container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `admin-toast toast-${type}`;
        toast.style.cssText = 'padding:10px 18px;border-radius:9px;background:#236B48;color:#fff;font-size:13px;font-weight:500;box-shadow:0 4px 14px rgba(0,0,0,0.15);pointer-events:auto;transition:opacity 0.2s;';
        if (type === 'warning') toast.style.backgroundColor = '#B45309';
        if (type === 'danger') toast.style.backgroundColor = '#DC2626';
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 250); }, 3000);
    }

    function canEditPlan() {
        const list = window.PawpalAdminAccess?.state?.user?.permissions || [];
        return ['pawpal_setting.write', 'audit_log.write'].every(code => list.includes(code));
    }

    function openPlanModal() {
        if (!canEditPlan() || state.loading.has('plan') || state.errors.plan || !state.range) return;
        document.getElementById('bizPlanModal')?.remove();
        const range = { ...state.range }, expected = state.data.plan || null;
        const fields = [
            ['target_net_receipts', 'Mục tiêu thu thuần trong kỳ', 'đ', 0.01, 1000000000000],
            ['operating_expenses', 'Chi phí vận hành dự kiến trong kỳ', 'đ', 0, 1000000000000],
            ['product_cost_percent', 'Giá vốn sản phẩm dự kiến', '%', 0, 100],
            ['service_cost_percent', 'Chi phí trực tiếp dịch vụ dự kiến', '%', 0, 100]
        ];
        const overlay = document.createElement('div');
        overlay.id = 'bizPlanModal';
        overlay.className = 'admin-modal-overlay admin-modal-standard active biz-plan-modal';
        overlay.innerHTML = `<div class="admin-modal-card" role="dialog" aria-modal="true" aria-labelledby="bizPlanTitle" tabindex="-1">
            <header class="biz-plan-header"><h3 id="bizPlanTitle" class="admin-modal-title">Kế hoạch thu và chi (${date(range.from)} – ${date(range.to)})</h3><button type="button" class="btn-modal-close" data-close-modal="bizPlanModal">Đóng</button></header>
            <form onsubmit="return false;" class="biz-plan-form">
                ${fields.map(([key, label, unit, min, max], i) => `<div><label class="form-label" for="plan-${key}">${label} (${unit}) ${i === 0 ? '<span class="biz-required">*</span>' : ''}</label><input id="plan-${key}" name="${key}" type="number" class="admin-input" min="${min}" max="${max}" step="${unit === '%' ? '0.0001' : '0.01'}" value="${expected?.[key] == null ? '' : esc(expected[key])}" ${i === 0 ? 'required' : ''}></div>`).join('')}
                <p class="biz-caption">Có thể lưu riêng mục tiêu. Để tính ước tính, nhập đủ ba khoản chi phí; để trống cả ba khi chưa xác định. Các khoản chỉ áp dụng cho kỳ này.</p>
                <p class="biz-error" data-plan-error role="alert" hidden></p>
                <footer class="biz-plan-footer"><button type="button" class="admin-btn admin-btn-secondary" data-close-modal="bizPlanModal">Hủy</button><button type="button" class="admin-btn admin-btn-primary" data-plan-save>Lưu kế hoạch</button></footer>
            </form></div>`;
        document.body.appendChild(overlay);
        const form = overlay.querySelector('form');
        form.addEventListener('submit', event => event.preventDefault());
        const save = overlay.querySelector('[data-plan-save]'), errorEl = overlay.querySelector('[data-plan-error]');
        let request = null, requestValues = '';
        save.addEventListener('click', async () => {
            if (save.disabled || !form.reportValidity()) return;
            const values = Object.fromEntries(fields.map(([key]) => [key, form.elements.namedItem(key).value === '' ? null : Number(form.elements.namedItem(key).value)]));
            const costs = fields.slice(1).map(([key]) => values[key]);
            if (costs.some(value => value === null) && costs.some(value => value !== null)) {
                errorEl.textContent = 'Nhập đủ ba khoản chi phí hoặc để trống cả ba để lưu riêng mục tiêu.'; errorEl.hidden = false; return;
            }
            const signature = JSON.stringify(values);
            if (requestValues !== signature) { request = crypto.randomUUID(); requestValues = signature; }
            save.disabled = true; errorEl.hidden = true;
            try {
                const db = window.getSupabaseClient?.() || window.SupabaseClient;
                const { error } = await db.rpc('save_admin_dashboard_plan', { p_request: request, p_from: range.from, p_to: range.to, p_expected: expected, p_values: values });
                if (error) throw error;
                overlay.remove();
                await state.pending;
                if (state.range?.from === range.from && state.range?.to === range.to) await reload(['plan']);
                showToast('Đã lưu kế hoạch thu và chi.');
            } catch (error) {
                errorEl.textContent = error.code === 'PT409' ? 'Kế hoạch đã được thay đổi. Đóng cửa sổ và làm mới trước khi nhập lại.' : safeError(error);
                errorEl.hidden = false;
            } finally { save.disabled = false; }
        });
        overlay.querySelector('input').focus();
    }

    function financeEstimate() {
        if (['cash', 'sources', 'plan'].some(key => state.loading.has(key) || state.errors[key])) return null;
        try { return M.estimate(state.data.cash, state.data.sources, state.data.plan, state.range); } catch { return null; }
    }

    function renderBusinessReading() {
        const body = $('[data-biz-reading]');
        if (!body) return;
        const d = state.data, notes = [];
        if (d.cash && !state.errors.cash && !state.loading.has('cash')) {
            if (d.cash.net < 0) notes.push(`Hoàn tiền vượt tiền thu ${money(-d.cash.net)} trong kỳ.`);
            else if (d.cash.collected === 0) notes.push('Chưa ghi nhận tiền thu thành công trong kỳ.');
            if (d.cash.refunded > 0 && d.cash.collected > 0) notes.push(`Hoàn tiền ${money(d.cash.refunded)}, tương đương ${num(d.cash.refunded / d.cash.collected * 100)}% tiền thu cùng kỳ. Giao dịch được hoàn có thể thuộc kỳ trước.`);
        }
        if (d.services && d.sources && !['services','sources'].some(key => state.errors[key] || state.loading.has(key)) && d.sources.services === 0) {
            const value = M.rank(d.services, 'services').reduce((sum, row) => sum + row.value, 0);
            if (value > 0) notes.push(`Các dịch vụ nổi bật có ${money(value)} giá trị giao dịch hoàn thành nhưng tiền thu dịch vụ trong kỳ bằng 0. Cần đối soát ngày ghi nhận và liên kết thanh toán.`);
        }
        body.innerHTML = notes.length ? `<ul class="biz-reading">${notes.map(note => `<li>${esc(note)}</li>`).join('')}</ul>` : '';
    }

    function renderRevenueTarget() {
        const body = $('#bizTargetBody'), plan = state.data.plan;
        if (!body) return;
        if (!plan || plan.period_from !== state.range?.from || plan.period_to !== state.range?.to || ['cash', 'plan'].some(key => state.loading.has(key) || state.errors[key]) || !state.data.cash) { body.innerHTML = ''; return; }
        const target = Number(plan.target_net_receipts), net = Number(state.data.cash.net);
        if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(net)) { body.innerHTML = ''; return; }
        const percent = net / target * 100, gap = target - net;
        body.innerHTML = `<div class="biz-target-heading"><span>Mục tiêu thu thuần <strong>${money(net)}</strong> / ${money(target)}</span><span>Đạt ${num(percent)}% · ${gap > 0 ? 'Còn thiếu ' + money(gap) : gap < 0 ? 'Vượt ' + money(-gap) : 'Đã đạt mục tiêu'}</span></div><div class="biz-target-track" role="progressbar" aria-label="Tiến độ mục tiêu thu thuần" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, Math.max(0, percent))}" aria-valuetext="${num(percent)}%"><span style="width:${Math.min(100, Math.max(0, percent))}%"></span></div>`;
    }

    function renderProfitability() {
        const body = $('[data-biz-panel="profit"]'), badge = $('#bizProfitStatusBadge');
        if (!body) return;
        const estimate = financeEstimate();
        state.lastProfitCalc = estimate;
        $('#btnExportProfitReport').disabled = !estimate;
        const edit = $('#btnEditPlan');
        edit.hidden = !canEditPlan();
        edit.disabled = state.loading.has('plan') || !!state.errors.plan;
        badge.className = 'biz-finance-status';
        const pending = ['cash', 'sources', 'plan'].find(key => state.loading.has(key));
        const failed = ['cash', 'sources', 'plan'].find(key => state.errors[key]);
        body.setAttribute('aria-busy', String(!!pending));
        if (pending || failed) {
            badge.textContent = pending ? 'Đang cập nhật' : 'Chưa đủ dữ liệu';
            body.innerHTML = pending ? '<p class="biz-caption">Đang tải dữ liệu thu và chi…</p>' : status(failed);
            return;
        }
        if (!estimate) {
            badge.textContent = 'Chưa đủ dữ liệu';
            body.innerHTML = `<p class="biz-caption">${state.data.plan ? 'Chưa đủ chi phí dự kiến hoặc dữ liệu tiền thu để lập ước tính.' : 'Chưa có kế hoạch thu và chi cho kỳ này.'}</p><p class="biz-caption">Chưa đủ dữ liệu chi phí thực tế và số dư để kết luận lãi/lỗ hoặc khả năng chi trả.</p>`;
            return;
        }
        badge.textContent = estimate.balance < 0 ? 'Ước tính thiếu hụt' : estimate.balance > 0 ? 'Ước tính thặng dư' : 'Cân bằng theo kế hoạch';
        if (estimate.balance < 0) badge.classList.add('is-negative');
        const items = [['Thu thuần thực ghi nhận', estimate.net], ['Giá vốn dự kiến', estimate.estimatedCosts], ['Chi phí vận hành dự kiến', estimate.expenses], ['Ước tính thu trừ chi', estimate.balance]];
        body.innerHTML = `<dl class="biz-finance-values">${items.map(([label, value], i) => `<div><dt>${label}</dt><dd class="${i === 3 && value < 0 ? 'is-negative' : ''}">${money(value)}</dd></div>`).join('')}</dl><details class="biz-details"><summary class="biz-summary">Cách tính ước tính</summary><p class="biz-caption">Thu thuần trừ giá vốn dự kiến theo tiền thu sản phẩm (${num(Number(state.data.plan.product_cost_percent))}%), dịch vụ (${num(Number(state.data.plan.service_cost_percent))}%) và chi phí vận hành đã nhập cho đúng kỳ. Chưa đối soát giá vốn thực tế, công nợ và các khoản chi khác; chưa phải lợi nhuận thực tế.</p></details>`;
    }

    function exportProfitAndLoss() {
        const calc = financeEstimate();
        if (!calc || !window.XLSX) { showToast('Chưa thể xuất ước tính. Hãy kiểm tra dữ liệu và thử lại.', 'warning'); return; }
        const rows = [
            ['Từ ngày', state.range.from], ['Đến ngày', state.range.to],
            ['Thu thuần thực ghi nhận', calc.net], ['Giá vốn dự kiến', calc.estimatedCosts],
            ['Chi phí vận hành dự kiến', calc.expenses], ['Ước tính thu trừ chi', calc.balance],
            ['Mục tiêu thu thuần', calc.target],
            ['Cơ sở', 'Kế hoạch và tỷ lệ chi phí được nhập cho kỳ này; chưa phải lợi nhuận thực tế.']
        ];
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Chỉ tiêu', 'Giá trị'], ...rows]), 'Uoc_tinh_thu_chi');
        XLSX.writeFile(book, `Uoc_tinh_thu_chi_${state.range.from}_${state.range.to}.xlsx`);
    }

    function ranking(key) {
        const rows = M.rank(state.data[key], key, state.sort);
        const note = key === 'products' ? 'Đơn hoàn thành hoặc đã giao, theo ngày tạo đơn; xếp hạng theo SKU.' : 'Dòng dịch vụ hoàn thành của ca hoàn thành, theo ngày hẹn; gồm dịch vụ bổ sung.';
        return (rows.length ? `<div class="biz-table-wrap table-responsive-wrapper"><table class="admin-table"><thead><tr><th>${key === 'products' ? 'Sản phẩm' : 'Dịch vụ'}</th><th>Số lượng</th><th>Giá trị dòng</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.name)}</td><td>${num(r.quantity)}</td><td>${money(r.value)}</td></tr>`).join('')}</tbody></table></div><details class="biz-details"><summary class="biz-summary">Cách tính giá trị</summary><p class="biz-caption">${note} Giá trị đã trừ giảm giá dòng, chưa trừ voucher và hoàn tiền.</p></details>` : '<p class="biz-empty">Chưa có giao dịch hoàn thành trong kỳ.</p>');
    }

    function render() {
        if (!state.root?.isConnected) return;
        const d = state.data, cashReady = !!d.cash && !state.loading.has('cash') && !state.errors.cash;
        const value = (key, fn, unit = num) => state.loading.has(key) || state.errors[key] || !d[key] ? '—' : unit(fn(d[key]));
        const percentage = cashReady && d.previous && !state.errors.previous && !state.loading.has('previous') ? M.growth(d.cash.net, d.previous.net) : null;
        const cards = [
            ['Tiền thu thành công', value('cash', d => d.collected, money), 'Giao dịch theo ngày thu tiền'],
            ['Hoàn tiền thành công', value('cash', d => d.refunded, money), 'Bao gồm hoàn tiền một phần'],
            ['Tiền thu thuần', value('cash', d => d.net, money), 'Tiền thu trừ tổng hoàn tiền'],
            ['Tăng trưởng thu thuần', percentage === null ? '—' : (percentage > 0 ? '+' : '') + num(percentage) + '%', percentage !== null ? (percentage >= 0 ? 'Tăng so với kỳ trước' : 'Giảm so với kỳ trước') : 'Chưa đủ dữ liệu so sánh'],
            ['Tiền thu sản phẩm', value('sources', d => d.products, money), 'Thu từ đơn bán lẻ phụ kiện'],
            ['Tiền thu dịch vụ', value('sources', d => d.services, money), 'Thu từ các ca dịch vụ'],
            ['Khách hàng mới', value('customers', d => M.customerCount(d)), 'Ghi nhận hồ sơ trong kỳ'],
            ['Khách giao dịch lặp lại', value('returning', d => d.rate, rate => rate === null ? '—' : num(rate) + '%'), d.returning ? `${num(d.returning.returning)} / ${num(d.returning.eligible)} khách giao dịch trong kỳ` : 'Khách có từ hai giao dịch hoàn thành trong kỳ']
        ];
        const metrics = getMetrics();
        const metricKeys = ['cash', 'cash', 'cash', 'previous', 'sources', 'sources', 'customers', 'returning'];
        $('[data-biz-kpis]').innerHTML = cards.map(([label, val, sub], i) => {
          const key = metricKeys[i], loading = state.loading.has(key) || i === 3 && state.loading.has('cash');
          const error = state.errors[key] || i === 3 && state.errors.cash;
          return `
          <div class="kpi-card biz-kpi" data-metric="${metrics[i].id}" data-status="${metrics[i].status}" aria-busy="${loading}"${error ? ` title="${esc(error)}"` : ''}>
            <span class="kpi-label" title="${esc(metrics[i].definition)}">${label}</span>
            <strong class="kpi-val">${loading ? '<span class="biz-kpi-skeleton" aria-hidden="true"></span><span class="ops-sr-only">Đang tải</span>' : error ? '<span class="biz-kpi-error">Chưa tải được</span>' : esc(val)}</strong>
            ${i === 7 && !loading && !error ? `<span class="kpi-sub">${esc(sub)}</span>` : ''}
          </div>`;
        }).join('');

        for (const key of keys.filter(k => !['previous', 'returning'].includes(k))) {
            const target = $(`[data-biz-panel="${key}"]`);
            if (!target) continue;
            const message = status(key);
            target.setAttribute('aria-busy', String(state.loading.has(key)));
            if (message || !d[key]) { target.innerHTML = message; continue; }
            if (key === 'cash') target.innerHTML = lineChart(M.bucket(d.cash.days, state.bucket)) + (d.cash.undated ? '<p class="biz-error">Có giao dịch thiếu ngày ghi nhận, chưa được tính vào biểu đồ.</p>' : '');
            if (key === 'sources') target.innerHTML = sourceDonut(d.sources);
            if (key === 'products' || key === 'services') target.innerHTML = ranking(key);
            if (key === 'customers') target.innerHTML = customerColumns(customersByDay(d.customers));
            if (key === 'membership') target.innerHTML = membershipStack(d.membership);
            if (key === 'vouchers') target.innerHTML = `<div class="biz-stat-pair"><dl><dt>Số voucher đã áp dụng</dt><dd>${num(d.vouchers.count)}</dd></dl><dl><dt>Tổng giá trị ưu đãi</dt><dd>${money(d.vouchers.discount)}</dd></dl></div>`;
            if (key === 'points') target.innerHTML = `<div class="biz-stat-pair"><dl><dt>Điểm thưởng tăng</dt><dd>+${num(d.points.credited)}</dd></dl><dl><dt>Điểm thưởng giảm</dt><dd>-${num(d.points.debited)}</dd></dl></div><p class="biz-caption">Không quy đổi trực tiếp thành doanh thu.</p>`;
        }
        $('[data-biz-panel="insights"]').innerHTML = comparisonChart(percentage);
        $('[data-biz-panel="insights"]').setAttribute('aria-busy', String(state.loading.has('cash') || state.loading.has('previous')));
        renderProfitability();
        renderRevenueTarget();
        renderBusinessReading();
        $('[data-biz-updated]').textContent = state.loading.size ? 'Đang cập nhật…' : state.updated ? `Cập nhật ${new Date(state.updated).toLocaleTimeString('vi-VN', { timeZone: M.zone })}${Object.keys(state.errors).length ? ' · Một số dữ liệu lỗi' : ''}` : 'Đã đồng bộ';
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
        // Giới hạn tối đa 3 truy vấn đồng thời
        const queue = [...requested];
        const job = Promise.all(Array.from({ length: 3 }, async () => { while (queue.length && turn === state.generation) await load(queue.shift()); }));
        state.pending = job;
        await job;
        if (state.pending === job) state.pending = null;
    }

    function monthRange(today, offset) {
        const [year, month] = today.split('-').map(Number);
        const from = new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0,10);
        const to = new Date(Date.UTC(year, month + offset, 0)).toISOString().slice(0,10);
        return { from, to };
    }
    function apply(from, to, isCustom = false) {
        try {
            const range = M.period(from, to);
            state.range = range; state.data = {}; state.errors = {}; state.updated = null;
            $('[data-biz-error]').hidden = true;
            $('[data-biz-from]').value = from; $('[data-biz-to]').value = to;
            $('[data-biz-period]').textContent = `(${date(from)}${from !== to ? ' – ' + date(to) : ''})`;

            const today = M.dayKey(new Date());
            const isToday = (from === today && to === today);
            const daysLen = range.length;

            state.root.querySelectorAll('[data-biz-preset]').forEach(button => {
                const presetId = button.dataset.bizPreset;
                let active = false;
                if (isCustom) {
                    active = (presetId === 'custom');
                } else if (presetId === 'month' || presetId === 'lastMonth') {
                    const month = monthRange(today, presetId === 'lastMonth' ? -1 : 0);
                    active = from === month.from && to === month.to;
                } else if (to === today) {
                    if (presetId === 'today' && isToday) active = true;
                    else if (presetId === String(daysLen)) active = true;
                }
                button.setAttribute('aria-pressed', String(active));
                button.classList.toggle('active', active);
            });
            const customBox = $('[data-biz-custom]');
            if (customBox) customBox.hidden = !isCustom;

            sessionStorage.setItem('pawpal_admin_business_range', JSON.stringify({ from, to, isCustom }));
            return reload();
        } catch (error) {
            $('[data-biz-error]').textContent = error.message;
            $('[data-biz-error]').hidden = false;
        }
    }

    function click(event) {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.id === 'btnEditPlan') { openPlanModal(); return; }
        if (button.id === 'btnExportProfitReport' || button.closest('#btnExportProfitReport')) { exportProfitAndLoss(); return; }
        if (button.dataset.bizPreset) {
            if (button.dataset.bizPreset === 'custom') {
                const customBox = $('[data-biz-custom]');
                if (customBox) {
                    const willShow = customBox.hidden;
                    customBox.hidden = !willShow;
                    state.root.querySelectorAll('[data-biz-preset]').forEach(b => {
                        const isCur = b === button;
                        b.setAttribute('aria-pressed', String(isCur && willShow));
                        b.classList.toggle('active', isCur && willShow);
                    });
                }
                return;
            }
            const today = M.dayKey(new Date());
            if (['month', 'lastMonth'].includes(button.dataset.bizPreset)) {
                const range = monthRange(today, button.dataset.bizPreset === 'lastMonth' ? -1 : 0);
                return apply(range.from, range.to, false);
            }
            const days = button.dataset.bizPreset === 'today' ? 1 : Number(button.dataset.bizPreset);
            return apply(M.shift(today, -days + 1), today, false);
        }
        if (button.hasAttribute('data-biz-apply')) {
            return apply($('[data-biz-from]').value, $('[data-biz-to]').value, true);
        }
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
        if (root === state.root && root.children.length) {
            document.body.classList.add('business-dashboard-active');
            return state.pending || (state.updated && Date.now() - state.updated < 90000 ? undefined : reload());
        }
        unmount();
        state.root = root;
        document.body.classList.add('business-dashboard-active');
        shell();
        observedWidth = root.clientWidth;
        resizeObserver = new ResizeObserver(() => { const width = root.clientWidth; if (width !== observedWidth) { observedWidth = width; render(); } });
        resizeObserver.observe(root);
        const client = window.getSupabaseClient?.() || window.SupabaseClient;
        if (client?.channel) {
            realtimeChannel = client.channel('admin-dashboard-live-sync');
            for (const table of ['payment', 'refund_transaction', 'sales_order', 'sales_order_detail', 'appointment', 'appointment_item', 'customer', 'customer_membership', 'membership_tier', 'voucher_redemption', 'paw_point_transaction', 'admin_dashboard_plan']) {
                realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleReload);
            }
            realtimeChannel.subscribe();
        }

        let saved;
        try {
            saved = JSON.parse(sessionStorage.getItem('pawpal_admin_business_range'));
            if (saved) M.period(saved.from, saved.to);
        } catch { saved = null; }

        const today = M.dayKey(new Date());
        state.timer = setInterval(() => { if (visible() && !state.pending) reload(); }, 120000);
        await apply(saved?.from || M.shift(today, -29), saved?.to || today, !!saved?.isCustom);
    }

    function unmount() {
        resizeObserver?.disconnect();
        document.body.classList.remove('business-dashboard-active');
        state.generation++;
        clearInterval(state.timer);
        clearTimeout(invalidationTimer);
        if (realtimeChannel) (window.getSupabaseClient?.() || window.SupabaseClient)?.removeChannel?.(realtimeChannel);
        realtimeChannel = null;
        state.pending = null;
        state.lastProfitCalc = null;
        document.getElementById('bizPlanModal')?.remove();
        state.root?.removeEventListener('click', click);
        state.root?.removeEventListener('change', change);
        state.root = null;
    }

    let invalidationTimer;
    function scheduleReload() {
        clearTimeout(invalidationTimer);
        state.updated = null;
        invalidationTimer = setTimeout(() => {
            if (!visible()) return;
            if (state.pending) { scheduleReload(); return; }
            reload();
        }, 500);
    }
    window.addEventListener('pawpal:workspace-invalidated', scheduleReload);
    window.addEventListener('pawpal:access-invalidated', () => { if (state.root) state.root.replaceChildren(); unmount(); state.data = {}; });

    const api = {
        init,
        refresh: () => state.pending || reload(),
        unmount,
        getMetrics,
        getLastUpdatedTime: () => state.updated ? new Date(state.updated).toLocaleTimeString('vi-VN', { timeZone: M.zone }) : 'Chưa cập nhật'
    };

    window.PawpalBusinessDashboard = api;
    if (!window.PawpalDashboardOverview) {
        window.PawpalDashboardOverview = api;
    }
    window.PawpalDashboard = window.PawpalDashboard || {};
    window.PawpalDashboard.subtabs = window.PawpalDashboard.subtabs || {};
    window.PawpalDashboard.subtabs.business = api;
})();
