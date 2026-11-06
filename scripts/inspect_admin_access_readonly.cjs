// Read-only Cloud authorization inventory. No business writes, Auth sign-in or Cloud Logs.
const fs = require('node:fs');
const {connect} = require('./database/v1/service_import_connection.cjs');
const output = 'docs/security/PAWPAL_RASOAT_PHAN_QUYEN_CSDL.md';
const tables = ['staff','access_role','permission','role_permission','staff_role','staff_permission',
 'customer','customer_profile','customer_phone','pet_profile','appointment','appointment_item','staff_schedule',
 'sales_order','sales_order_item','payment','refund_transaction','inventory','inventory_transaction','product','product_variant',
 'support_ticket','chat_conversation','chat_message','admin_copilot_history','paw_point_transaction','audit_log','pawpal_setting',
 'sales_order_detail','appointment_record','care_log','staff_shift_request','staff_assessment','customer_address',
 'service','service_price_matrix','voucher','chatbot_compensation_policy','chatbot_handover_rule'];
const cell = value => String(value ?? '—').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
const grid = (headers, rows) => ['| '+headers.join(' | ')+' |', '|'+headers.map(()=>'---').join('|')+'|',
 ...rows.map(row=>'| '+row.map(cell).join(' | ')+' |')].join('\n');
