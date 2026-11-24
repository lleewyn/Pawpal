(function () {
    'use strict';
    const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const money = value => value == null ? '—' : Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 4 }) + ' đ';
    const today = () => window.PawpalBusinessMetrics.dayKey(new Date());
    const localTime = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 19);
    const at = value => value ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'Chưa xác định';
    const kinds = { expense: 'Chi phí vận hành', receivable: 'Khoản phải thu', payable: 'Khoản phải trả', service_cost: 'Chi phí trực tiếp dịch vụ', refund_allocation: 'Phân loại khoản hoàn', revenue_credit: 'Giảm trừ do đổi trả' };
    const sections = { expenses: 'Chi phí', accounts: 'Tiền mặt và ngân hàng', obligations: 'Công nợ', stock_costs: 'Giá vốn và đối soát' };
    const subSections = {
        obligations: { obligations: 'Khoản ghi nhận bổ sung', source_documents: 'Khoản từ đơn và lịch đã hoàn tất' },
        accounts: { accounts: 'Số dư đã khai báo', movements: 'Thu chi đã ghi nhận', unallocated_payments: 'Khoản thu cần chọn nơi nhận', unallocated_refunds: 'Khoản hoàn cần chọn nơi chi', opening_coverage: 'Khoản trong số dư đầu' },
        stock_costs: { stock_costs: 'Vốn tồn hiện tại', sale_costs: 'Giá vốn dòng bán', services: 'Ca cần ghi chi phí', service_entries: 'Chi phí dịch vụ đã ghi', revenues: 'Hồ sơ cũ cần xác nhận', returns: 'Phiếu đổi trả cần đối soát', credit_entries: 'Giảm trừ đã ghi nhận', refunds: 'Khoản hoàn cần phân loại', refund_entries: 'Khoản hoàn đã phân loại', audit: 'Lịch sử ghi nhận' }
    };
    const titles = { account: 'Khai báo số dư', expense: 'Ghi nhận chi phí', receivable: 'Ghi khoản phải thu', payable: 'Ghi khoản phải trả', movement: 'Ghi thu chi khác', transfer: 'Chuyển tiền nội bộ', settle: 'Thanh toán công nợ', payment: 'Chọn nơi nhận khoản thu', refund: 'Chọn nơi chi khoản hoàn', payment_covered: 'Xác nhận khoản thu trong số dư đầu', refund_covered: 'Xác nhận khoản hoàn trong số dư đầu', reconcile: 'Đối soát số dư', stock_opening: 'Xác nhận giá trị vốn tồn', sale_cost: 'Ghi giá vốn dòng bán', service_cost: 'Ghi chi phí trực tiếp của ca', refund_allocation: 'Phân loại khoản hoàn', revenue_confirm: 'Xác nhận giá trị hồ sơ cũ', period_review: 'Đối soát kết quả trong kỳ', void_entry: 'Hủy ghi nhận', void_movement: 'Hủy thu chi' };
    Object.assign(titles, { void_coverage: 'Hủy xác nhận trong số dư đầu', revenue_credit: 'Ghi giảm trừ và đối soát phiếu đổi trả', document_due: 'Đặt hạn thu hoặc hoàn tiền' });
    const s = { root: null, range: null, view: 'expenses', section: 'expenses', query: '', page: 1, report: null, rows: [], total: 0, loading: false, error: null, generation: 0, form: null, attempt: null, saving: false, listeners: [], lookupVersion: 0, forecastPage: 1, includeReceivables: false, horizon: 30, updatedAt: 0 };
    const node = selector => s.root?.querySelector(selector) || s.forecast?.querySelector(selector);
    const client = () => window.getSupabaseClient?.() || window.SupabaseClient;
    const canWrite = () => !!(window.PawpalAdminAccess?.isAdmin?.() && window.PawpalAdminAccess.state?.user?.permissions?.includes('finance.write'));
    const action = (kind, label, id = '', css = 'admin-text-action') => `<button class="${css}" type="button" data-fin-action="${kind}"${id ? ` data-fin-id="${esc(id)}"` : ''}>${label}</button>`;
    const toolbarAction = (kind, label, primary = false) => action(kind, label, '', `admin-btn admin-btn-${primary ? 'primary' : 'secondary'}`);
    function errorText(error) {
        const messages = {
            finance_balance_mismatch: 'Số dư kiểm tra chưa khớp sổ tiền. Hãy kiểm tra giao dịch và căn cứ điều chỉnh trước khi đối soát.',
            finance_cash_period_closed: 'Thời điểm giao dịch nằm trước số dư đầu hoặc trong phần đã đối soát. Hãy kiểm tra lại nơi giữ tiền và thời điểm.',
            finance_opening_coverage_invalid: 'Khoản này phát sinh sau số dư đầu đã khai báo, cần ghi thành giao dịch thu hoặc chi.',
            finance_sources_incomplete: 'Còn hồ sơ thiếu giá trị, giá vốn, chi phí hoặc phân loại hoàn tiền.',
            finance_report_changed: 'Dữ liệu đã thay đổi. Hãy tải lại báo cáo rồi đối soát.',
            finance_refund_split_invalid: 'Tổng các phần phân loại phải bằng đúng số tiền đã hoàn.',
            finance_cost_already_known: 'Dòng bán đã có giá vốn được ghi nhận. Hãy tải lại danh sách.',
            finance_expense_confirmation_required: 'Cần xác nhận đã kiểm tra đủ chi phí trong kỳ.',
            finance_source_already_recorded: 'Khoản tiền này đã được ghi vào tiền mặt hoặc ngân hàng hoặc xác nhận trong số dư đầu.'
            ,finance_use_document_receivable: 'Khoản này thuộc đơn hoặc lịch đã có. Hãy mở danh sách công nợ từ hồ sơ gốc để tránh ghi trùng.'
            ,finance_credit_exceeds_invoice: 'Tổng giảm trừ vượt giá trị hồ sơ. Hãy kiểm tra các khoản đã ghi qua hoàn tiền và phiếu đổi trả.'
            ,finance_refund_credit_already_recorded: 'Phiếu đổi trả đã ghi giảm trừ. Phần hoàn tương ứng cần phân loại là khoản đã giảm giá trị trong hồ sơ/chứng từ.'
        };
        if (messages[error?.message]) return messages[error.message];
        if (error?.code === '42501') return 'Bạn chưa có quyền thực hiện thao tác tài chính này.';
        if (error?.code === '23505') return 'Chứng từ, khoản tiền hoặc tên theo dõi đã được ghi nhận. Hãy kiểm tra danh sách.';
        if (error?.code === 'PT409') return 'Hồ sơ đã thay đổi hoặc số thanh toán vượt phần còn lại. Hãy tải lại trước khi ghi nhận.';
        if (['22023', '22P02', '22007', '22008', '23514', '23502', '23503'].includes(error?.code)) return 'Thông tin chưa hợp lệ. Hãy kiểm tra số tiền, ngày, căn cứ và lựa chọn liên quan.';
        if (String(error?.code).startsWith('PGRST') || error?.code === '42P01') return 'Nguồn tài chính chưa sẵn sàng. Hãy thử tải lại.';
        return 'Không tải được dữ liệu tài chính. Hãy thử lại.';
    }
    async function rpc(name, args) {
        const db = client(); if (!db) throw Error('no_connection');
        const { data, error } = await db.rpc(name, args); if (error) throw error; return data;
    }
    function pagination(total, page, attribute) {
        const pages = Math.max(1, Math.ceil(total / 10));
        return pages <= 1 ? '' : `<button class="pagination-btn" type="button" ${attribute}="${page - 1}"${page <= 1 ? ' disabled' : ''}>&lt;</button><button class="pagination-btn active" type="button" aria-current="page">${page}</button><button class="pagination-btn" type="button" ${attribute}="${page + 1}"${page >= pages ? ' disabled' : ''}>&gt;</button>`;
    }
    function shell() {
        s.root.innerHTML = `<header class="admin-workspace-heading"><h3 class="admin-card-title">Tổng hợp</h3><div class="finance-heading-actions">${toolbarAction('export', 'Xuất số liệu')}${toolbarAction('refresh', 'Làm mới sổ')}</div></header>
            <div class="admin-workspace-body" data-fin-summary></div>
            <div class="admin-workspace-body"><div class="admin-filter-tabs" role="group" aria-label="Sổ tài chính">${Object.entries(sections).map(([key, label]) => `<button class="admin-filter-tab" type="button" data-fin-view="${key}">${label}</button>`).join('')}</div>
              <div class="finance-book-toolbar"><label class="admin-control-label finance-search"><span class="admin-visually-hidden">Tìm trong sổ</span><input class="admin-input" type="search" data-fin-search maxlength="200" value="${esc(s.query)}" placeholder="Tìm theo tên hoặc mã chứng từ"></label><div class="finance-toolbar" data-fin-tools></div></div><div data-fin-editor hidden></div><p class="biz-error" data-fin-message hidden role="status"></p></div>
            <div class="admin-workspace-body admin-workspace-table-body" data-fin-table></div>`;
        const nav = document.createElement('nav'); nav.className = 'admin-pagination-bar biz-wide'; nav.dataset.finPagination = ''; nav.setAttribute('aria-label', 'Phân trang tài chính');
        const forecast = document.createElement('section'); forecast.className = 'admin-workspace-section biz-panel biz-wide'; forecast.dataset.finForecastPanel = ''; forecast.hidden = true;
        forecast.innerHTML = `<header class="admin-workspace-heading"><h3 class="admin-card-title">Lịch thu chi dự kiến</h3></header><div class="admin-workspace-body"><div class="finance-toolbar"><label class="admin-control-label">Xem trước <select class="admin-select" data-fin-horizon>${[7, 30, 60, 90].map(n => `<option value="${n}"${s.horizon === n ? ' selected' : ''}>${n} ngày</option>`).join('')}</select></label><label class="admin-control-label"><input type="checkbox" data-fin-include${s.includeReceivables ? ' checked' : ''}> Tính khoản phải thu đến hạn</label></div><p class="biz-caption">Dự kiến theo số dư tiền mặt, ngân hàng và công nợ đã ghi nhận. Khoản phải trả quá hạn được xếp vào hôm nay; khoản phải thu quá hạn chưa được giả định thu ngay.</p><div data-fin-forecast></div></div>`;
        const forecastPages = document.createElement('nav'); forecastPages.className = 'admin-pagination-bar biz-wide'; forecastPages.setAttribute('aria-label', 'Phân trang lịch thu chi'); forecastPages.hidden = true;
        s.root.after(nav, forecast, forecastPages); s.pagination = nav; s.forecast = forecast; s.forecastPagination = forecastPages;
    }
    function renderSummary() {
        const target = node('[data-fin-summary]'); if (!target) return;
        if (!s.report) {
            if (s.loading) window.PawpalAdmin.renderBlockSkeleton(target, 'Đang tải tài chính');
            else target.innerHTML = '<p class="biz-caption">Chưa tải được số tổng tài chính.</p>';
            renderForecast();
            return;
        }
        const r = s.report, m = r.missing;
        const evidenceOpen = !!target.querySelector('[data-fin-evidence]')?.open;
        const problems = [['revenue', 'hồ sơ cần xác nhận giá trị', 'revenues'], ['product_cost', 'dòng hoặc giao dịch thiếu giá vốn', 'sale_costs'], ['service_cost', 'ca cần ghi chi phí trực tiếp', 'services'], ['refunds', 'khoản hoàn cần phân loại', 'refunds'], ['returns', 'phiếu đổi trả cần đối soát', 'returns']].filter(([key]) => m[key] > 0);
        const metric = (label, value) => `<div><span>${label}</span><strong>${value}</strong></div>`;
        target.innerHTML = `<div class="finance-summary-groups"><section><h4 class="finance-summary-heading">Kết quả trong kỳ</h4><div class="finance-summary">${metric('Doanh thu đã ghi nhận', money(r.revenue))}${metric('Giá vốn đã có căn cứ', money(r.product_cost + r.service_cost))}${metric('Chi phí đã ghi nhận', money(r.expense))}${metric(r.partial ? 'Kết quả hoạt động tạm tính' : 'Kết quả hoạt động', r.result_ready ? `<span${r.result < 0 ? ' class="biz-error"' : ''}>${money(r.result)}</span>` : '<span class="finance-result-pending">Chưa đủ dữ liệu</span>')}</div>
            ${problems.length ? `<details class="biz-details finance-evidence" data-fin-evidence${evidenceOpen ? ' open' : ''}><summary class="biz-summary">${problems.length} nhóm dữ liệu cần đối soát</summary><div class="finance-missing" aria-label="Các khoản cần đối soát">${problems.map(([key, label, section]) => `<button class="admin-text-action" type="button" data-fin-section="${section}">${m[key]} ${label}</button>`).join('')}</div></details>` : !r.review_current ? `<p class="biz-caption">${r.reviewed_at ? 'Dữ liệu đã thay đổi sau lần đối soát trước, cần kiểm tra lại.' : 'Chưa xác nhận đủ chi phí trong kỳ.'} ${canWrite() ? action('period_review', 'Đối soát kết quả') : ''}</p>` : `<p class="biz-caption">Đã đối soát ${esc(at(r.reviewed_at))}. Kết quả theo phạm vi hồ sơ đã ghi nhận, chưa phải lợi nhuận sau thuế.</p>`}
            </section><section><h4 class="finance-summary-heading">Số dư và công nợ</h4><dl class="finance-position"><div><dt>Số dư theo sổ hiện tại</dt><dd>${r.cash.accounts ? money(r.cash.balance) : '<span class="finance-balance-pending">Chưa khai báo</span>'}</dd><span class="admin-table__secondary">${r.cash.accounts ? `${r.cash.accounts} nơi đã khai báo${r.cash.unreconciled_accounts ? ` · ${r.cash.unreconciled_accounts} chưa đối soát` : ` · Đối soát ${esc(at(r.cash.reconciled_to))}`}` : canWrite() ? action('account', 'Khai báo số dư') : ''}</span></div><div><dt>Phải thu đã xác định</dt><dd>${money(r.obligations.receivable)}</dd></div><div><dt>Phải trả hoặc hoàn đã xác định</dt><dd>${money(r.obligations.payable)}</dd></div></dl>
            ${r.obligations.unknown_documents || r.obligations.overdue || r.obligations.undated || r.cash.unallocated_payments || r.cash.unallocated_refunds ? `<p class="biz-caption">${[r.obligations.unknown_documents ? `${r.obligations.unknown_documents} hồ sơ chưa xác định công nợ` : '', r.obligations.overdue ? `${r.obligations.overdue} khoản quá hạn` : '', r.obligations.undated ? `${r.obligations.undated} khoản chưa có hạn` : '', r.cash.unallocated_payments ? `${r.cash.unallocated_payments} khoản thu chưa chọn nơi nhận` : '', r.cash.unallocated_refunds ? `${r.cash.unallocated_refunds} khoản hoàn chưa chọn nơi chi` : ''].filter(Boolean).join(' · ')}.</p>` : ''}
            <p class="biz-caption">${action('forecast', s.forecast.hidden ? 'Xem lịch thu chi dự kiến' : 'Ẩn lịch thu chi dự kiến')}${r.obligations.undated ? ' · Còn khoản chưa có hạn nên lịch chưa đầy đủ.' : ''}</p></section></div>`;
        renderForecast();
    }
    function renderForecast() {
        const target = node('[data-fin-forecast]'); if (!target) return;
        if (!s.report) { target.innerHTML = '<p class="biz-caption">Chưa có số liệu hiện tại để lập lịch tiền.</p>'; s.forecastPagination.hidden = true; return; }
        const all = s.report.forecast.rows;
        s.forecastPage = Math.min(s.forecastPage, Math.max(1, Math.ceil(all.length / 10)));
        target.innerHTML = !s.report.cash.accounts ? '<p class="biz-caption">Cần số dư đầu được xác nhận để tính lịch tiền.</p>' : `<div class="table-responsive-wrapper"><table class="admin-table biz-evidence-table"><thead><tr><th>Ngày</th><th>Thu dự kiến</th><th>Chi dự kiến</th><th>Số dư dự kiến</th></tr></thead><tbody>${all.slice((s.forecastPage - 1) * 10, s.forecastPage * 10).map(row => `<tr><td>${esc(row.day.split('-').reverse().join('/'))}</td><td>${money(row.incoming)}</td><td>${money(row.outgoing)}</td><td${row.balance < 0 ? ' class="biz-error"' : ''}>${money(row.balance)}</td></tr>`).join('')}</tbody></table></div>`;
        s.forecastPagination.innerHTML = s.report.cash.accounts ? pagination(all.length, s.forecastPage, 'data-fin-forecast-page') : ''; s.forecastPagination.hidden = s.forecast.hidden || !s.forecastPagination.innerHTML;
    }
    function renderTools() {
        if (!s.root) return;
        s.root.querySelectorAll('[data-fin-view]').forEach(button => { button.classList.toggle('active', button.dataset.finView === s.view); button.setAttribute('aria-pressed', String(button.dataset.finView === s.view)); });
        const options = subSections[s.view];
        const picker = options ? `<label class="admin-control-label finance-list-picker">Danh sách <select class="admin-select" data-fin-list>${Object.entries(options).map(([key, label]) => `<option value="${key}"${key === s.section ? ' selected' : ''}>${label}</option>`).join('')}</select></label>` : '';
        let buttons = '';
        if (canWrite()) buttons = s.view === 'expenses' ? toolbarAction('expense', 'Ghi nhận chi phí', true) : s.view === 'accounts' ? `${toolbarAction('account', 'Khai báo số dư', true)}${toolbarAction('movement', 'Thu chi khác')}${toolbarAction('transfer', 'Chuyển tiền')}` : s.view === 'obligations' ? `${toolbarAction('receivable', 'Ghi khoản phải thu', true)}${toolbarAction('payable', 'Ghi khoản phải trả')}` : '';
        node('[data-fin-tools]').innerHTML = picker + `<div class="finance-book-actions">${buttons}</div>`;
    }
    function rowActions(row) {
        if (s.section === 'source_documents') return `${action('source_open', 'Mở hồ sơ gốc', row.id)}${canWrite() && row.known ? ' ' + action('document_due', 'Đặt hạn', row.id) : ''}`;
        if (!canWrite() || row.status === 'void') return row.status === 'void' ? 'Đã hủy ghi nhận' : '—';
        if (s.section === 'accounts') return action('reconcile', 'Đối soát', row.id);
        if (['expenses', 'obligations'].includes(s.section)) return `${row.remaining > 0 ? action('settle', row.entry_kind === 'receivable' ? 'Ghi nhận thu' : 'Thanh toán', row.id) : ''} ${row.remaining === row.amount ? action('void_entry', 'Hủy ghi nhận', row.id) : ''}`;
        if (['service_entries', 'refund_entries', 'credit_entries'].includes(s.section)) return action('void_entry', 'Hủy ghi nhận', row.id);
        if (s.section === 'movements') return action('void_movement', 'Hủy thu chi', row.id);
        if (s.section === 'opening_coverage') return action('void_coverage', 'Hủy xác nhận', row.id);
        if (s.section === 'unallocated_payments') return `${action('payment', 'Chọn nơi nhận', row.id)} ${action('payment_covered', 'Trong số dư đầu', row.id)}`;
        if (s.section === 'unallocated_refunds') return `${action('refund', 'Chọn nơi chi', row.id)} ${action('refund_covered', 'Trong số dư đầu', row.id)}`;
        if (s.section === 'stock_costs') return action('stock_opening', 'Xác nhận vốn tồn', row.id);
        if (s.section === 'sale_costs') return action('sale_cost', row.known ? 'Điều chỉnh có căn cứ' : 'Ghi giá vốn', row.id);
        if (s.section === 'services') return action('service_cost', 'Ghi chi phí', row.id);
        if (s.section === 'refunds') return action('refund_allocation', 'Phân loại', row.id);
        if (s.section === 'revenues') return action('revenue_confirm', 'Xác nhận giá trị', row.id);
        if (s.section === 'returns') return action('revenue_credit', 'Đối soát giảm trừ', row.id);
        return '—';
    }
    function renderTable() {
        const target = node('[data-fin-table]'); if (!target) return;
        if (s.error) { target.innerHTML = `<p class="biz-error" role="alert">${esc(s.error)} ${action('refresh', 'Thử lại')}</p>`; s.pagination.innerHTML = ''; return; }
        if (s.loading && !s.rows.length) { window.PawpalAdmin.renderBlockSkeleton(target, 'Đang tải sổ tài chính'); return; }
        if (!s.rows.length) { target.innerHTML = '<p class="biz-empty">' + (s.query ? 'Không tìm thấy chứng từ phù hợp.' : s.section === 'expenses' ? 'Chưa có khoản chi phí nào.' : 'Chưa có dữ liệu trong danh sách này.') + '</p>'; s.pagination.innerHTML = ''; return; }
        const account = s.section === 'accounts', stock = ['stock_costs', 'sale_costs'].includes(s.section);
        const debt = ['expenses', 'obligations'].includes(s.section), documents = s.section === 'source_documents';
        const headers = account ? ['Tiền mặt hoặc tài khoản', 'Số dư theo sổ', 'Mốc số dư đầu', 'Đối soát gần nhất', 'Thao tác'] : stock ? ['Đối tượng', 'Số lượng', 'Giá vốn đã ghi', 'Căn cứ', 'Thao tác'] : debt ? ['Chứng từ', 'Giá trị ghi nhận', 'Còn lại', 'Hạn thanh toán', 'Thao tác'] : documents ? ['Hồ sơ', 'Còn phải thu hoặc hoàn', 'Hạn thu hoặc hoàn', 'Tình trạng', 'Thao tác'] : s.section === 'audit' ? ['Thao tác', 'Căn cứ', 'Thời điểm', 'Người ghi nhận', 'Dấu vết'] : ['Chứng từ', 'Số tiền', 'Thời điểm', 'Loại ghi nhận', 'Thao tác'];
        const rows = s.rows.map(row => {
            let cells;
            const label = `<strong class="admin-table__primary" title="${esc(row.label || row.reference)}">${esc(s.section === 'audit' ? titles[row.label] || 'Ghi nhận tài chính' : row.label || row.reference)}</strong>${row.reference ? `<div class="admin-table__secondary">${esc(row.reference)}</div>` : ''}${debt ? `<div class="admin-table__secondary">${esc(kinds[row.entry_kind])} · ${esc(row.counterparty)}</div>` : ''}`;
            if (account) cells = [label, money(row.balance), at(row.opening_at), at(row.reconciled_at)];
            else if (stock) cells = [label, String(row.quantity), row.amount == null ? 'Chưa đủ căn cứ' : money(row.amount), row.known ? 'Đã có giá vốn' : 'Cần xác nhận'];
            else if (debt) cells = [label, money(row.amount), money(row.remaining), row.due_on ? esc(row.due_on.split('-').reverse().join('/')) : 'Chưa có hạn'];
            else if (documents) cells = [label, row.known ? money(row.amount) : 'Chưa xác định', row.due_on ? esc(row.due_on.split('-').reverse().join('/')) : 'Chưa có hạn', !row.known ? 'Cần đối soát hoàn hoặc đổi trả' : row.direction === 'receivable' ? 'Phải thu' : 'Phải hoàn'];
            else if (s.section === 'audit') cells = [label, esc(row.reference), at(row.occurred_at), esc(row.actor_name || row.actor_id)];
            else cells = [label, row.amount == null ? 'Chưa ghi nhận' : money(row.amount), row.recognized_on ? esc(row.recognized_on.split('-').reverse().join('/')) : at(row.occurred_at || row.approved_on), kinds[row.entry_kind] || (row.account_name ? esc(row.account_name) : row.status === 'void' ? 'Đã hủy' : '—')];
            return `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}<td><div class="finance-row-actions">${s.section === 'audit' ? 'Đã lưu vết' : rowActions(row)}</div></td></tr>`;
        }).join('');
        target.innerHTML = `<div class="table-responsive-wrapper"><table class="admin-table biz-evidence-table"><thead><tr>${headers.map(label => `<th>${label}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
        s.pagination.innerHTML = pagination(s.total, s.page, 'data-fin-page');
    }
    async function refresh(includeReport = true) {
        if (!s.root || !s.range) return;
        const generation = ++s.generation, range = { ...s.range };
        s.loading = true; s.error = null; renderTable();
        const future = window.PawpalBusinessMetrics.shift(today(), s.horizon - 1);
        const results = await Promise.allSettled([
            includeReport || !s.report || s.error ? rpc('admin_finance_report', { p_from: range.from, p_to: range.to, p_future_to: future, p_include_receiv: s.includeReceivables }) : Promise.resolve(s.report),
            rpc('admin_finance_page', { p_section: s.section, p_from: range.from, p_to: range.to, p_page: s.page, p_query: s.query })
        ]);
        if (generation !== s.generation || !s.root) return;
        s.loading = false;
        if (results[0].status === 'fulfilled' && results[0].value?.missing && results[0].value?.cash && Array.isArray(results[0].value?.forecast?.rows)) s.report = results[0].value;
        else { s.report = null; s.error = errorText(results[0].reason || Error('invalid_response')); }
        if (results[1].status === 'fulfilled' && Array.isArray(results[1].value?.rows) && Number.isSafeInteger(results[1].value?.total) && results[1].value.rows.length <= 10) {
            const page = results[1].value; s.rows = page.rows; s.total = page.total; s.page = page.page;
        } else { s.rows = []; s.error = errorText(results[1].reason || Error('invalid_response')); }
        if (!s.error) s.updatedAt = Date.now();
        rememberPosition(); renderSummary(); renderTools(); renderTable(); renderPending();
    }
    function field(name, label, options = {}) {
        const { type = 'text', required = true, value = '', min = 0, select, help = '' } = options;
        const input = select ? `<select class="admin-select" id="fin-${name}" name="${name}"${required ? ' required' : ''}>${select.map(([id, title]) => `<option value="${esc(id)}">${esc(title)}</option>`).join('')}</select>` : `<input class="admin-input" name="${name}" id="fin-${name}" type="${type}" value="${esc(value)}"${required ? ' required' : ''}${type === 'number' ? ` min="${min}" max="1000000000000" step="0.0001"` : ''}${type === 'datetime-local' ? ' step="1"' : ''}${type === 'text' ? ' maxlength="200"' : ''}>`;
        return `<div class="finance-field"><label class="admin-control-label" for="fin-${name}">${label}${required ? ' <span class="finance-required">*</span>' : ''}</label>${input}${help ? `<span class="admin-table__secondary">${help}</span>` : ''}</div>`;
    }
    function entityField(name, label, kind, required = true) {
        return `<div class="finance-field customer-autocomplete-wrapper"><label class="admin-control-label" for="fin-lookup-${name}">${label}${required ? ' <span class="finance-required">*</span>' : ''}</label><input class="admin-input" id="fin-lookup-${name}" data-fin-lookup="${kind}" data-fin-field="${name}" autocomplete="off" placeholder="Tìm và chọn"><input type="hidden" name="${name}"><div class="autocomplete-dropdown" data-fin-options hidden role="listbox"></div><div class="finance-selected" data-fin-selected hidden></div></div>`;
    }
    function message(text, error = false) {
        const target = node('[data-fin-message]'); if (!target) return;
        target.textContent = text; target.hidden = !text; target.classList.toggle('biz-error', error);
    }
    function openForm(kind, row = {}) {
        if (s.attempt) { renderPending(); return; }
        if (!canWrite()) { message('Bạn chưa có quyền ghi nhận tài chính.', true); return; }
        s.form = { kind, row, range: { ...s.range } }; s.lookupVersion++;
        const ordinary = ['expense', 'receivable', 'payable'].includes(kind);
        let fields = '', note = '';
        if (kind === 'account') fields = field('name', 'Tên để theo dõi', { help: 'Ví dụ: Tiền mặt tại quầy, tài khoản ngân hàng cửa hàng.' }) + field('account_type', 'Loại tiền', { select: [['cash', 'Tiền mặt'], ['bank', 'Ngân hàng']] }) + field('opening_balance', 'Số dư đã xác nhận', { type: 'number', min: -1000000000000 }) + field('opening_at', 'Mốc số dư đầu', { type: 'datetime-local', value: localTime() });
        if (ordinary) {
            fields += entityField(kind === 'receivable' ? 'customer_id' : 'supplier_id', kind === 'receivable' ? 'Khách hàng trong hệ thống' : 'Nhà cung cấp trong hệ thống', kind === 'receivable' ? 'customers' : 'suppliers', false);
            if (kind === 'payable') fields += entityField('source_id', 'Phiếu nhập liên quan', 'purchases', false);
            fields += field('description', 'Diễn giải') + field('counterparty', 'Đối tác ngoài hệ thống', { value: row.counterparty || '', help: 'Chỉ nhập ở đây khi không chọn đối tác đã có trong danh sách.' });
            if (kind === 'expense') fields += field('category', 'Nhóm chi phí', { select: [['', 'Chọn nhóm'], ['Mặt bằng', 'Mặt bằng'], ['Nhân sự', 'Nhân sự'], ['Điện nước', 'Điện nước'], ['Vật tư', 'Vật tư'], ['Vận chuyển', 'Vận chuyển'], ['Khác', 'Khác']] });
            fields += field('amount', kind === 'expense' ? 'Chi phí được ghi nhận' : 'Giá trị khoản nợ tại mốc ghi nhận', { type: 'number' }) + field('recognized_on', 'Ngày ghi nhận', { type: 'date', value: today() }) + field('due_on', 'Hạn thanh toán', { type: 'date', required: false });
            note = kind === 'expense' ? 'Chi phí được ghi nhận riêng với thanh toán. Tiền mua hàng nhập kho được theo dõi qua giá vốn; hãy tránh nhập lại cùng khoản vào chi phí vận hành.' : kind === 'receivable' ? 'Ghi các khoản bổ sung ngoài đơn và lịch tại Pawpal. Khoản còn phải thu từ hồ sơ đã hoàn tất được lấy tự động trong danh sách riêng.' : 'Ghi theo chứng từ đã xác nhận. Phần thanh toán được ghi riêng để tính số còn lại.';
        }
        if (['movement', 'transfer', 'settle', 'payment', 'refund', 'payment_covered', 'refund_covered'].includes(kind)) {
            fields += entityField('account_id', kind === 'transfer' ? 'Nơi chuyển tiền đi' : 'Nơi nhận hoặc chi tiền', 'accounts');
            if (kind === 'transfer') fields += entityField('other_account_id', 'Nơi nhận tiền', 'accounts');
            if (kind === 'movement') fields += field('direction', 'Chiều biến động', { select: [['in', 'Thu vào'], ['out', 'Chi ra']] });
            if (['movement', 'transfer', 'settle'].includes(kind)) fields += field('amount', 'Số tiền thực tế', { type: 'number' }) + field('occurred_at', 'Thời điểm thu hoặc chi', { type: 'datetime-local', value: localTime() }) + field('description', 'Diễn giải');
            note = kind === 'settle' ? `Còn lại ${money(row.remaining)}. Có thể ghi từng lần thanh toán.` : kind.endsWith('_covered') ? 'Chỉ xác nhận khi khoản này đã nằm trong số dư đầu của nơi giữ tiền đã chọn. Thao tác này không cộng hoặc trừ tiền lần nữa.' : ['payment', 'refund'].includes(kind) ? `Dùng đúng số tiền ${money(row.amount)} và thời điểm ${at(row.occurred_at)} của giao dịch gốc.` : 'Thu chi khác không tự tạo doanh thu hoặc chi phí. Chuyển tiền nội bộ ghi đồng thời cả hai vế.';
        }
        if (kind === 'reconcile') fields = `<p class="biz-caption finance-form-wide">Số dư theo sổ hiện tại ${money(row.balance)}. Nhập số đã kiểm tra thực tế tại thời điểm đối soát.</p>` + field('balance', 'Số dư kiểm tra thực tế', { type: 'number', min: -1000000000000 }) + field('as_of', 'Đối soát đến', { type: 'datetime-local', value: localTime() });
        if (['stock_opening', 'sale_cost', 'service_cost'].includes(kind)) {
            fields = field('amount', kind === 'stock_opening' ? 'Tổng giá trị vốn tồn đã kiểm tra' : kind === 'sale_cost' ? 'Tổng giá vốn của dòng bán' : 'Chi phí trực tiếp ngoài chi phí vận hành', { type: 'number' });
            if (kind === 'service_cost') fields += field('description', 'Diễn giải');
            if (kind === 'sale_cost' && row.known) fields += field('description', 'Lý do điều chỉnh có căn cứ');
            note = kind === 'stock_opening' ? `Số lượng tồn đang ghi nhận: ${row.quantity}. Chỉ áp dụng cho lượng tồn hiện tại và các lần xuất tiếp theo; không tính lại lịch sử bán.` : kind === 'sale_cost' ? `Giá vốn cho toàn bộ ${row.quantity} đơn vị của dòng bán này; cần căn cứ tại lần bán gốc.` : 'Ghi tổng chi phí trực tiếp của ca, tránh cộng lại lương hoặc vật tư đã nằm trong chi phí vận hành. Nhập 0 khi đã kiểm tra và không có chi phí trực tiếp riêng.';
            if (kind === 'sale_cost' && row.known) note = 'Điều chỉnh này được lưu vết và yêu cầu đối soát lại báo cáo. Vốn tồn còn lại của SKU cũng cần xác nhận lại trước các lần xuất tiếp theo.';
        }
        if (kind === 'revenue_credit') { fields = field('amount', 'Phần giảm thêm chưa ghi qua khoản hoàn', { type: 'number' }) + field('recognized_on', 'Ngày ghi nhận giảm trừ', { type: 'date', value: row.approved_on || '' }) + field('description', 'Căn cứ giảm trừ hoặc xác nhận không giảm thêm'); note = `Đã giảm qua khoản hoàn ${money(row.already_reduced)}. Nhập phần giảm thêm theo chứng từ; nhập 0 khi đã kiểm tra không còn phần giảm thêm hoặc đổi ngang giá trị.`; }
        if (kind === 'document_due') { fields = field('due_on', 'Hạn thu hoặc hoàn', { type: 'date', value: row.due_on || '', required: false }); note = `Khoản ${row.direction === 'receivable' ? 'còn phải thu' : 'còn phải hoàn'} ${money(row.amount)} được tính từ hồ sơ và thanh toán gốc. Thu hoặc hoàn tiền thực hiện tại hồ sơ đó.`; }
        if (kind === 'refund_allocation') {
            note = `Tổng cần phân loại ${money(row.amount)}. Phân biệt giảm doanh thu, hoàn tiền nhận trước và chi bồi thường để tính kết quả đúng.`;
            fields = field('description', 'Căn cứ phân loại') + field('recognized_on', 'Ngày ghi nhận ảnh hưởng', { type: 'date', value: today() }) + field('revenue_part', 'Phần giảm doanh thu chưa ghi trong hồ sơ', { type: 'number' }) + field('document_part', 'Phần đã giảm giá trị trong hồ sơ', { type: 'number' }) + field('advance_part', 'Phần hoàn tiền nhận trước', { type: 'number' }) + field('expense_part', 'Phần chi bồi thường', { type: 'number' });
        }
        if (kind === 'revenue_confirm') note = `Giá trị hồ sơ hiện tại ${money(row.amount)}. Chỉ xác nhận khi đã đối chiếu đúng giá trị sau giảm trừ trên chứng từ gốc.`;
        if (kind === 'period_review') {
            note = `Đối soát kỳ ${s.range.from} – ${s.range.to}. Dữ liệu thay đổi sau xác nhận sẽ yêu cầu kiểm tra lại.`;
            fields = '<label class="admin-control-label finance-form-wide"><input type="checkbox" name="expenses_complete" required> Tôi đã kiểm tra và ghi nhận đủ chi phí thuộc kỳ này</label>';
        }
        if (kind.startsWith('void_')) { fields = field('description', 'Lý do hủy ghi nhận'); note = kind === 'void_movement' && row.transfer_id ? 'Cả hai vế của giao dịch chuyển tiền nội bộ sẽ được hủy cùng nhau.' : 'Giữ lại dấu vết ghi nhận cũ và lý do điều chỉnh.'; }
        fields += field('reference', ['account', 'stock_opening', 'sale_cost', 'service_cost', 'reconcile', 'period_review', 'revenue_confirm'].includes(kind) ? 'Chứng từ hoặc căn cứ xác nhận' : 'Mã chứng từ', { value: ['payment', 'refund', 'payment_covered', 'refund_covered', 'refund_allocation'].includes(kind) || kind.startsWith('void_') ? row.reference || row.label || '' : '' });
        const editor = node('[data-fin-editor]'); editor.hidden = false;
        editor.innerHTML = `<h4 class="admin-card-title">${titles[kind] || 'Hủy xác nhận trong số dư đầu'}</h4>${row.label ? `<p class="biz-caption">${esc(row.label)}</p>` : ''}${note ? `<p class="biz-caption">${esc(note)}</p>` : ''}<form class="finance-form" onsubmit="return false;">${fields}<div class="finance-form-actions finance-form-wide"><button class="admin-btn admin-btn-secondary" type="button" data-fin-close>Đóng biểu mẫu</button><button class="admin-btn admin-btn-primary" type="button" data-fin-save>Ghi nhận</button></div></form>`;
        editor.querySelector('form').addEventListener('submit', event => event.preventDefault());
        editor.querySelector('input:not([type=hidden]),select')?.focus(); message('');
    }
    function closeForm() { s.form = null; s.lookupVersion++; const editor = node('[data-fin-editor]'); if (editor) { editor.hidden = true; editor.replaceChildren(); } }
    function formPayload() {
        const form = node('[data-fin-editor] form'); if (!form?.reportValidity()) return null;
        const { kind, row, range } = s.form, data = Object.fromEntries(new FormData(form));
        for (const hidden of form.querySelectorAll('input[type=hidden]')) if (!hidden.value && hidden.name === 'account_id' || !hidden.value && hidden.name === 'other_account_id') { message('Hãy tìm và chọn đúng nơi nhận hoặc chi tiền.', true); return null; }
        for (const key of ['amount', 'opening_balance', 'balance', 'revenue_part', 'advance_part', 'expense_part', 'document_part']) if (Object.hasOwn(data, key)) data[key] = Number(data[key]);
        for (const key of ['opening_at', 'occurred_at', 'as_of']) if (data[key]) data[key] = new Date(data[key] + (data[key].length === 16 ? ':00' : '') + '+07:00').toISOString();
        if (!Object.hasOwn(data, 'recognized_on') && ['service_cost', 'refund_allocation'].includes(kind)) data.recognized_on = today();
        if (row.id && ['settle', 'payment', 'refund', 'payment_covered', 'refund_covered', 'stock_opening', 'sale_cost', 'service_cost', 'refund_allocation', 'revenue_confirm', 'revenue_credit', 'document_due'].includes(kind)) data.source_id = row.id;
        if (kind === 'stock_opening') { data.expected_quantity = row.quantity; data.expected_stock_at = row.expected_stock_at; }
        if (kind === 'sale_cost') { data.expected_quantity = row.quantity; data.correcting = !!row.known; }
        if (kind === 'document_due') { data.source_kind = row.source_kind; data.direction = row.direction; }
        if (kind === 'refund_allocation') data.amount = row.amount;
        if (kind === 'revenue_confirm') { data.source_kind = row.source_kind; data.expected_amount = row.amount; }
        if (kind === 'reconcile') data.account_id = row.id;
        if (kind.startsWith('void_')) data.id = row.id;
        if (kind === 'period_review') Object.assign(data, { from: range.from, to: range.to, fingerprint: s.report.fingerprint, expenses_complete: form.elements.expenses_complete.checked });
        return { p_request_id: crypto.randomUUID(), p_action: kind, p_data: data, p_expected_updated_at: ['settle', 'stock_opening', 'sale_cost', 'document_due', 'void_entry', 'void_movement', 'void_coverage'].includes(kind) ? row.updated_at || null : null };
    }
    function renderPending() {
        if (s.attempt && !s.saving) {
            const target = node('[data-fin-message]'); if (!target) return;
            target.hidden = false; target.innerHTML = 'Chưa xác định kết quả ghi nhận. Kiểm tra lại bằng cùng yêu cầu để tránh lưu trùng. <button class="admin-text-action" type="button" data-fin-retry-write>Kiểm tra lại</button>';
        }
    }
    async function save(retry = false) {
        if (s.saving || !s.root) return;
        const payload = retry ? s.attempt : formPayload(); if (!payload) return;
        s.attempt = payload; s.saving = true;
        const form = node('[data-fin-editor] form'); form?.querySelectorAll('input,select,button').forEach(input => input.disabled = true);
        message('Đang ghi nhận…');
        try {
            const id = await rpc('admin_finance_post', payload); if (typeof id !== 'string') throw Error('unknown_write_result');
            s.attempt = null; closeForm(); message('Đã ghi nhận tài chính.');
            await refresh();
        } catch (error) {
            if (error?.code && /^(?:[0-9A-Z]{5}|PGRST\d+)$/.test(error.code)) { s.attempt = null; message(errorText(error), true); }
        } finally {
            s.saving = false; form?.querySelectorAll('input,select,button').forEach(input => input.disabled = !!s.attempt); renderPending();
        }
    }
    async function lookup(input) {
        const generation = ++s.lookupVersion, query = input.value, wrapper = input.closest('.customer-autocomplete-wrapper'), list = wrapper.querySelector('[data-fin-options]');
        list.hidden = false; list.innerHTML = '<div class="finance-option">Đang tìm…</div>';
        try {
            const rows = await rpc('admin_finance_lookup', { p_kind: input.dataset.finLookup, p_query: query });
            if (generation !== s.lookupVersion || !input.isConnected || query !== input.value) return;
            if (!Array.isArray(rows) || rows.length > 10) throw Error('invalid_response');
            wrapper._financeRows = rows;
            list.hidden = false;
            list.innerHTML = rows.length ? rows.map((row, i) => `<button class="finance-option" role="option" type="button" data-fin-pick="${i}"><strong>${esc(row.label)}</strong><span>${esc(row.detail || row.counterparty || (row.remaining != null ? 'Còn lại ' + money(row.remaining) : row.balance != null ? 'Số dư theo sổ ' + money(row.balance) : ''))}</span></button>`).join('') : '<div class="finance-option">Chưa có lựa chọn phù hợp.</div>';
        } catch (error) { if (generation === s.lookupVersion) list.innerHTML = `<div class="finance-option">${esc(errorText(error))}</div>`; }
    }
    function pick(button) {
        const wrapper = button.closest('.customer-autocomplete-wrapper'), input = wrapper.querySelector('[data-fin-lookup]'), row = wrapper._financeRows?.[Number(button.dataset.finPick)]; if (!row) return;
        wrapper.querySelector('input[type=hidden]').value = row.id; input.hidden = true;
        wrapper.querySelector('[data-fin-options]').hidden = true;
        const selected = wrapper.querySelector('[data-fin-selected]'); selected.hidden = false; selected.innerHTML = `${esc(row.label)} <button class="admin-text-action" type="button" data-fin-clear>Bỏ chọn</button>`;
        if (input.dataset.finLookup === 'purchases') {
            const form = input.closest('form'); if (form.elements.counterparty) form.elements.counterparty.value = row.counterparty || '';
            if (form.elements.amount && !form.elements.amount.value) form.elements.amount.value = row.amount == null ? '' : row.amount;
            const supplier = form.querySelector('[data-fin-lookup="suppliers"]')?.closest('.customer-autocomplete-wrapper');
            if (supplier && row.supplier_id) { supplier.querySelector('input[type=hidden]').value = row.supplier_id; supplier.querySelector('[data-fin-lookup]').hidden = true; supplier.querySelector('[data-fin-selected]').hidden = false; supplier.querySelector('[data-fin-selected]').innerHTML = `${esc(row.counterparty)} <button class="admin-text-action" type="button" data-fin-clear>Bỏ chọn</button>`; supplier.dataset.finFromPurchase = 'true'; }
            if (form.elements.counterparty) form.elements.counterparty.closest('.finance-field').hidden = true;
        }
        if (['customers', 'suppliers'].includes(input.dataset.finLookup)) { const party = input.closest('form').elements.counterparty; party.value = row.label; party.closest('.finance-field').hidden = true; }
    }
    function clearSelection(wrapper) {
        const input = wrapper.querySelector('[data-fin-lookup]'), form = input.closest('form');
        wrapper.querySelector('input[type=hidden]').value = ''; wrapper.querySelector('[data-fin-selected]').hidden = true; input.hidden = false; input.value = '';
        if (['customers', 'suppliers', 'purchases'].includes(input.dataset.finLookup)) {
            const party = form.elements.counterparty; if (party) { party.value = ''; party.closest('.finance-field').hidden = false; }
            if (input.dataset.finLookup === 'purchases') { const supplier = form.querySelector('[data-fin-lookup="suppliers"]')?.closest('.customer-autocomplete-wrapper'); if (supplier?.dataset.finFromPurchase === 'true') { delete supplier.dataset.finFromPurchase; clearSelection(supplier); } }
            if (input.dataset.finLookup === 'suppliers') { const purchase = form.querySelector('[data-fin-lookup="purchases"]')?.closest('.customer-autocomplete-wrapper'); if (purchase?.querySelector('input[type=hidden]').value) { purchase.querySelector('input[type=hidden]').value = ''; purchase.querySelector('[data-fin-selected]').hidden = true; purchase.querySelector('[data-fin-lookup]').hidden = false; purchase.querySelector('[data-fin-lookup]').value = ''; } }
        }
        input.focus();
    }
    function openSource(row) {
        if (!row) return;
        const order = row.source_kind === 'order';
        sessionStorage.setItem(order ? 'pawpal_admin_order_selected_id' : 'pawpal_admin_service_selected_id', row.id);
        if (order && window.PawpalOrders?.state) window.PawpalOrders.state.selectedOrderId = row.id;
        if (!order && window.PawpalServices?.state) window.PawpalServices.state.selectedBookingId = row.id;
        window.location.hash = `${order ? 'tab-order-detail' : 'tab-service-detail'}?id=${encodeURIComponent(row.id)}`;
    }
    function chooseSection(section) {
        if (s.attempt || s.saving) return;
        s.section = section; s.view = Object.hasOwn(sections, section) ? section : Object.entries(subSections).find(([, value]) => Object.hasOwn(value, section))?.[0] || 'expenses';
        s.page = 1; s.query = ''; clearTimeout(s.searchTimer); node('[data-fin-search]').value = ''; s.rows = []; closeForm(); renderTools(); refresh(false);
    }
    function rememberPosition() {
        try { sessionStorage.setItem('pawpal_dashboard_finance_position', JSON.stringify({ section: s.section, page: s.page, query: s.query })); } catch (_) { /* Storage may be unavailable. */ }
    }
    function restorePosition() {
        try {
            const saved = JSON.parse(sessionStorage.getItem('pawpal_dashboard_finance_position') || 'null');
            if (!saved || !Object.values(subSections).some(group => Object.hasOwn(group, saved.section)) && saved.section !== 'expenses') return;
            s.section = saved.section; s.view = saved.section === 'expenses' ? 'expenses' : Object.entries(subSections).find(([, group]) => Object.hasOwn(group, saved.section))[0];
            s.page = Number.isSafeInteger(saved.page) && saved.page > 0 ? saved.page : 1; s.query = typeof saved.query === 'string' ? saved.query.slice(0, 200) : '';
        } catch (_) { /* Only UI position is persisted; all records come from Supabase. */ }
    }
    function exportReport() {
        if (s.loading || s.error || !s.report) { message('Chưa có bản số liệu hiện tại để xuất.', true); return; }
        const r = s.report;
        const rows = [['Chỉ tiêu', 'Giá trị'], ['Từ ngày', s.range.from], ['Đến ngày', s.range.to], ['Trạng thái', r.result_ready ? r.partial ? 'Tạm tính trong kỳ đang chạy' : 'Đã đối soát' : 'Chưa đủ dữ liệu để kết luận'], ['Doanh thu đã ghi nhận', r.revenue], ['Giá vốn sản phẩm đã có căn cứ', r.product_cost], ['Chi phí trực tiếp dịch vụ đã ghi', r.service_cost], ['Chi phí vận hành và bồi thường đã ghi', r.expense], ['Kết quả hoạt động', r.result_ready ? r.result : ''], ['Số nơi giữ tiền đã khai báo', r.cash.accounts], ['Số dư tiền mặt và ngân hàng đã khai báo', r.cash.balance ?? ''], ['Mốc đối soát chung', r.cash.reconciled_to || ''], ['Phải thu đã ghi nhận', r.obligations.receivable], ['Phải trả đã ghi nhận', r.obligations.payable], ...Object.entries(r.missing).map(([key, value]) => [{ revenue: 'Hồ sơ thiếu giá trị', product_cost: 'Dòng hoặc giao dịch thiếu giá vốn', service_cost: 'Ca thiếu chi phí trực tiếp', refunds: 'Khoản hoàn chưa phân loại' }[key], value])];
        const csv = rows.map(row => row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(',')).join('\r\n');
        const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `tai-chinh-${s.range.from}-${s.range.to}.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
    }
    function bind() {
        const on = (target, type, handler) => { target.addEventListener(type, handler); s.listeners.push(() => target.removeEventListener(type, handler)); };
        const clickHandler = event => {
            const pickButton = event.target.closest('[data-fin-pick]'); if (pickButton) return pick(pickButton);
            const clear = event.target.closest('[data-fin-clear]'); if (clear) return clearSelection(clear.closest('.customer-autocomplete-wrapper'));
            const view = event.target.closest('[data-fin-view]'); if (view) return chooseSection(view.dataset.finView);
            const section = event.target.closest('[data-fin-section]'); if (section) return chooseSection(section.dataset.finSection);
            if (event.target.closest('[data-fin-save]')) return save();
            if (event.target.closest('[data-fin-retry-write]')) return save(true);
            if (event.target.closest('[data-fin-close]')) { if (!s.saving && !s.attempt) closeForm(); return; }
            const button = event.target.closest('[data-fin-action]'); if (button) { if (button.dataset.finAction === 'refresh') return refresh(); if (button.dataset.finAction === 'export') return exportReport(); if (button.dataset.finAction === 'source_open') return openSource(s.rows.find(row => row.id === button.dataset.finId)); if (button.dataset.finAction === 'forecast') { s.forecast.hidden = !s.forecast.hidden; renderSummary(); return; } return openForm(button.dataset.finAction, s.rows.find(row => row.id === button.dataset.finId) || {}); }
            const forecast = event.target.closest('[data-fin-forecast-page]'); if (forecast && !forecast.disabled) { s.forecastPage = Number(forecast.dataset.finForecastPage); renderForecast(); }
        };
        on(s.root, 'click', clickHandler); on(s.forecast, 'click', clickHandler); on(s.forecastPagination, 'click', clickHandler);
        on(s.pagination, 'click', event => { const button = event.target.closest('[data-fin-page]'); if (button && !button.disabled && !s.saving && !s.attempt) { s.page = Number(button.dataset.finPage); s.rows = []; refresh(false); } });
        const changeHandler = event => { if (event.target.matches('[data-fin-list]')) chooseSection(event.target.value); if (event.target.matches('[data-fin-horizon]')) { s.horizon = Number(event.target.value); refresh(); } if (event.target.matches('[data-fin-include]')) { s.includeReceivables = event.target.checked; refresh(); } };
        on(s.root, 'change', changeHandler); on(s.forecast, 'change', changeHandler);
        on(s.root, 'input', event => {
            if (event.target.matches('[data-fin-lookup]')) { clearTimeout(s.lookupTimer); s.lookupTimer = setTimeout(() => lookup(event.target), 180); }
            if (event.target.matches('[data-fin-search]')) { clearTimeout(s.searchTimer); s.searchTimer = setTimeout(() => { if (s.saving || s.attempt) return; s.query = event.target.value.trim(); s.page = 1; s.rows = []; refresh(false); }, 250); }
        });
        on(s.root, 'focusin', event => { if (event.target.matches('[data-fin-lookup]')) lookup(event.target); });
        on(s.root, 'keydown', event => {
            const wrapper = event.target.closest('.customer-autocomplete-wrapper'); if (!wrapper) return;
            const list = wrapper.querySelector('[data-fin-options]'), options = [...list.querySelectorAll('button')];
            if (event.key === 'Escape') { list.hidden = true; s.lookupVersion++; }
            if (['ArrowDown', 'ArrowUp'].includes(event.key) && options.length) { event.preventDefault(); list.hidden = false; const index = options.indexOf(document.activeElement); options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length].focus(); }
        });
        on(document, 'click', event => { if (!event.target.closest('.customer-autocomplete-wrapper') && !event.target.closest('[data-fin-action]')) { s.lookupVersion++; s.root?.querySelectorAll('[data-fin-options]').forEach(list => list.hidden = true); } });
        on(window, 'pawpal:workspace-invalidated', event => {
            if (!event.detail?.modules || event.detail.modules.includes('Dashboard')) invalidate();
        });
        on(window, 'pawpal:mutation', invalidate);
        on(document, 'visibilitychange', () => { if (!document.hidden && (!s.updatedAt || Date.now() - s.updatedAt >= 120_000)) invalidate(); });
        on(window, 'online', invalidate);
    }
    function invalidate() {
        if (!s.root) return;
        s.updatedAt = 0;
        clearTimeout(s.invalidationTimer);
        s.invalidationTimer = setTimeout(() => {
            if (!s.root?.getClientRects().length || document.hidden) return;
            if (s.loading || s.saving) invalidate();
            else refresh();
        }, 800);
    }
    function mount(root, range) {
        unmount(); if (!root) return;
        restorePosition(); s.root = root; s.range = { from: range.from, to: range.to }; shell(); bind(); renderTools(); refresh(); renderPending();
    }
    function setPeriod(range) {
        if (!s.root || s.range?.from === range.from && s.range?.to === range.to) return;
        s.range = { from: range.from, to: range.to }; s.page = 1; s.forecastPage = 1; s.rows = []; s.report = null; if (s.form?.kind === 'period_review') closeForm(); refresh();
    }
    function unmount() {
        clearTimeout(s.searchTimer); clearTimeout(s.lookupTimer); clearTimeout(s.invalidationTimer); s.generation++; s.lookupVersion++; s.listeners.splice(0).forEach(remove => remove()); s.pagination?.remove(); s.forecast?.remove(); s.forecastPagination?.remove(); s.root = null; s.forecast = null; s.report = null; s.rows = []; s.form = null;
    }
    function refreshIfStale() {
        if (!s.loading && !s.saving && Date.now() - s.updatedAt >= 120_000) return refresh();
    }
    window.PawpalDashboardFinance = { mount, setPeriod, unmount, refresh, refreshIfStale, invalidate, getState: () => ({ section: s.section, error: s.error, loading: s.loading, pendingWrite: !!s.attempt }) };
})();
