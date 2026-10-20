// Generates documentation only. Does not execute migration SQL or change application behavior.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const dictionary=fs.readFileSync(path.join(root,'pages/admin/PAWPAL_GD1_TU_DIEN_DU_LIEU.md'),'utf8');
const sql=fs.readFileSync(path.join(root,'scripts/database/20261019_migrate_enums_to_vietnamese.sql'),'utf8');
const enums=new Map();let table;
for(const line of dictionary.split('\n')){
 if(line.startsWith('### '))table=line.slice(4).trim();
 if(!line.startsWith('| ')||!table)continue;
 const p=line.split('|').map(s=>s.trim());
 if(p[3]?.startsWith('public.')&&p[6]&&p[6]!=='Không công bố'){
  const key=p[3].slice(7);if(!enums.has(key))enums.set(key,{fields:[],values:p[6].split(', ')});
  const e=enums.get(key);if(e.values.join(', ')!==p[6])throw new Error('Conflicting enum dictionary: '+key);e.fields.push(table+'.'+p[1]);
 }
}
const mappings=new Map();
for(const m of sql.matchAll(/WHEN\s+'([^']+)'\s+THEN\s+'([^']+)'::public\.(\w+)_new/g)){
 const key=m[3];if(!mappings.has(key))mappings.set(key,new Map());mappings.get(key).set(m[1],m[2]);
}
const lines=['# Giai đoạn 1 — Hợp đồng enum và ánh xạ tương thích','',
 'Nguồn chuẩn: enum do OpenAPI công bố trong PAWPAL_GD1_TU_DIEN_DU_LIEU.md. Nguồn tham khảo alias cũ: scripts/database/20261019_migrate_enums_to_vietnamese.sql. Chỉ sinh tài liệu; không chạy SQL hoặc sửa code.', '',
 '## Quy tắc áp dụng','',
 '- Payload/filter gửi Supabase chỉ dùng giá trị chuẩn có trong enum tương ứng của đúng bảng/cột.',
 '- Alias cũ chỉ được chuẩn hóa trước khi tạo request hoặc khi đọc dữ liệu legacy đã xác nhận; không trộn alias sai trong .in() trên cột enum.',
 '- Không dùng ELSE mặc định của migration để biến giá trị không hiểu thành trạng thái hợp lệ. Giá trị chưa biết phải báo lỗi/cần đối chiếu.',
 '- Không dùng một map chung cho mọi status, gender hoặc role. service.status khác product.status; staff.role khác staff.system_role.',
 '- Cột text/JSONB không tự có enum. CHECK, các alias UI không nằm trong migration và ý nghĩa nghiệp vụ cần được xác minh riêng.',
 '- Tài liệu không phê duyệt chạy lại migration DROP TYPE/DROP VIEW CASCADE.', '',
 `Số kiểu enum công bố: ${enums.size}.`, '',
 '| Enum | Bảng.cột áp dụng | Giá trị chuẩn | Alias cũ → chuẩn (từ SQL cục bộ) |', '|---|---|---|---|'];
let aliases=0,bad=0;
for(const [name,e]of enums){
 const parts=[];for(const [old,value]of mappings.get(name)||[]){aliases++;const valid=e.values.includes(value);if(!valid)bad++;parts.push(old+' → '+value+(valid?'':' **KHÔNG KHỚP METADATA**'));}
 lines.push(`| ${name} | ${e.fields.join('; ')} | ${e.values.join(', ')} | ${parts.join('; ')||'Chưa có alias từ migration; không suy đoán'} |`);
}
lines.push('',`Đã đối chiếu ${aliases} alias từ migration với enum metadata; số đích không khớp: ${bad}.`, '',
 'Các giá trị như PAID/ACTIVE chỉ có nghĩa khi biết bảng/cột. UI hiển thị tiếng Việt tự nhiên; không gửi nguyên nhãn hiển thị hoặc dùng uppercase() như một cách đổi enum.');
fs.writeFileSync(path.join(root,'pages/admin/PAWPAL_GD1_HOP_DONG_ENUM.md'),lines.join('\n')+'\n');
console.log(`${enums.size} enum types; ${aliases} source aliases; ${bad} alias targets inconsistent with metadata.`);
if(bad)process.exitCode=1;
