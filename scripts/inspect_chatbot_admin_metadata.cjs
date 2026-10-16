// Read-only inventory: GET metadata and zero-row selects only. Never invoke RPCs.
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const url = process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.SUPABASE_ANON_KEY;
if (!url || !service || !anon) throw new Error('Missing Supabase configuration names; values suppressed.');
function role(key) {
    try { return JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role || 'unverified'; }
    catch { return key.startsWith('sb_secret_') ? 'secret key format' : key.startsWith('sb_publishable_') ? 'publishable key format' : 'unverified'; }
}
async function get(route, key, extra = {}) {
    try {
        const r = await fetch(url + route, {
            method: 'GET', headers: { apikey: key, Authorization: 'Bearer ' + key, ...extra },
            signal: AbortSignal.timeout(20000)
        });
        const body = await r.json().catch(() => null);
        return { status: r.status, body: r.ok ? body : null, code: r.ok ? null : /^[A-Z0-9]+$/.test(body?.code || '') ? body.code : 'request_failed' };
    } catch (e) { return { status: 0, body: null, code: e.cause?.code || e.name }; }
}
const clean = v => String(v ?? '—').replace(/<[^>]*>/g, '').replace(/[|\r\n]/g, ' ').replace(/`/g, '');
async function main() {
    const first = await Promise.allSettled([
        get('/rest/v1/', service, { Accept: 'application/openapi+json' }),
        get('/rest/v1/', anon, { Accept: 'application/openapi+json' }),
        get('/rest/v1/pg_policies?select=tablename,policyname,roles,cmd,qual,with_check&limit=0', service, { 'Accept-Profile': 'pg_catalog' }),
        get('/storage/v1/bucket', service)
    ]);
    for (const r of first) if (r.status !== 'fulfilled') throw new Error('Metadata request failed; values suppressed.');
    const [s, a, catalog, storage] = first.map(r => r.value);
    if (s.status !== 200 || !s.body?.definitions) throw new Error('Service metadata unavailable: ' + s.status + ' ' + s.code);
    const defs = s.body.definitions;
    const sql = fs.readFileSync(path.join(root, 'scripts/database/20261007_chatbot_full_system.sql'), 'utf8');
    const expected = new Map();
    for (const m of sql.matchAll(/CREATE TABLE IF NOT EXISTS public\.(\w+)\s*\(([\s\S]*?)\n\);/g)) {
        expected.set(m[1], [...m[2].matchAll(/^\s{4}(\w+)\s+(?:UUID|VARCHAR|INT|TEXT|BOOLEAN|TIMESTAMPTZ|NUMERIC|JSONB)\b/gm)].map(x => x[1]));
    }
    const additions = { chat_conversation: ['resolved_at', 'resolved_reason', 'csat_score', 'csat_feedback', 'csat_tags', 'ticket_id'] };
    const related = ['chat_rating', 'chat_message_archive', 'customer', 'customer_profile', 'staff', 'pet_profile', 'sales_order', 'appointment', 'service', 'support_ticket', 'support_ticket_message', 'paw_point_transaction', 'document_embeddings'];
    const tables = [...new Set([...expected.keys(), ...related])];
    const probes = await Promise.allSettled(tables.map(async table => {
        const col = table === 'chatbot_sentiment_tier' ? 'level' : 'id';
        return { table, result: await get('/rest/v1/' + table + '?select=' + col + '&limit=0', service) };
    }));
    for (const r of probes) if (r.status !== 'fulfilled') throw new Error('Probe failed; values suppressed.');
    const permissionProbes = await Promise.allSettled([
        ['chat_message', 'id,raw_content'], ['chat_conversation', 'id,session_token,internal_note'], ['chatbot_system_prompt', 'id,content']
    ].map(async ([table, columns]) => ({ table, columns, result: await get('/rest/v1/' + table + '?select=' + columns + '&limit=0', anon) })));
    for (const r of permissionProbes) if (r.status !== 'fulfilled') throw new Error('Permission probe failed; values suppressed.');
    const columnProbes = await Promise.allSettled(additions.chat_conversation.map(async column => ({ column, result: await get('/rest/v1/chat_conversation?select=' + column + '&limit=0', service) })));
    for (const r of columnProbes) if (r.status !== 'fulfilled') throw new Error('Column probe failed; values suppressed.');
    const lines = [
        '# Đối chiếu Supabase cho chatbot Admin', '',
        'Ngày đối chiếu: 16/10/2026. Phạm vi: Trực chat — Trợ lý AI — Quy định trong Admin.',
        'Thời điểm chạy (UTC): ' + new Date().toISOString() + '.', '',
        'Nguồn: project được cấu hình bằng SUPABASE_URL trong môi trường cục bộ. Chưa xác nhận project này trùng production/preview đang triển khai. Không ghi URL, khóa, ID khách hoặc nội dung hội thoại.', '',
        '## Phương pháp và giới hạn', '',
        '- Chỉ GET OpenAPI metadata, GET danh sách cấu hình bucket và SELECT limit=0. Không đọc dòng nghiệp vụ, không INSERT/UPDATE/DELETE, không gọi RPC hoặc thay đổi Auth/Realtime/Storage.',
        '- Kiểu/cột/quan hệ bên dưới do PostgREST công bố tại thời điểm kiểm tra; schema không được công bố có thể tồn tại ngoài API.',
        '- HTTP 200 với limit=0 chứng minh truy vấn cột được chấp nhận, chưa chứng minh đọc được dòng nào hay vượt RLS. Đường/verb OpenAPI chưa phải bản xuất GRANT hoặc policy.',
        '- Chưa có kết nối PostgreSQL hoặc Supabase Management token trong danh mục cấu hình G0-01 để xuất catalog quyền/trigger/index/publication/migration history. Không tự tạo RPC đọc catalog.', '',
        '## Kết nối và loại khóa', '',
        '| Kiểm tra | Kết quả |', '|---|---|',
        '| OpenAPI service | HTTP ' + s.status + ' |',
        '| OpenAPI anon | HTTP ' + a.status + ' |',
        '| Claim/định dạng service (đọc cục bộ, chưa tự coi là xác minh chữ ký) | ' + clean(role(service)) + ' |',
        '| Claim/định dạng anon (đọc cục bộ) | ' + clean(role(anon)) + ' |',
        '| Đọc catalog pg_catalog qua REST | HTTP ' + catalog.status + '; ' + clean(catalog.code) + ' |',
        '| Danh sách bucket, chỉ lưu số lượng cấu hình | HTTP ' + storage.status + '; ' + (Array.isArray(storage.body) ? storage.body.length + ' bucket' : 'không xác định') + ' |', '',
        '## So sánh 13 bảng migration chính', '',
        '| Bảng | Cột SQL cục bộ | Cột metadata | Thiếu so với SQL | Thêm so với SQL |', '|---|---|---|---|---|'
    ];
    for (const [table, cols] of expected) {
        const actual = Object.keys(defs[table]?.properties || {});
        lines.push('| ' + table + ' | ' + cols.length + ' | ' + (defs[table] ? actual.length : 'không được công bố') + ' | ' + clean(cols.filter(c => !actual.includes(c)).join(', ') || 'không') + ' | ' + clean(actual.filter(c => !cols.includes(c)).join(', ') || 'không') + ' |');
    }
    lines.push('', '## Migration bổ sung', '', '| Bảng | Cột bổ sung | Có trong metadata | GET trực tiếp limit=0 |', '|---|---|---|---|');
    for (const r of columnProbes) { const {column, result} = r.value; lines.push('| chat_conversation | ' + column + ' | ' + (defs.chat_conversation?.properties?.[column] ? 'có' : 'chưa thấy') + ' | HTTP ' + result.status + '; ' + clean(result.code || 'OK') + ' |'); }
    lines.push('', '## Chênh lệch kiểu dữ liệu so với SQL chính', '', '| Bảng.cột | SQL cục bộ | Metadata |', '|---|---|---|');
    let typeDrift = 0;
    const typeMap = { UUID: 'uuid', VARCHAR: 'character varying', INT: 'integer', TEXT: 'text', BOOLEAN: 'boolean', TIMESTAMPTZ: 'timestamp with time zone', NUMERIC: 'numeric', JSONB: 'jsonb' };
    for (const m of sql.matchAll(/CREATE TABLE IF NOT EXISTS public\.(\w+)\s*\(([\s\S]*?)\n\);/g)) {
        for (const c of m[2].matchAll(/^\s{4}(\w+)\s+(UUID|VARCHAR|INT|TEXT|BOOLEAN|TIMESTAMPTZ|NUMERIC|JSONB)(\[\])?\b/gm)) {
            const expectedType = typeMap[c[2]] + (c[3] || (m[2].match(new RegExp('^\\s{4}' + c[1] + '\\s+TEXT\\[\\]', 'm')) ? '[]' : ''));
            const actualType = defs[m[1]]?.properties?.[c[1]]?.format;
            if (actualType && actualType !== expectedType) { typeDrift++; lines.push('| ' + m[1] + '.' + c[1] + ' | ' + expectedType + ' | ' + clean(actualType) + ' |'); }
        }
    }
    if (!typeDrift) lines.push('| — | Không thấy chênh lệch kiểu cơ bản | — |');
    lines.push('', 'Không đối chiếu độ dài VARCHAR, precision/scale, CHECK hoặc default vì metadata không bảo đảm công bố đầy đủ các ràng buộc này.');
    lines.push('', '## Bảng phụ thuộc và truy vấn không trả dòng', '', '| Bảng | Metadata service | GET limit=0 service |', '|---|---|---|');
    for (const r of probes) { const { table, result } = r.value; lines.push('| ' + table + ' | ' + (defs[table] ? 'có' : 'chưa thấy') + ' | HTTP ' + result.status + '; ' + clean(result.code || 'OK') + ' |'); }
    lines.push('', '## Kiểm tra cột nhạy cảm bằng anon, không đọc dòng', '', '| Bảng | Cột yêu cầu | Kết quả |', '|---|---|---|');
    for (const r of permissionProbes) { const p = r.value; lines.push('| ' + p.table + ' | ' + p.columns + ' | HTTP ' + p.result.status + '; ' + clean(p.result.code || 'truy vấn được chấp nhận; chưa kết luận quyền đọc dòng') + ' |'); }
    lines.push('', '## RPC liên quan được công bố', '');
    const rpcs = Object.keys(s.body.paths || {}).filter(p => p.startsWith('/rpc/') && /chat|match_documents|pawpal_is_staff|check_user_account_type/.test(p));
    lines.push(...(rpcs.length ? rpcs.map(p => '- `' + clean(p) + '` — chỉ thấy metadata, không gọi hàm.') : ['Chưa thấy RPC phù hợp trong metadata.']));
    lines.push('', '## Cột và kiểu được công bố cho các bảng chatbot', '');
    for (const table of [...expected.keys(), 'chat_rating', 'chat_message_archive']) {
        lines.push('### ' + table, '');
        if (!defs[table]) { lines.push('Không thấy trong metadata service.', ''); continue; }
        lines.push('| Cột | Kiểu/định dạng | Bắt buộc trong metadata | Enum hoặc quan hệ công bố |', '|---|---|---|---|');
        for (const [col, prop] of Object.entries(defs[table].properties || {})) {
            const desc = prop.description || '';
            const relations = [...desc.matchAll(/(?:Foreign Key to|Primary Key)[^\n]*/g)].map(m => m[0]);
            lines.push('| ' + clean(col) + ' | ' + clean(prop.format || prop.type) + ' | ' + ((defs[table].required || []).includes(col) ? 'có' : 'không') + ' | ' + clean(prop.enum ? prop.enum.join(', ') : relations.join('; ') || '—') + ' |');
        }
        lines.push('');
    }
    lines.push('## Việc chưa được xác minh', '',
        '- RLS có bật/force hay không; toàn bộ policy, GRANT theo role và quyền EXECUTE thực tế.',
        '- CHECK/enum đầy đủ nếu OpenAPI không công bố; trigger/view/index; migration nào đã áp dụng và theo thứ tự nào.',
        '- Publication supabase_realtime có bảng nào, thiết lập Realtime và quyền kênh theo phiên nhân viên.',
        '- Storage policy, quyền tải tệp và giới hạn upload. Có danh sách bucket không chứng minh quyền truy cập từng tệp.',
        '- Kết quả theo từng vai trò nhân viên/quản lý, vì chưa có phiên kiểm thử tương ứng. Không dùng service role thay bằng chứng quyền admin.', '',
        'Cần bản xuất catalog chỉ đọc hoặc kết nối quản trị metadata được cấp quyền để hoàn tất IN01–IN02. G0-01 chưa đủ điều kiện đánh dấu hoàn tất toàn bộ mục schema/quyền.', '');
    fs.writeFileSync(path.join(root, 'docs/chatbot/supabase-admin-comparison.md'), lines.join('\n'), 'utf8');
    console.log('Report written: docs/chatbot/supabase-admin-comparison.md');
    console.log('Core tables visible: ' + [...expected.keys()].filter(t => defs[t]).length + '/' + expected.size);
    console.log('Catalog HTTP: ' + catalog.status + '; storage HTTP: ' + storage.status);
    console.log('Supplemental columns: ' + additions.chat_conversation.filter(c => defs.chat_conversation?.properties?.[c]).join(', '));
}
main().catch(e => { console.error('Inspection failed; ' + (e.message.startsWith('Service metadata') ? e.message : 'details suppressed to protect configuration')); process.exitCode = 1; });
