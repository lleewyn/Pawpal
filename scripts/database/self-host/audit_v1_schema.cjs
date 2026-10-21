// Read-only schema inventory. Does not read rows, secrets, or contact Cloud.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
function run(command, args) {
    const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || `${command} failed`);
    return result.stdout;
}
const design = new Map();
let current;
for (const line of fs.readFileSync(path.join(root, 'PAWPAL_THIET_KE_DATABASE_3NF_V1.md'), 'utf8').split(/\r?\n/)) {
    const cells = line.split('|').map(s => s.trim());
    if (cells.length !== 7) continue;
    if (/^\d+$/.test(cells[1])) {
        const name = cells[2].match(/^`([a-z_]+)`$/)?.[1];
        if (!name) throw new Error(`Invalid entity at row ${cells[1]}`);
        if (design.has(name)) throw new Error(`Duplicate entity: ${name}`);
        current = { name, columns: [], description: cells[3] };
        design.set(name, current);
    }
    if (!current || (!/^\d+$/.test(cells[1]) && cells[1] !== '')) continue;
    const col = cells[4].match(/^`([a-z_]+)`/)?.[1];
    if (col) {
        if (current.columns.includes(col)) throw new Error(`Duplicate attribute: ${current.name}.${col}`);
        current.columns.push(col);
    }
}
if (design.size === 0 || [...design.values()].some(t => t.columns.length === 0)) throw new Error('Empty or invalid V1 dictionary');
const sql = `SELECT json_build_object(
 'tables',(SELECT json_agg(x ORDER BY x.name) FROM (
   SELECT c.relname AS name, c.relrowsecurity AS rls,
     (SELECT json_agg(json_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull) ORDER BY a.attnum)
      FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) AS columns,
     (SELECT json_agg(json_build_object('name',con.conname,'type',con.contype,'definition',pg_get_constraintdef(con.oid)) ORDER BY con.conname)
      FROM pg_constraint con WHERE con.conrelid=c.oid) AS constraints,
     (SELECT json_agg(json_build_object('name',i.indexname,'definition',i.indexdef) ORDER BY i.indexname)
      FROM pg_indexes i WHERE i.schemaname='public' AND i.tablename=c.relname) AS indexes,
     (SELECT json_agg(json_build_object('name',p.policyname,'command',p.cmd,'roles',p.roles,'using',p.qual,'check',p.with_check) ORDER BY p.policyname)
      FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname) AS policies,
     EXISTS(SELECT 1 FROM pg_publication_tables p WHERE p.pubname='supabase_realtime' AND p.schemaname='public' AND p.tablename=c.relname) AS realtime
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p')
 ) x),
 'views',(SELECT json_agg(table_name ORDER BY table_name) FROM information_schema.views WHERE table_schema='public'),
 'functions',(SELECT json_agg(p.proname ORDER BY p.proname) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'),
 'triggers',(SELECT json_agg(json_build_object('table',c.relname,'name',t.tgname,'definition',pg_get_triggerdef(t.oid)) ORDER BY c.relname,t.tgname)
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal)
);`;
const live = JSON.parse(run('docker', ['exec', 'supabase-db', 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql]));
const tables = live.tables || [];
const names = new Set(tables.map(t => t.name));
const shared = tables.filter(t => design.has(t.name));
const extra = tables.filter(t => !design.has(t.name));
const missing = [...design.values()].filter(t => !names.has(t.name));
const list = values => values.length ? values.map(v => '`' + v + '`').join(', ') : '—';
const escape = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const attrCount = [...design.values()].reduce((n,t) => n+t.columns.length, 0);
const lines = [
 '# Kiểm kê schema self-host so với từ điển V1', '',
 `Thời điểm đọc metadata: ${new Date().toISOString()}. Nguồn: container local \`supabase-db\`, database \`postgres\`, schema \`public\`.`, '',
 'Tạo lại bằng `node scripts/database/self-host/audit_v1_schema.cjs`. Công cụ chỉ đọc catalog PostgreSQL và mã nguồn; không lấy dữ liệu nghiệp vụ, không đọc secret và không sửa database.', '',
 'Đối chiếu tên bảng/cột không phải chứng nhận 3NF. Cột ngoài từ điển cần phân tích nghiệp vụ trước khi bỏ; trường có cùng tên vẫn có thể sai kiểu, khóa hoặc ý nghĩa. Các bảng Auth/Storage do Supabase quản lý không thuộc số bảng ứng dụng.', '',
 '| Nội dung | Số lượng |', '|---|---:|',
 `| Thực thể V1 | ${design.size} |`, `| Thuộc tính V1 | ${attrCount} |`,
 `| Bảng public đang chạy | ${tables.length} |`, `| Bảng trùng tên V1 | ${shared.length} |`,
 `| Bảng đang chạy ngoài V1 | ${extra.length} |`, `| Bảng V1 chưa có | ${missing.length} |`, '',
 '## 1. Đối chiếu từng bảng đang chạy', '',
 '| Bảng | Cột hiện có | Cột V1 chưa có | Cột hiện có ngoài từ điển | RLS | Realtime |', '|---|---|---|---|---|---|'
];
for (const table of tables) {
    const expected = design.get(table.name)?.columns || [];
    const actual = table.columns.map(c => c.name);
    lines.push(`| \`${table.name}\` | ${list(actual)} | ${design.has(table.name) ? list(expected.filter(c => !actual.includes(c))) : 'Không có bảng này trong V1'} | ${list(actual.filter(c => !expected.includes(c)))} | ${table.rls ? 'Bật' : 'Tắt'} | ${table.realtime ? 'Có' : 'Không'} |`);
}
lines.push('', '## 2. Danh mục đầy đủ các bảng V1 chưa có', '', '| Bảng | Mô tả V1 |', '|---|---|');
for (const t of missing) lines.push(`| \`${t.name}\` | ${escape(t.description)} |`);
lines.push('', '## 3. Mã ứng dụng tham chiếu tên bảng hiện có', '',
    'Tìm theo nguyên từ trong pages, components, assets, scripts/api, api và server.js (JS, CJS, TS, HTML). Bao gồm truy vấn, khai báo Realtime và chuỗi ánh xạ; không khẳng định mọi kết quả là lời gọi SQL. Không tính script kiểm thử hoặc migration. Cần rà soát luồng gọi trước khi sửa.', '');
