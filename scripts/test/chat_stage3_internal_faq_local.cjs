const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),jwt=require('jsonwebtoken'),{execFileSync}=require('node:child_process');
const {answer}=require('../api/admin_copilot.js');
if(!process.argv.includes('--local-fixtures')){console.log('No changes. Pass --local-fixtures.');process.exit(0);}
const out='docs/chatbot/stage3-faq-internal-2026-10-29',env=JSON.parse(fs.readFileSync(out+'/local-environment.txt','utf8'));
assert.equal(env.status,'READY');assert.match(env.database,/^pawpal_chatbot_g0_[a-f0-9]{12}$/);assert.equal(env.ownerMarker,'pawpal-chatbot-g0-'+env.database.slice('pawpal_chatbot_g0_'.length));
const cfg=JSON.parse(fs.readFileSync(path.join(env.privateDir,'connection.private.txt'),'utf8'));
for(const key of ['auth','rest'])assert.equal(new URL(cfg[key]).hostname,'127.0.0.1');
const sql=text=>execFileSync('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d',env.database,'-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f','-'],{input:text,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:15000}).trim();
assert.equal(sql("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()"),env.ownerMarker);
const service={token:jwt.sign({role:'service_role',aud:'authenticated'},cfg.jwtSecret,{expiresIn:'1h'})};
const report={scope:'Owned local clone; actual Auth/JWT/REST/SQL, no Cloud or real model',checks:[],status:'INCOMPLETE',hashes:{}};
const pass=name=>{report.checks.push(name);console.log('PASS '+name);};
const read=name=>{const text=fs.readFileSync('scripts/database/v1/'+name,'utf8');report.hashes[name]=crypto.createHash('sha256').update(text).digest('hex');return text;};
async function rpc(actor,name,body){const r=await fetch(cfg.rest+'/rpc/'+name,{method:'POST',headers:{Authorization:'Bearer '+actor.token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});return {status:r.status,data:await r.json()};}
async function identity(kind){
 const id=crypto.randomUUID(),password=crypto.randomBytes(24).toString('hex'),email='faq-'+id+'@example.invalid';
 const r=await fetch(cfg.auth+'/admin/users',{method:'POST',headers:{Authorization:'Bearer '+service.token,apikey:service.token,'Content-Type':'application/json'},body:JSON.stringify({email,password,email_confirm:true})});const user=await r.json();assert.ok(r.ok);
 if(kind!=='member')sql(`INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password) VALUES('${id}','${user.id}','QA FAQ','QA','active',false);`+(kind==='admin'?`INSERT INTO public.staff_role(staff_id,role_code) VALUES('${id}','ADMIN')`:`INSERT INTO public.staff_permission(staff_id,permission_code) VALUES('${id}','admin_copilot_history.read')`));
 if(kind==='member')sql(`INSERT INTO public.customer(id,auth_user_id,customer_code) VALUES('${id}','${user.id}','QA-${id}')`);
 const login=await fetch(cfg.auth+'/token?grant_type=password',{method:'POST',headers:{apikey:service.token,'Content-Type':'application/json'},body:JSON.stringify({email,password})});const session=await login.json();assert.ok(login.ok);return {token:session.access_token,customerId:kind==='member'?id:null};
}
(async()=>{try{
 sql(read('091_admin_sales_order_page.sql'));sql(read('150_chat_booking_faq_audience.sql'));const internalMigration=read('151_admin_chat_internal_faq.sql');sql('DROP TABLE IF EXISTS public.admin_chat_knowledge_faq');sql(internalMigration);sql(read('143_chat_server_read_bundles.sql'));
 await new Promise(resolve=>setTimeout(resolve,500));
 const admin=await identity('admin'),limited=await identity('limited'),member=await identity('member');
 const rows=JSON.parse(sql('SELECT json_agg(f ORDER BY id) FROM public.admin_chat_knowledge_faq f'));
 assert.equal(rows.length,3);assert.equal(sql("SELECT count(*) FROM public.chatbot_knowledge_faq WHERE id::text LIKE '15100000-%'"),'0');pass('Three source-backed Admin FAQs stored separately from customer FAQ');
 const booking=await rpc(admin,'admin_copilot_extended_facts',{p_intent:'knowledge.search',p_filters:{query:'Đặt lịch PawPal'}});report.bookingRead={status:booking.status,code:booking.data?.code||null};assert.equal(booking.status,200);assert.ok(booking.data.items.some(r=>r.answer.includes('Khách vãng lai có thể')));pass('Booking FAQ migration visible through authorized Admin search');
 for(const row of rows){
  let calls=0,generations=0;
  const r=await answer({question:row.question,staff:{permissions:['chatbot_knowledge_faq.read']},caller:{rpc:async(name,args)=>{calls++;const response=await rpc(admin,name,args);assert.equal(response.status,200);return {data:response.data};}},generateReply:async(q,context)=>{generations++;assert.ok(context.faq.some(f=>f.answer===row.answer));return 'Hướng dẫn tham khảo theo FAQ nội bộ.';}});
  assert.equal(calls,1);assert.equal(generations,1);assert.equal(r.resource_usage.calls,1);assert.equal(r.answer_type,'workflow.guide');
 }
 pass('All three Admin FAQ questions reach authorized source and guidance in one read; model stub only');
 const anon={token:jwt.sign({role:'anon',aud:'authenticated'},cfg.jwtSecret,{expiresIn:'1h'})};
 for(const actor of [anon,member,limited]){
  const direct=await fetch(cfg.rest+'/admin_chat_knowledge_faq?select=id',{headers:{Authorization:'Bearer '+actor.token}});const data=await direct.json();assert.ok(!direct.ok||Array.isArray(data)&&data.length===0);
  const source=await rpc(actor,'admin_copilot_extended_facts',{p_intent:'knowledge.search',p_filters:{query:'nhân sự lịch trực'}});assert.ok(source.status>=400);
 }
 pass('Anonymous, non-staff authenticated user and staff without FAQ permission cannot read internal FAQ');
 const conversation=crypto.randomUUID();sql(`INSERT INTO public.chat_conversation(id,customer_id,status,sentiment_level,sentiment_trend,channel) SELECT '${conversation}','${member.customerId}','bot_handling',min(level),'neutral','web' FROM public.chatbot_sentiment_tier`);
 const publicContext=await rpc(service,'read_public_chat_context',{p_conversation:conversation});report.publicRead={status:publicContext.status,code:publicContext.data?.code||null};assert.equal(publicContext.status,200);
 for(const row of rows)assert.ok(!publicContext.data.faq.some(f=>f.question===row.question));
 assert.ok(publicContext.data.faq.some(f=>f.answer.includes('Khách vãng lai có thể')));pass('Public customer context includes corrected booking FAQ and excludes every internal FAQ');
 const first=rows[0];sql(`UPDATE public.admin_chat_knowledge_faq SET answer='Independent edit' WHERE id='${first.id}'`);
 try{sql(read('151_admin_chat_internal_faq.rollback.sql'));assert.fail('rollback must preserve edit');}catch(error){report.rollbackGuardDiagnostic=String(error.stderr||'').split('\n').find(line=>line.includes('ERROR:'))?.slice(0,180)||null;assert.ok(String(error.stderr||'').includes('admin_faq_changed_review_required'));}
 sql(`UPDATE public.admin_chat_knowledge_faq SET answer='${first.answer.replace(/'/g,"''")}' WHERE id='${first.id}'`);pass('Internal FAQ rollback refuses to drop independently edited content');
 sql(read('151_admin_chat_internal_faq.rollback.sql'));assert.equal(sql("SELECT to_regclass('public.admin_chat_knowledge_faq') IS NULL"),'t');
 sql(read('150_chat_booking_faq_audience.rollback.sql'));
 const restored=await rpc(admin,'admin_copilot_extended_facts',{p_intent:'knowledge.search',p_filters:{query:'Đặt lịch PawPal'}});assert.equal(restored.status,200);assert.ok(restored.data.items.some(f=>f.answer.includes('Thành viên cần đăng nhập')));pass('Both rollbacks restore original search and booking answer');
 report.status='PASS';
}catch(error){report.status='FAIL';report.error={name:error.name,code:error.code||null,diagnostic:String(error.stderr||'').split('\n').find(line=>line.includes('ERROR:'))?.slice(0,180)||null};process.exitCode=1;console.error('Internal FAQ verification failed; credentials and SQL suppressed.');}
finally{fs.writeFileSync(out+'/local-results.txt',JSON.stringify(report,null,2)+'\n');}})();
