// GET OpenAPI metadata only; no application rows, RPCs or database writes.
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ quiet: true });
const root = path.resolve(__dirname, '../..');
const expected = new Map(); let current;
for(const line of fs.readFileSync(path.join(root,'CDSLfinal.md'),'utf8').split(/\r?\n/)) {
 const p=line.split('\t').map(x=>x.trim());
 if(/^\d+$/.test(p[0])) {current=p[1];expected.set(current,[]);}
 if(current&&p[3])expected.get(current).push(p[3]);
}
async function main(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_ANON_KEY;
 if(!url||!key)throw new Error('Missing metadata configuration; values suppressed.');
 const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/',{headers:{apikey:key,Authorization:'Bearer '+key,Accept:'application/openapi+json'},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error('Metadata HTTP '+r.status);
 const body=await r.json(); if(!body.definitions)throw new Error('No OpenAPI definitions returned.');
 const defs=body.definitions;
 const lines=['# Đối chiếu metadata Supabase với CDSLfinal.md','',`Thời điểm GET metadata (UTC): ${new Date().toISOString()}.`, '', 'Chỉ GET OpenAPI bằng cấu hình SUPABASE_URL trong môi trường cục bộ. Chưa xác nhận trùng project browser/production. Không đọc bản ghi nghiệp vụ; không gọi RPC; không ghi DB. Không lưu URL/khóa. Metadata không thay thế catalog RLS, trigger, index, FK đầy đủ hoặc kiểm thử CRUD.', '', '| Bảng/view | Cột thiết kế | Cột metadata | Thiếu so với thiết kế | Ngoài thiết kế |','|---|---:|---:|---|---|'];
 let missing=0,drift=0;
 for(const [table,cols]of expected){const live=Object.keys(defs[table]?.properties||{}),a=cols.filter(c=>!live.includes(c)),b=live.filter(c=>!cols.includes(c));if(!defs[table])missing++;if(a.length||b.length)drift++;lines.push(`| ${table} | ${cols.length} | ${defs[table]?live.length:'Không công bố'} | ${a.join(', ')||'—'} | ${b.join(', ')||'—'} |`);}
 lines.push('','## Đối tượng metadata ngoài danh mục thiết kế','',...Object.keys(defs).filter(t=>!expected.has(t)).map(t=>'- `'+t+'`: '+Object.keys(defs[t].properties||{}).join(', ')));
 const probes=[['product','id,inventory(quantity_in_stock)'],['product','id,product_variant(id,inventory(quantity_in_stock))'],['staff','user_id'],['notification','user_id,type,status,channel,phone'],['notification','recipient_id,recipient_type,status,created_at'],['customer_membership','tier_code'],['customer_membership','tier_name'],['appointment','notes,estimated_duration'],['appointment','hold_expires_at'],['chat_conversation','resolved_at,resolved_reason'],['support_ticket_message','message'],['chatbot_profanity_filter','replacement'],['audit_log','user_id,entity,old_data,new_data'],['customer_activation_sms','id'],['staff_assessment','id'],['admin_copilot_history','id']];
 probes.push(['service','id','service_category=eq.GROOMING_SPA'],['service','id','status=eq.ACTIVE'],['review','id','review_type=eq.SERVICE'],['sales_order','id','order_status=eq.PACKING'],['customer','id','account_status=eq.ACTIVE'],['customer_profile','id','gender=eq.OTHER'],['appointment','id','appointment_status=in.(da_xac_nhan,CONFIRMED)']);
 const results=await Promise.allSettled(probes.map(async([table,select,filter])=>{
  const p=await fetch(url.replace(/\/$/,'')+'/rest/v1/'+table+'?select='+encodeURIComponent(select)+'&limit=0'+(filter?'&'+filter:''),{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(15000)});
  const data=await p.json().catch(()=>null);return {table,select:select+(filter?' / '+filter:''),status:p.status,code:p.ok?'OK':/^[A-Z0-9]+$/.test(data?.code||'')?data.code:'Unknown'};
 }));
 lines.push('','## Xác minh truy vấn trực tiếp không đọc dòng dữ liệu','','GET select + limit=0 bằng cùng credential metadata; không chứng minh quyền phiên Admin hoặc CRUD.','','| Bảng | Select | HTTP | Mã |','|---|---|---:|---|');
 for(let i=0;i<results.length;i++){const r=results[i];if(r.status==='fulfilled'){const p=r.value;lines.push(`| ${p.table} | ${p.select} | ${p.status} | ${p.code} |`);console.log(`${p.table}: HTTP ${p.status} ${p.code}`);}else lines.push(`| ${probes[i][0]} | ${probes[i][1]} | — | Request failed |`);}
 lines.push('','## Enum/trạng thái do OpenAPI công bố','','| Bảng.cột | Format | Enum |','|---|---|---|');
 for(const [t,d] of Object.entries(defs))for(const [c,p]of Object.entries(d.properties||{}))if(p.enum)lines.push(`| ${t}.${c} | ${p.format||p.type||'—'} | ${p.enum.join(', ')} |`);
 lines.push('','## RPC xuất hiện dưới dạng tên literal trong code','','Chỉ so với các đường OpenAPI; không gọi RPC. Chưa công bố không chứng minh function không tồn tại.','','| RPC | Có đường trong metadata |','|---|---|');
 const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):/\.(js|mjs|cjs)$/.test(e.name)?[path.join(dir,e.name)]:[]);
 const rpc=new Set();for(const f of [...walk(path.join(root,'pages/admin')),...walk(path.join(root,'scripts/api')),...walk(path.join(root,'scripts/shared'))])for(const m of fs.readFileSync(f,'utf8').matchAll(/\.rpc\(\s*['"](\w+)['"]/g))rpc.add(m[1]);
 for(const name of [...rpc].sort())lines.push(`| ${name} | ${body.paths?.['/rpc/'+name]?'Có':'Không thấy'} |`);
 lines.push('', '## Giới hạn kết luận', '', '- “Không công bố” chưa chứng minh không tồn tại trong PostgreSQL.', '- Cột có mặt chưa chứng minh nullable/default/enum/FK/policy đúng nghiệp vụ.', '- Đối tượng ngoài thiết kế cần phân loại kỹ thuật hoặc yêu cầu mở rộng; không tự xóa.');
 fs.writeFileSync(path.join(root,'pages/admin/PAWPAL_DOI_CHIEU_METADATA_LIVE_CDSL.md'),lines.join('\n')+'\n');
 console.log(`HTTP ${r.status}; ${expected.size} expected; ${Object.keys(defs).length} definitions; ${missing} not exposed; ${drift} tables with column differences.`);
 // Only names of mismatches, no business data or credentials.
 for(const [t,cols]of expected){const live=Object.keys(defs[t]?.properties||{}),a=cols.filter(c=>!live.includes(c));if(a.length)console.log(t+': missing '+a.join(', '));}
}
main().catch(e=>{console.error('Read-only metadata audit failed: '+(e.cause?.code||e.name)+'; '+(e.message.startsWith('Metadata HTTP')?e.message:'details suppressed'));process.exitCode=1;});