const searchRoots = ['pages','components','assets','scripts/api','api','server.js'].filter(p => fs.existsSync(path.join(root,p)));
for (const t of tables) {
    const found = spawnSync('rg', ['-l','-w','-F',t.name, ...searchRoots, '-g','*.js','-g','*.cjs','-g','*.ts','-g','*.html'], {cwd:root,encoding:'utf8'});
    if (found.error || found.status > 1) throw new Error(found.error?.message || found.stderr);
    const files = found.stdout.trim().split(/\r?\n/).filter(Boolean).map(p => p.replaceAll('\\','/'));
    lines.push(`### ${t.name}`, '', files.length ? files.map(p => `- [${p}](../../../${p})`).join('\n') : 'Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.', '');
}
lines.push('## 4. Kiểu cột, khóa, chỉ mục và chính sách thực tế', '', 'Đây là metadata để rà soát; chưa diễn giải mọi ràng buộc thành yêu cầu V1.', '');
for (const t of tables) {
    lines.push(`### ${t.name}`, '', '| Cột | Kiểu PostgreSQL | NOT NULL |', '|---|---|---|');
    for (const c of t.columns) lines.push(`| \`${c.name}\` | ${c.type} | ${c.not_null ? 'Có' : 'Không'} |`);
    lines.push('', 'Khóa và CHECK:', '', ...(t.constraints || []).map(c => `- \`${c.name}\`: \`${escape(c.definition)}\``), '', 'Chỉ mục (gồm partial unique index nếu có):', '', ...(t.indexes || []).map(i => `- \`${escape(i.definition)}\``), '', 'Chính sách RLS:', '');
    for (const p of t.policies || []) lines.push(`- \`${p.name}\`: ${p.command}, roles=${p.roles.join(', ')}; USING \`${escape(p.using || '—')}\`; WITH CHECK \`${escape(p.check || '—')}\`.`);
    lines.push('');
}
lines.push('## 5. View, hàm và trigger public', '', `View: ${list(live.views || [])}.`, '', `Hàm: ${list(live.functions || [])}.`, '');
for (const t of live.triggers || []) lines.push(`- \`${t.table}.${t.name}\`: \`${escape(t.definition)}\``);
lines.push('');
fs.writeFileSync(path.join(__dirname,'schema-audit.generated.md'), lines.join('\n'), 'utf8');
console.log(`V1=${design.size} tables/${attrCount} attributes; live=${tables.length}; shared=${shared.length}; extra=${extra.length}; missing=${missing.length}`);
console.log(`Outside V1: ${extra.map(t => t.name).join(', ')}`);
console.log('Report: scripts/database/self-host/schema-audit.generated.md');
