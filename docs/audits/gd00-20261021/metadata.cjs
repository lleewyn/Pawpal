// GET OpenAPI only; never read business rows or invoke RPC/write endpoints.
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ quiet: true });
async function main() {
 const role = process.argv.includes('--service-role') ? 'service role' : 'anon';
 const url=process.env.SUPABASE_URL, key=role === 'service role' ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.SUPABASE_ANON_KEY;
 if(!url || !key) throw new Error('CONFIG_MISSING');
 const response=await fetch(url.replace(/\/$/,'')+'/rest/v1/', { headers:{apikey:key,Authorization:'Bearer '+key,Accept:'application/openapi+json'}, signal:AbortSignal.timeout(20000) });
 if(!response.ok) throw new Error('HTTP_'+response.status);
 const metadata=await response.json();
 if(!metadata.definitions) throw new Error('NO_DEFINITIONS');
 const tables=['customer','customer_profile','customer_address','customer_membership','pet_profile','service','appointment','sales_order','sales_order_detail','payment','support_ticket','staff','staff_schedule'];
 const lines=['# Metadata Supabase GĐ-00 — 21/10/2026','',`GET OpenAPI: ${new Date().toISOString()} (UTC); HTTP ${response.status}.`, `Credential role: ${role}; không lưu URL/khóa.`, '', 'Chỉ GET /rest/v1/; không đọc dòng nghiệp vụ, không gọi RPC, không ghi DB. Metadata không xác nhận RLS/index/trigger/constraint hoặc quyền phiên browser.', '', '| Bảng | Cột | Kiểu/format | Required (OpenAPI) | Enum |','|---|---|---|---|---|'];
 for(const t of tables){
  const d=metadata.definitions[t];
  if(!d){lines.push(`| ${t} | Không được công bố | — | — | — |`);continue;}
  for(const [c,p]of Object.entries(d.properties||{}))lines.push(`| ${t} | ${c} | ${p.format||p.type||'—'} | ${(d.required||[]).includes(c)?'Có':'Không'} | ${(p.enum||[]).join(', ')||'—'} |`);
 }
 const browserSource=fs.readFileSync(path.join(process.cwd(),'scripts/api/supabase-client.js'),'utf8');
 const fallback=browserSource.match(/FALLBACK_URL\s*=\s*['"]([^'"]+)/)?.[1];
 lines.push('', `URL trong .env ${fallback?(fallback.replace(/\/$/,'')===url.replace(/\/$/,'')?'khớp':'KHÔNG khớp'):'chưa so được với'} fallback URL client trong source. Browser có thể override bằng cấu hình runtime/localStorage; chưa xác nhận project browser thực tế.`, '', '## RPC liên quan chỉ kiểm tên trong OpenAPI', '', '| Tên | Có đường OpenAPI |','|---|---|');
 for(const n of ['save_customer_profile_atomic']) lines.push(`| ${n} | ${Object.hasOwn(metadata.paths||{},'/rpc/'+n)?'Có':'Không thấy'} |`);
 fs.writeFileSync(path.join(__dirname,'metadata.md'),lines.join('\n')+'\n');
 fs.appendFileSync(path.join(__dirname,'metadata-run.txt'),`GET OpenAPI ${role}: HTTP ${response.status}; ${new Date().toISOString()}; exit 0\n`);
 console.log(`Metadata HTTP ${response.status}; ${Object.keys(metadata.definitions).length} definitions; saved selected schema only. CRUD/RLS NOT RUN.`);
}
main().catch(e=>{const code=e.cause?.code || (/^(CONFIG_MISSING|HTTP_\d+|NO_DEFINITIONS)$/.test(e.message)?e.message:e.name);fs.appendFileSync(path.join(__dirname,'metadata-run.txt'),`Read-only metadata attempt ${process.argv.includes('--service-role')?'service role':'anon'} failed: ${code}; ${new Date().toISOString()}; exit 1\nNo URL, credentials or response data stored.\n`);console.error('Metadata read failed: '+code);process.exitCode=1;});
