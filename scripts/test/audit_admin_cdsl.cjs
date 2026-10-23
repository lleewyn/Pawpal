// Read-only static audit. Does not connect to Supabase or mutate application data.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const schema = new Map();
let table;
for (const line of fs.readFileSync(path.join(root, 'docs/archive/database/CDSLfinal.md'), 'utf8').split(/\r?\n/)) {
  const p = line.split('\t').map(x => x.trim());
  if (/^\d+$/.test(p[0])) { table = p[1]; schema.set(table, new Set()); }
  if (table && p[3]) schema.get(table).add(p[3]);
}
function files(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? files(path.join(dir,e.name)) : /\.(?:js|cjs|mjs)$/.test(e.name) ? [path.join(dir,e.name)] : []);
}
// Tokens preserve offsets; template strings are opaque, interpolations require manual review.
function tokens(s) {
  const out=[]; const re=/\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|[^\s]/g;
  for(const m of s.matchAll(re)) {
    const v=m[0]; if(/^\s|^\/\/|^\/\*/.test(v))continue;
    out.push({v,i:m.index, str:/^['"`]/.test(v), text:/^['"`]/.test(v)?v.slice(1,-1):v});
  } return out;
}
function end(t,i) { const stack=[]; const pair={'(':')','[':']','{':'}'}; for(let j=i;j<t.length;j++){if(t[j].str)continue;const v=t[j].v;if(pair[v])stack.push(pair[v]);else if(v===stack.at(-1)){stack.pop();if(!stack.length)return j;}} return i; }
const issues=[], queries=[], manual=[];
const scanFiles=[...files(path.join(root,'pages/admin')), ...files(path.join(root,'scripts/api')), ...files(path.join(root,'scripts/shared'))];
function add(f,s,pos,t,c,op){issues.push({file:f,line:s.slice(0,pos).split('\n').length,table:t,column:c,op});}
function checkSelect(f,s,pos,tab,sel){
  if(sel.includes('${')) {manual.push({file:f,line:s.slice(0,pos).split('\n').length,why:'select có nội suy'});return;}
  const parts=[];let depth=0,start=0;
  for(let i=0;i<=sel.length;i++){if(sel[i]==='(')depth++;if(sel[i]===')')depth--;if(i===sel.length||(sel[i]===','&&!depth)){parts.push(sel.slice(start,i).trim());start=i+1;}}
  for(const p of parts){if(!p||p==='*')continue;const open=p.indexOf('(');if(open>=0){const rel=p.slice(0,open).split(':').at(-1).split('!')[0].trim();if(schema.has(rel))checkSelect(f,s,pos,rel,p.slice(open+1,p.lastIndexOf(')')));else manual.push({file:f,line:s.slice(0,pos).split('\n').length,why:`quan hệ ${tab} → ${rel}: cần FK live`});}
    else {const col=p.split(':').at(-1).split('::')[0].trim();if(/^[a-z_]\w*$/.test(col)&&schema.has(tab)&&!schema.get(tab).has(col))add(f,s,pos,tab,col,'select');}
  }
}
for(const abs of scanFiles){const f=path.relative(root,abs).replaceAll('\\','/'),s=fs.readFileSync(abs,'utf8');
 for(const anchor of s.matchAll(/\.from\(\s*(['"])[a-z_]\w*\1\s*\)/g)){
  const t=tokens(s.slice(anchor.index,anchor.index+20000)).map(x=>({...x,i:x.i+anchor.index})); const i=0;
  if(t[i].v!=='.'||t[i+1].v!=='from'||t[i+2].v!=='('||!t[i+3].str||t[i+4].v!==')')continue;
  const tab=t[i+3].text;if(!/^[a-z_]\w*$/.test(tab))continue;
  const q={file:f,line:s.slice(0,t[i].i).split('\n').length,table:tab,ops:[]};queries.push(q);
  if(!schema.has(tab))add(f,s,t[i].i,tab,'—','bảng ngoài thiết kế');
  let j=i+5;
  while(t[j]?.v==='.'&&t[j+2]?.v==='('){const op=t[j+1].v,a=j+3,b=end(t,j+2);q.ops.push(op);
   if(op==='select'&&t[a]?.str)checkSelect(f,s,t[a].i,tab,t[a].text);
   if(['eq','neq','gt','gte','lt','lte','in','is','order','like','ilike','match','contains'].includes(op)&&t[a]?.str){const c=t[a].text;if(schema.has(tab)&&/^[a-z_]\w*$/.test(c)&&!schema.get(tab).has(c))add(f,s,t[a].i,tab,c,op);}
   if(['insert','update','upsert'].includes(op)){
    let k=a;if(t[k]?.v==='[')k++;
    if(t[k]?.v==='{'){const z=end(t,k);let n=k+1;while(n<z){if(t[n]?.v==='.'&&t[n+1]?.v==='.'&&t[n+2]?.v==='.'){manual.push({file:f,line:s.slice(0,t[n].i).split('\n').length,why:`${tab}.${op}: spread payload`});}
      if((!t[n].str&&/^[a-z_]\w*$/.test(t[n].v)||t[n].str)&&t[n+1]?.v===':'){const c=t[n].text;if(schema.has(tab)&&!schema.get(tab).has(c))add(f,s,t[n].i,tab,c,op);}
      while(n<z&&t[n].v!==','){if(!t[n].str&&['(','[','{'].includes(t[n].v))n=end(t,n);n++;}n++;
    }}else manual.push({file:f,line:s.slice(0,t[a]?.i||0).split('\n').length,why:`${tab}.${op}: payload biến/hàm, cần lần ngược`});
   }
   j=b+1;
  }
 }
}
const clean=x=>String(x).replaceAll('|','/');
const lines=['# Kiểm kê truy vấn tĩnh Admin và lớp dùng chung','',`Nguồn: CDSLfinal.md (${schema.size} thực thể). Chỉ đọc mã nguồn; không xác minh live.`, '', 'Cách chạy: `node scripts/test/audit_admin_cdsl.cjs`. Bộ quét nhận diện chain literal, select lồng theo tên bảng và khóa payload literal. Không phân tích đầy đủ AST, payload động, alias quan hệ theo FK, SQL/RPC hoặc thuộc tính response; mọi kết quả phải đọc lại ngữ cảnh. Template nội suy và quan hệ chưa rõ được đưa vào danh sách thủ công. File API/shared có thể chỉ chạy phía khách, cần xác minh đường gọi trước khi quy thành lỗi Admin.', '', '## Tổng hợp theo phân hệ', '', '| Phạm vi | Số chain from literal | Sai lệch ứng viên |', '|---|---:|---:|'];
const group=f=>f.startsWith('pages/admin/modules/')?f.split('/')[3]:f.startsWith('pages/admin/')?'Admin nền':f.split('/').slice(0,2).join('/');
for(const g of [...new Set(queries.map(q=>group(q.file)))].sort())lines.push(`| ${g} | ${queries.filter(q=>group(q.file)===g).length} | ${issues.filter(q=>group(q.file)===g).length} |`);
lines.push('','## Sai lệch ứng viên so với danh mục thiết kế','','| File:dòng | Bảng | Cột | Thao tác |','|---|---|---|---|');
for(const x of issues)lines.push(`| ${x.file}:${x.line} | ${x.table} | ${x.column} | ${x.op} |`);
lines.push('','## Truy vấn đã kiểm kê','','| File:dòng | Bảng | Các thao tác trong chain |','|---|---|---|');
for(const q of queries)lines.push(`| ${q.file}:${q.line} | ${q.table} | ${q.ops.join(', ')} |`);
lines.push('','## Điểm cần lần ngược thủ công','','| File:dòng | Lý do |','|---|---|');
for(const q of manual)lines.push(`| ${q.file}:${q.line} | ${clean(q.why)} |`);
fs.writeFileSync(path.join(root,'docs/testing/generated/PAWPAL_KIEM_KE_TRUY_VAN_CDSL.md'),lines.join('\n')+'\n');
console.log(`${scanFiles.length} files; ${schema.size} tables/views; ${queries.length} literal chains; ${issues.length} candidates; ${manual.length} manual points.`);
for(const x of issues)console.log(`${x.file}:${x.line} ${x.table}.${x.column} [${x.op}]`);
