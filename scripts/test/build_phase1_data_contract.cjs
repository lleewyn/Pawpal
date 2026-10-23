// Phase 1: GET OpenAPI metadata; generate a Markdown dictionary, never application data.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config({ quiet: true });
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'docs/archive/database/CDSLfinal.md'), 'utf8');
const design = new Map(); let current;
for (const line of source.split(/\r?\n/)) {
  const p = line.split('\t').map(x => x.trim());
  if (/^\d+$/.test(p[0])) { current = p[1]; design.set(current, new Map()); }
  if (current && p[3]) design.get(current).set(p[3], p[4] || 'Chưa mô tả trong thiết kế');
}
const clean = v => String(v ?? 'Không công bố').replace(/[|\r\n]/g, ' ').replace(/`/g, '');
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
function ownership(column) {
  if (/password|token|key_value|embedding/.test(column)) return 'Server/Auth; không nhập hoặc trả nguyên văn tùy tiện';
  if (/^(id|created_at|updated_at)$/.test(column)) return 'Hệ thống/DB; kiểm tra default và trigger';
  if (/_id$/.test(column)) return 'Quan hệ; chọn thực thể và xác minh FK';
  if (/^(subtotal|total_amount|min_price|rating|review_count|balance_after|quantity_reserved)$/.test(column)) return 'Dữ liệu tính toán/tổng hợp; cần quy tắc nghiệp vụ';
  return 'Theo màn hình và quyền; xem ma trận UI, không tự coi là ô nhập';
}
async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Configuration missing');
  const response = await fetch(url.replace(/\/$/, '') + '/rest/v1/', {
    headers: { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/openapi+json' },
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error('Metadata HTTP ' + response.status);
  const metadata = await response.json();
  if (!metadata.definitions) throw new Error('No definitions');
  const defs = metadata.definitions;
  const frontend = fs.readFileSync(path.join(root, 'scripts/api/supabase-client.js'), 'utf8');
  const fallback = frontend.match(/const FALLBACK_URL\s*=\s*'([^']+)'/)?.[1];
  const matches = fallback && new URL(fallback).origin === new URL(url).origin;
  const lines = ['# Từ điển dữ liệu giai đoạn 1 — thiết kế và metadata', '',
    'Thời điểm GET metadata (UTC): ' + new Date().toISOString() + '.',
    'SHA-256 CDSLfinal.md: `' + hash(source) + '`.',
    'SHA-256 definitions OpenAPI: `' + hash(JSON.stringify(defs)) + '`.', '',
    '## Phạm vi và mức độ xác nhận', '',
    '- Frontend FALLBACK_URL trùng origin SUPABASE_URL backend: **' + (matches ? 'Có' : 'Không') + '**; không lưu URL hoặc khóa.',
    '- Frontend ưu tiên cấu hình window, sau đó localStorage, cuối cùng fallback. Chưa quan sát phiên browser của người dùng nên chưa xác nhận override runtime.',
    '- Chỉ GET OpenAPI; không đọc dữ liệu nghiệp vụ, không gọi RPC hoặc ghi database.',
    '- Cột “Required” là khai báo OpenAPI, không thay thế bản xuất pg_attribute.attnotnull. Không xuất hiện trong required không đủ để kết luận cột cho phép NULL.',
    '- Default và mô tả quan hệ bên dưới là metadata công bố. Unique, CHECK, ON DELETE/UPDATE, precision đầy đủ, trigger và RLS cần catalog PostgreSQL.',
    '- Cột “Quyền quản lý đề xuất” là phân loại để thiết kế hợp đồng, chưa khẳng định code hoặc DB hiện thực thi được.', '',
    '| Kiểm kê | Số lượng |', '|---|---:|',
    '| Thực thể thiết kế | ' + design.size + ' |',
    '| Definitions metadata | ' + Object.keys(defs).length + ' |',
    '| Thuộc tính thiết kế | ' + [...design.values()].reduce((n,c)=>n+c.size,0) + ' |', '',
    '## Quan hệ do PostgREST mô tả', '',
    '| Bảng.cột | Bằng chứng mô tả khóa/quan hệ |', '|---|---|'];
  let relationNotes = 0;
  for (const [t,d] of Object.entries(defs)) for (const [c,p] of Object.entries(d.properties || {})) {
    if (/foreign key|primary key|<fk|<pk/i.test(p.description || '')) {
      relationNotes++; lines.push(`| ${t}.${c} | ${clean(p.description)} |`);
    }
  }
  if (!relationNotes) lines.push('| — | Metadata không mô tả FK/PK; không suy đoán từ hậu tố _id |');
  lines.push('', '## Toàn bộ thuộc tính thiết kế và kiểu công bố');
  let count = 0;
  for (const [t,cols] of design) {
    const d = defs[t] || {}, props = d.properties || {}, required = new Set(d.required || []);
    lines.push('', '### ' + t, '', '| Cột | Ý nghĩa trong thiết kế | Kiểu metadata | Required OpenAPI | Default metadata | Enum | Quyền quản lý đề xuất |', '|---|---|---|---|---|---|---|');
    for (const [c,meaning] of cols) {
      count++; const p = props[c];
      const type = p ? (p.format || p.type || 'Không công bố') + (p.items ? ' / items: ' + (p.items.format || p.items.type || 'unknown') : '') : 'Không thấy cột';
      const defaultValue = /password|token|key_value/.test(c) ? 'Không xuất giá trị nhạy cảm' : p && Object.hasOwn(p,'default') ? JSON.stringify(p.default) : 'Không công bố';
      lines.push(`| ${c} | ${clean(meaning)} | ${clean(type)} | ${required.has(c)?'Có':'Không được liệt kê'} | ${clean(defaultValue)} | ${clean(p?.enum?.join(', '))} | ${ownership(c)} |`);
    }
    for (const c of Object.keys(props).filter(c=>!cols.has(c))) lines.push(`| ${c} | **Ngoài thiết kế — cần quyết định** | ${clean(props[c].format || props[c].type)} | ${required.has(c)?'Có':'Không được liệt kê'} | ${clean(props[c].default)} | ${clean(props[c].enum?.join(', '))} | Chưa đưa vào hợp đồng chuẩn |`);
  }
  lines.push('', '## RPC do OpenAPI công bố', '', '| RPC | Verb | Tham số/kiểu do OpenAPI công bố |', '|---|---|---|');
  for (const [route,verbs] of Object.entries(metadata.paths || {})) {
    if (!route.startsWith('/rpc/')) continue;
    for (const verb of ['get','post']) {
      const op = verbs[verb]; if (!op) continue;
      const params = (op.parameters || []).map(p => p.name + ':' + (p.type || p.schema?.type || p.schema?.$ref || 'schema')).join(', ');
      lines.push(`| ${route.slice(5)} | ${verb.toUpperCase()} | ${clean(params)} |`);
    }
  }
  lines.push('', 'Chỉ kiểm kê chữ ký metadata; chưa gọi hoặc kiểm tra thân hàm, chính sách nâng quyền và transaction.');
  fs.writeFileSync(path.join(root,'docs/testing/generated/PAWPAL_GD1_TU_DIEN_DU_LIEU.md'), lines.join('\n')+'\n');
  console.log(`Metadata HTTP ${response.status}; ${design.size} design entities; ${count} design attributes; frontend fallback/backend origin match=${Boolean(matches)}; ${relationNotes} key/relationship descriptions.`);
}
main().catch(e => { console.error('Phase 1 metadata unavailable: ' + (e.cause?.code || e.name) + '; ' + (e.message.startsWith('Metadata HTTP') ? e.message : 'details suppressed')); process.exitCode=1; });