(async()=>{
 let db;
 try {
  db = await connect();
  await db.query('BEGIN READ ONLY');
  await db.query("SET LOCAL statement_timeout='12s'");
  await db.query("SET LOCAL lock_timeout='1s'");
  const schema=(await db.query(`SELECT c.relname table_name,c.relrowsecurity rls,c.relforcerowsecurity force_rls,
   a.attname column_name,format_type(a.atttypid,a.atttypmod) type
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid
   WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND a.attnum>0 AND NOT a.attisdropped ORDER BY 1,a.attnum`,[tables])).rows;
  const roles=(await db.query(`SELECT r.code,r.role_name,
   (SELECT count(*) FROM public.role_permission rp WHERE rp.role_code=r.code)::int permissions,
   (SELECT count(*) FROM public.staff_role sr WHERE sr.role_code=r.code)::int assigned_staff
   FROM public.access_role r ORDER BY r.code`)).rows;
  const permissionRows=(await db.query('SELECT code,description FROM public.permission ORDER BY code')).rows;
  const mapping=(await db.query('SELECT role_code,permission_code FROM public.role_permission ORDER BY 1,2')).rows;
  const counts=(await db.query(`SELECT
   (SELECT count(*) FROM public.staff)::int staff,
   (SELECT count(*) FROM public.staff_permission)::int direct_permissions,
   (SELECT count(DISTINCT staff_id) FROM public.staff_permission)::int staff_with_direct_permissions,
   (SELECT count(*) FROM public.staff s WHERE NOT EXISTS(SELECT 1 FROM public.staff_role r WHERE r.staff_id=s.id))::int without_role,
   (SELECT count(*) FROM (SELECT staff_id FROM public.staff_role GROUP BY staff_id HAVING count(*)>1) s)::int multiple_roles`)).rows[0];
  const statuses=(await db.query(`SELECT employment_status,count(*)::int total,
   count(*) FILTER(WHERE auth_user_id IS NOT NULL)::int linked_auth,
   count(*) FILTER(WHERE must_change_password)::int must_change_password
   FROM public.staff GROUP BY employment_status ORDER BY 1`)).rows;
  const availableByRole=(await db.query(`SELECT sr.role_code,s.employment_status,
   count(*)::int total,count(*) FILTER(WHERE u.id IS NOT NULL AND NOT s.must_change_password AND coalesce(u.banned_until<=now(),true))::int auth_ready
   FROM public.staff_role sr JOIN public.staff s ON s.id=sr.staff_id LEFT JOIN auth.users u ON u.id=s.auth_user_id
   GROUP BY 1,2 ORDER BY 1,2`)).rows;
  const policies=(await db.query(`SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
   WHERE schemaname='public' AND tablename=ANY($1::text[]) ORDER BY 1,2`,[tables])).rows;
  const functions=(await db.query(`SELECT n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) arguments,
   p.prosecdef security_definer,p.proconfig settings,pg_get_functiondef(p.oid) definition,
   has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
   has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname=ANY(ARRAY['public','pawpal_private']) AND p.prokind='f'
   AND (p.proname IN ('has_permission','get_staff_login_context','set_admin_staff_access','create_admin_staff_profile','other_available_admin','begin_admin_staff_auth_action')
    OR p.proname LIKE '%admin%' OR p.proname LIKE '%staff%' OR p.proname LIKE '%copilot%') ORDER BY 1,2,3`)).rows;
  const grants=(await db.query(`SELECT table_name,grantee,privilege_type FROM information_schema.table_privileges
   WHERE table_schema='public' AND table_name=ANY($1::text[]) AND grantee IN ('anon','authenticated') ORDER BY 1,2,3`,[tables])).rows;
  const columnWrites=(await db.query(`SELECT table_name,column_name,grantee,privilege_type FROM information_schema.column_privileges
   WHERE table_schema='public' AND table_name=ANY(ARRAY['staff','staff_role','staff_permission','access_role','role_permission'])
   AND grantee IN ('anon','authenticated') AND privilege_type IN ('INSERT','UPDATE') ORDER BY 1,2,3,4`)).rows;
  const constraints=(await db.query(`SELECT c.relname table_name,co.conname name,pg_get_constraintdef(co.oid) definition
   FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname=ANY(ARRAY['staff','staff_role','staff_permission','role_permission']) ORDER BY 1,2`)).rows;
  const realtime=(await db.query(`SELECT pubname,tablename FROM pg_publication_tables WHERE schemaname='public'
   AND tablename=ANY($1::text[]) ORDER BY 1,2`,[tables])).rows;
  await db.query('ROLLBACK');
  const lines=['# Rà soát phân quyền CSDL PawPal','',
   'Thời điểm kiểm tra UTC: '+new Date().toISOString()+'.',
   'Đích kiểm tra: Supabase Cloud `cpzuvaplseielhgcnqrn`, theo bộ kết nối Cloud hiện có trong dự án.',
   'Phương pháp: giao dịch PostgreSQL READ ONLY, đọc catalog và thống kê phân quyền có phạm vi. Không thay đổi dữ liệu, không đăng nhập Auth, không truy vấn hệ thống Logs, không xuất dữ liệu cá nhân hoặc hội thoại.',
   'Giới hạn: đây là kiểm kê cấu hình thực tế; chưa chạy API bằng phiên Nhân viên/Quản lý và chưa chứng minh phân quyền hoạt động đúng bằng kiểm thử đầu cuối. Không tự xác nhận đây là project mà mọi bản triển khai đang sử dụng.','',
   '## Thống kê','',grid(['Chỉ số','Giá trị'],Object.entries(counts)),
   '',grid(['Trạng thái nhân sự','Tổng','Liên kết Auth','Cần đổi mật khẩu'],statuses.map(r=>[r.employment_status,r.total,r.linked_auth,r.must_change_password])),
   '','## Vai trò thực tế','',grid(['Mã','Tên','Số quyền','Số nhân viên'],roles.map(r=>[r.code,r.role_name,r.permissions,r.assigned_staff])),
   '',grid(['Vai trò','Trạng thái nhân sự','Tổng','Auth sẵn sàng, không bị khóa và không cần đổi mật khẩu'],availableByRole.map(r=>[r.role_code,r.employment_status,r.total,r.auth_ready])),
   '','## Bảng và chính sách','',grid(['Bảng','RLS','Force RLS','Số policy','Cột'],[...new Set(schema.map(r=>r.table_name))].map(t=>{
    const rows=schema.filter(r=>r.table_name===t);return [t,rows[0].rls,rows[0].force_rls,policies.filter(r=>r.tablename===t).length,rows.map(r=>r.column_name).join(', ')];})),
   '','Tên được tìm nhưng chưa thấy trong catalog: '+tables.filter(t=>!schema.some(r=>r.table_name===t)).join(', ')+'.',
   '','## Biểu thức RLS thực tế','',grid(['Bảng','Policy','Role','Thao tác','USING','WITH CHECK'],policies.map(r=>[r.tablename,r.policyname,Array.isArray(r.roles)?r.roles.join(', '):r.roles,r.cmd,r.qual,r.with_check])),
   '','## Quyền truy cập bảng','',grid(['Bảng','Role PostgreSQL','Quyền'],grants.map(r=>[r.table_name,r.grantee,r.privilege_type])),
   '','Quyền ghi theo cột trên các bảng phân quyền:','',columnWrites.length?grid(['Bảng','Cột','Role','Quyền'],columnWrites.map(r=>[r.table_name,r.column_name,r.grantee,r.privilege_type])):'Không thấy quyền INSERT/UPDATE được cấp cho anon/authenticated trong phạm vi kiểm tra.',
   '','## Danh mục quyền và ánh xạ vai trò','',grid(['Quyền','Mô tả','Vai trò có quyền'],permissionRows.map(r=>[r.code,r.description,mapping.filter(m=>m.permission_code===r.code).map(m=>m.role_code).join(', ')])),
   '','## Hàm nghiệp vụ và kiểm tra quyền','',
   'Danh sách mã quyền bên dưới là trích xuất tĩnh từ lời gọi has_permission trong định nghĩa thực tế. Không có mã trực tiếp không đồng nghĩa hàm không bảo vệ: cần đọc cả hàm được gọi bên trong.',
   '',grid(['Hàm','SECURITY DEFINER','anon EXECUTE','authenticated EXECUTE','Quyền trực tiếp','Thiết lập'],functions.map(r=>[r.schema+'.'+r.name+'('+r.arguments+')',r.security_definer,r.anon_execute,r.authenticated_execute,[...new Set([...r.definition.matchAll(/has_permission\('([^']+)'/g)].map(m=>m[1]))].join(', '),(r.settings||[]).join('; ')])),
   '','## Định nghĩa các hàm phân quyền trọng tâm',''];
  for(const f of functions.filter(r=>['has_permission','get_staff_login_context','set_admin_staff_access','other_available_admin'].includes(r.name)))
   lines.push('### '+f.schema+'.'+f.name,'','```sql',f.definition,'```','');
  lines.push('## Trích đoạn kiểm soát chatbot từ định nghĩa Cloud','',
   'Chỉ trích các dòng kiểm tra quyền và phạm vi; đây không phải toàn bộ thân hàm.');
  for(const f of functions.filter(r=>['admin_copilot_facts','admin_copilot_extended_facts','act_admin_chat','get_admin_chat_inbox_page','get_admin_chat_messages','get_admin_staff_directory','admin_staff_schedule_summary'].includes(r.name))){
   const source=f.definition.split('\n');const include=new Set();
   source.forEach((line,i)=>{if(/has_permission|revenue\.summary|assigned_staff_id|auth\.uid|role_code|staff_id\s*=/.test(line))for(let j=Math.max(0,i-1);j<=Math.min(source.length-1,i+2);j++)include.add(j);});
   lines.push('### '+f.schema+'.'+f.name,'','```sql',[...include].sort((a,b)=>a-b).map(i=>source[i]).join('\n'),'```','');
  }
  lines.push('## Ràng buộc bảng phân quyền','',grid(['Bảng','Tên','Định nghĩa'],constraints.map(r=>[r.table_name,r.name,r.definition])),
   '','## Realtime','',grid(['Publication','Bảng'],realtime.map(r=>[r.pubname,r.tablename])),'');
  fs.mkdirSync('docs/security',{recursive:true});fs.writeFileSync(output,lines.join('\n'),'utf8');
  console.log(JSON.stringify({report:output,readOnly:true,roles,counts,statuses,availableByRole,tables:[...new Set(schema.map(r=>r.table_name))].length,policies:policies.length,functions:functions.length,columnWriteGrants:columnWrites.length},null,2));
 } catch(e) {
  if(db)await db.query('ROLLBACK').catch(()=>{});
  console.error('Read-only audit failed:',e.code||e.name, e.stack?.split('\n').slice(1,3).join('\n'));process.exitCode=1;
 } finally {if(db)await db.end();}
})();
