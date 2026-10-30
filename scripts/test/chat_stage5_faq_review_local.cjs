const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),jwt=require('jsonwebtoken'),{execFileSync}=require('node:child_process');
if(!process.argv.includes('--local-fixtures')){console.log('No changes. Pass --local-fixtures.');process.exit(0);}
const out='docs/chatbot/stage5-faq-review-2026-10-30',env=JSON.parse(fs.readFileSync(out+'/local-environment.txt','utf8'));
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
 for(const name of ['143_chat_server_read_bundles.sql','150_chat_booking_faq_audience.sql','152_chat_hotel_faq_missing_prices.sql','155_public_chat_faq_search.sql'])sql(read(name));
 sql(read('157_public_faq_content_review.rollback.sql'));
 const changes=JSON.parse(fs.readFileSync(out+'/reviewed-changes.txt','utf8')),snapshot=JSON.parse(fs.readFileSync(out+'/public-faq-local-snapshot.txt','utf8')).rows;
 const before=sql("SELECT md5(jsonb_agg(to_jsonb(f)-'updated_at' ORDER BY id)::text) FROM public.chatbot_knowledge_faq f");
 sql(read('157_public_faq_content_review.sql'));sql(read('157_public_faq_content_review.sql'));
 const rows=JSON.parse(sql('SELECT json_agg(f ORDER BY id) FROM public.chatbot_knowledge_faq f'));
 for(const c of changes){const selected=rows.filter(r=>r.question===c.question);assert.equal(selected.length,1);assert.equal(selected[0].is_active,!c.disable);if(!c.disable)assert.equal(selected[0].answer,c.answer);else assert.equal(selected[0].answer,snapshot.find(r=>r.question===c.question).answer);}
 pass('All nineteen reviewed changes apply exactly and idempotently, with no fake business prices/hours/return deadlines');
 const member=await identity('member'),chat=crypto.randomUUID();sql(`INSERT INTO public.chat_conversation(id,customer_id,status,sentiment_level,sentiment_trend,channel) SELECT '${chat}','${member.customerId}','bot_handling',min(level),'neutral','web' FROM public.chatbot_sentiment_tier`);await new Promise(r=>setTimeout(r,500));
 for(const c of changes.filter(c=>!c.disable)){const r=await rpc(service,'search_public_chat_context',{p_conversation:chat,p_question:c.question});assert.equal(r.status,200);assert.equal(r.data.incomplete,false);assert.ok(r.data.faq.some(f=>f.question===c.question&&f.answer===c.answer),c.question);}
 pass('All eighteen active corrected/added questions can retrieve the reviewed answer through bounded public search with real JWT/REST');
 const qa=changes.find(c=>c.disable),hidden=await rpc(service,'search_public_chat_context',{p_conversation:chat,p_question:qa.question});assert.equal(hidden.status,200);assert.ok(!hidden.data.faq.some(f=>f.question===qa.question));pass('Known synthetic QA question excluded from public retrieval without deleting its source record');
 const edited=changes.find(c=>!c.insert&&!c.disable),record=rows.find(r=>r.question===edited.question),quote=v=>"'"+v.replace(/'/g,"''")+"'";
 sql(`UPDATE public.chatbot_knowledge_faq SET answer='Independent edit' WHERE id='${record.id}'`);for(const migration of ['157_public_faq_content_review.sql','157_public_faq_content_review.rollback.sql']){let failed=false;try{sql(read(migration));}catch{failed=true;}assert.equal(failed,true);assert.equal(sql(`SELECT answer FROM public.chatbot_knowledge_faq WHERE id='${record.id}'`),'Independent edit');}sql(`UPDATE public.chatbot_knowledge_faq SET answer=${quote(edited.answer)} WHERE id='${record.id}'`);pass('Apply and rollback both refuse to overwrite an independently edited answer');
 const added=rows.find(r=>r.question===changes.find(c=>c.insert).question);sql(`UPDATE public.chatbot_knowledge_faq SET keywords=ARRAY['independent'] WHERE id='${added.id}'`);let blocked=false;try{sql(read('157_public_faq_content_review.rollback.sql'));}catch{blocked=true;}assert.equal(blocked,true);assert.equal(sql(`SELECT count(*) FROM public.chatbot_knowledge_faq WHERE id='${added.id}'`),'1');sql(`UPDATE public.chatbot_knowledge_faq SET keywords='{}' WHERE id='${added.id}'`);pass('Rollback protects independently edited metadata of new FAQ rather than deleting it');
 sql(read('157_public_faq_content_review.rollback.sql'));sql(read('157_public_faq_content_review.rollback.sql'));assert.equal(sql("SELECT md5(jsonb_agg(to_jsonb(f)-'updated_at' ORDER BY id)::text) FROM public.chatbot_knowledge_faq f"),before);sql(read('157_public_faq_content_review.sql'));pass('Rollback restores all source rows and flags exactly except timestamps; idempotent reverse and reapply pass');
 const windows=text=>text.replace(/\r?\n/g,'\r\n');
 sql(windows(read('157_public_faq_content_review.rollback.sql')));sql(windows(read('157_public_faq_content_review.sql')));
 for(const name of ['150_chat_booking_faq_audience','152_chat_hotel_faq_missing_prices']){sql(windows(read(name+'.rollback.sql')));sql(windows(read(name+'.sql')));}
 pass('Windows CRLF migration files apply and reverse against actual LF database content without weakening independent-edit guards');
 report.reviewedRows=changes.length;report.sourceRows=snapshot.length;report.status='PASS';
}catch(error){report.status='FAIL';report.error={name:error.name,code:error.code||null,at:String(error.stack||'').split('\n').find(l=>l.includes('chat_stage5_faq_review_local.cjs:'))?.trim(),diagnostic:String(error.stderr||'').split('\n').find(l=>l.includes('ERROR:'))?.slice(0,180)||null};process.exitCode=1;console.error('FAQ content review failed; private values suppressed.');}
finally{fs.writeFileSync(out+'/local-results.txt',JSON.stringify(report,null,2)+'\n');}})();
