// Phase 1: bounded READ ONLY catalog/account aggregates and source inventory.
// No Auth sign-in, business writes, Cloud Logs or personal data export.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {connect}=require('./database/v1/service_import_connection.cjs');
const output='docs/security/PAWPAL_GIAI_DOAN_1_KIEM_KE.md';
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files=[...walk('pages/admin').filter(f=>f.endsWith('.js')),...walk('scripts/api').filter(f=>/chat_read_tools|staff_auth|admin_copilot/.test(f)), 'api/admin-chat.js'];
const scans=files.map(file=>{const text=fs.readFileSync(file,'utf8');return {file:file.replaceAll('\\','/'),
 hash:crypto.createHash('sha256').update(text).digest('hex'),
 rpc:[...new Set([...text.matchAll(/\.rpc\(\s*['"]([a-z_][a-z_0-9]*)['"]/g)].map(m=>m[1]))],
 tables:[...new Set([...text.matchAll(/\.from\(\s*['"]([a-z_][a-z_0-9]*)['"]/g)].map(m=>m[1]))]};});
const tools=require('./api/chat_read_tools.js').definitions;
const toolRPCs=[...new Set(Object.values(tools).flatMap(t=>[t.rpc||(t.extended?'admin_copilot_extended_facts':'admin_copilot_facts'),t.gateway||(t.stage3?'run_admin_stage3_read':'run_admin_chat_read')]))];
const rpcNames=[...new Set([...scans.flatMap(s=>s.rpc),...toolRPCs])];
const related=['staff','staff_schedule','staff_assessment','staff_shift_request','appointment','appointment_item','appointment_record',
 'care_log','taxi_trip','hotel_booking','sales_order','sales_order_detail','payment','refund_transaction','support_ticket',
 'support_ticket_message','chat_conversation','chat_message','admin_copilot_history','audit_log','paw_point_transaction','voucher_redemption'];
const cell=v=>String(v??'—').replaceAll('|','\\|').replace(/[\r\n]+/g,' ');
const grid=(h,rows)=>['| '+h.join(' | ')+' |','|'+h.map(()=>'---').join('|')+'|',...rows.map(r=>'| '+r.map(cell).join(' | ')+' |')].join('\n');
(async()=>{let db;try{
 db=await connect();await db.query('BEGIN READ ONLY');await db.query("SET LOCAL statement_timeout='10s'");await db.query("SET LOCAL lock_timeout='1s'");
 const accounts=(await db.query(`WITH account AS (
  SELECT s.employment_status,s.must_change_password,s.service_locked,u.id IS NOT NULL linked_auth,
   coalesce(u.banned_until>now(),false) auth_banned,
   coalesce((SELECT string_agg(r.role_code,',' ORDER BY r.role_code) FROM public.staff_role r WHERE r.staff_id=s.id),'none') roles
  FROM public.staff s LEFT JOIN auth.users u ON u.id=s.auth_user_id)
  SELECT employment_status,must_change_password,service_locked,linked_auth,auth_banned,roles,count(*)::int total
  FROM account GROUP BY 1,2,3,4,5,6 ORDER BY 1,2,3,4,5,6`)).rows;
 const columns=(await db.query(`SELECT table_name,column_name,data_type FROM information_schema.columns
  WHERE table_schema='public' AND table_name=ANY($1::text[]) ORDER BY table_name,ordinal_position`,[related])).rows;
 const functions=(await db.query(`SELECT n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) arguments,
  p.prosecdef security_definer,pg_get_functiondef(p.oid) definition,
  has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.prokind='f' AND p.proname=ANY($1::text[]) ORDER BY 2,3`,[rpcNames])).rows;
 const constraints=(await db.query(`SELECT c.relname table_name,co.conname name,pg_get_constraintdef(co.oid) definition
  FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND co.contype IN ('f','c') ORDER BY 1,2`,[related])).rows;
 const triggers=(await db.query(`SELECT c.relname table_name,t.tgname name,pg_get_triggerdef(t.oid) definition
  FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname=ANY(ARRAY['staff','staff_role','staff_permission']) AND NOT t.tgisinternal ORDER BY 1,2`)).rows;
 await db.query('ROLLBACK');
 const missing=rpcNames.filter(name=>!functions.some(f=>f.name===name));
 const lines=['# Bằng chứng rà soát giai đoạn 1','',
  'Thời điểm UTC: '+new Date().toISOString()+'. Project: cpzuvaplseielhgcnqrn.',
  'Chỉ đọc PostgreSQL trong giao dịch READ ONLY: 5 truy vấn dữ liệu/catalog có phạm vi. Không đăng nhập Auth, không ghi nghiệp vụ, không đọc Cloud Logs; chỉ xuất thống kê tài khoản, không xuất tên, email, ID hoặc token.',
  'Phân tích mã nguồn ghi nhận tên RPC/bảng truyền bằng chuỗi cố định và tên gateway/RPC từ registry chat_read_tools. Chưa chứng minh mọi đường gọi động, nhánh thực thi hay toàn bộ phụ thuộc lồng bên trong. Chưa chạy nghiệp vụ đầu cuối.','',
  '## Nhóm trạng thái tài khoản','',grid(['Trạng thái','Phải đổi mật khẩu','Khóa nhận việc','Có Auth','Auth bị khóa','Vai trò','Số hồ sơ'],accounts.map(r=>[r.employment_status,r.must_change_password,r.service_locked,r.linked_auth,r.auth_banned,r.roles,r.total])),
  '','Khóa nhận việc (service_locked) khác khóa đăng nhập Auth. Chuẩn hóa trạng thái nhân sự không được thay ban Auth, tự bỏ yêu cầu đổi mật khẩu hoặc tự gán vai trò.',
  '','## Cột dữ liệu dùng xác định phạm vi','',grid(['Bảng','Cột'],related.map(t=>[t,columns.filter(c=>c.table_name===t).map(c=>c.column_name).join(', ')||'Chưa thấy'])),
  '','## Quan hệ và ràng buộc','',grid(['Bảng','Ràng buộc','Định nghĩa'],constraints.map(r=>[r.table_name,r.name,r.definition])),
  '','## Trigger nhân sự','',grid(['Bảng','Trigger','Định nghĩa'],triggers.map(r=>[r.table_name,r.name,r.definition])),
  '','## Nguồn gọi RPC và đọc bảng','',grid(['File','RPC chuỗi cố định','Bảng/view chuỗi cố định','SHA256'],scans.filter(s=>s.rpc.length||s.tables.length).map(s=>[s.file,s.rpc.join(', '),s.tables.join(', '),s.hash])),
  '','## Registry công cụ chatbot','',grid(['Intent','Gateway','RPC nền','Quyền hiện tại'],Object.entries(tools).map(([intent,t])=>[intent,t.gateway||(t.stage3?'run_admin_stage3_read':'run_admin_chat_read'),t.rpc||(t.extended?'admin_copilot_extended_facts':'admin_copilot_facts'),t.permissions.join(', ')])),
  '','## RPC nguồn ứng dụng so với Cloud','',
  'Số tên RPC trong phạm vi quét: '+rpcNames.length+'. Số chữ ký hàm tìm thấy: '+functions.length+'.',
  'Tên chưa thấy trên Cloud: '+(missing.join(', ')||'Không có')+'. Những tên này cần kiểm tra xem có còn được dùng hay thuộc nhánh cũ trước khi kết luận lỗi.',
  '',grid(['RPC','authenticated EXECUTE','SECURITY DEFINER','Quyền được gọi trực tiếp'],functions.map(f=>[f.name+'('+f.arguments+')',f.authenticated_execute,f.security_definer,[...new Set([...f.definition.matchAll(/has_permission\('([^']+)'/g)].map(m=>m[1]))].join(', ')])),
  '','## Trích đoạn các luồng cần tách quyền','',
  'Trích theo dòng kiểm soát, không phải toàn bộ định nghĩa hàm; không dùng phần trích rời để kết luận thiếu kiểm tra ở các hàm lồng.'];
 for(const f of functions.filter(f=>['post_admin_sales_money','post_admin_service_money','update_admin_sales_order','save_admin_service_record','save_admin_service_care_log','adjust_customer_points','act_admin_complaint','save_admin_staff_profile','get_admin_service_cashier'].includes(f.name))){
  const source=f.definition.split('\n'),indices=new Set();source.forEach((line,i)=>{if(/has_permission|auth\.uid|p_action|assigned_staff_id|staff_id|employment_status|service_locked/.test(line))for(let j=Math.max(0,i-1);j<=Math.min(source.length-1,i+1);j++)indices.add(j);});
  lines.push('### '+f.name,'','```sql',[...indices].sort((a,b)=>a-b).map(i=>source[i]).join('\n'),'```','');
 }
 fs.mkdirSync('docs/security',{recursive:true});fs.writeFileSync(output,lines.join('\n')+'\n','utf8');
 console.log(JSON.stringify({output,accounts,sourceFiles:scans.length,rpcNames:rpcNames.length,liveSignatures:functions.length,missing,relatedTables:related.filter(t=>columns.some(c=>c.table_name===t)).length},null,2));
}catch(e){if(db)await db.query('ROLLBACK').catch(()=>{});console.error('Phase 1 inspection failed:',e.code||e.name);process.exitCode=1;}finally{if(db)await db.end();}})();
