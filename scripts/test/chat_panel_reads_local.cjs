const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),jwt=require('jsonwebtoken'),assert=require('node:assert/strict');
const {execFileSync,spawn}=require('node:child_process');
if(!process.argv.includes('--local-fixtures')){console.log('No changes. Use --local-fixtures.');process.exit(0);}
const out='docs/chatbot/stage2-panels-2026-10-28',env=JSON.parse(fs.readFileSync(out+'/local-environment.txt','utf8'));
assert.equal(env.status,'READY');assert.match(env.database,/^pawpal_chatbot_g0_[a-f0-9]{12}$/);
const cfg=JSON.parse(fs.readFileSync(path.join(env.privateDir,'connection.private.txt'),'utf8'));
for(const k of ['rest','auth'])assert.equal(new URL(cfg[k]).hostname,'127.0.0.1');
const args=['exec','-i','supabase-db','psql','-U','supabase_admin','-d',env.database,'-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f','-'];
const sql=s=>execFileSync('docker',args,{input:s,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();
assert.equal(sql("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()"),env.ownerMarker);
const report={scope:'Disposable local database, real JWT/PostgREST; no Cloud/AI',migrations:['136_chat_read_admission.sql','137_chat_panel_reads.sql'].map(name=>({name,sha256:crypto.createHash('sha256').update(fs.readFileSync('scripts/database/v1/'+name)).digest('hex')})),checks:[],metrics:{},status:'INCOMPLETE'};
const pass=name=>{report.checks.push({name,status:'PASS'});console.log('PASS '+name);};
const service=jwt.sign({role:'service_role',aud:'authenticated'},cfg.jwtSecret,{expiresIn:'1h'});
async function actor(role){const id=crypto.randomUUID(),r=await fetch(cfg.auth+'/admin/users',{method:'POST',headers:{Authorization:'Bearer '+service,apikey:service,'Content-Type':'application/json'},body:JSON.stringify({email:'panel-'+id+'@example.invalid',password:crypto.randomBytes(20).toString('hex'),email_confirm:true})});const u=await r.json();assert.ok(r.ok,'local Auth fixture');
 if(role){sql(`INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password) VALUES('${id}','${u.id}','QA panel','QA','active',false);`);
  if(role==='ADMIN')sql(`INSERT INTO public.staff_role(staff_id,role_code) VALUES('${id}','ADMIN');`);else sql(`INSERT INTO public.staff_permission(staff_id,permission_code) VALUES('${id}','chat_conversation.read');`);}
 return jwt.sign({role:'authenticated',aud:'authenticated',sub:u.id},cfg.jwtSecret,{expiresIn:'1h'});}
async function request(token,route,body){const r=await fetch(cfg.rest+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(8000)});const text=await r.text();return {status:r.status,bytes:Buffer.byteLength(text),data:JSON.parse(text||'null')};}
const rpc=(token,name,args)=>request(token,'/rpc/'+name,args);
(async()=>{
 sql(fs.readFileSync('scripts/database/v1/136_chat_read_admission.sql','utf8'));sql(fs.readFileSync('scripts/database/v1/137_chat_panel_reads.sql','utf8'));
 const token=await actor('ADMIN'),limited=await actor('limited'),customerToken=await actor(null),customer=crypto.randomUUID(),conversation=crypto.randomUUID(),species=crypto.randomUUID(),breed=crypto.randomUUID(),query='QA-'+customer;
 sql(`INSERT INTO public.customer(id,customer_code,contact_email) VALUES('${customer}','QA-${customer}','qa@example.invalid'); INSERT INTO public.customer_profile(customer_id,full_name) VALUES('${customer}','${query}');
 INSERT INTO public.pet_species(id,species_name) VALUES('${species}','QA-${species}'); INSERT INTO public.pet_breed(id,species_id,breed_name) VALUES('${breed}','${species}','QA breed');
 INSERT INTO public.pet_profile(customer_id,pet_code,pet_name,breed_id) SELECT '${customer}','QA-${customer}-'||i,'QA pet '||i,'${breed}' FROM generate_series(1,11) i;
 INSERT INTO public.chat_conversation(id,customer_id,sentiment_level,sentiment_trend,channel) VALUES('${conversation}','${customer}',2,'stable','web');`);
 await new Promise(r=>setTimeout(r,600));
 assert.equal((await rpc(token,'get_admin_chat_inbox_view',{p_query:null})).data.code,'22023');
 let r=await rpc(token,'get_admin_chat_inbox_view',{p_query:query,p_filter:'all',p_page:1});assert.equal(r.status,200);assert.equal(r.data.rows.length,1);assert.equal(r.data.rows[0].customer_profile.full_name,query);assert.ok(r.bytes<=32768);report.metrics.inboxNew={requests:1,bytes:r.bytes};
 const old=await rpc(token,'get_admin_chat_inbox_page',{p_query:query,p_filter:'all',p_page:1});let oldBytes=old.bytes;for(const route of ['/customer_profile?select=customer_id,full_name&customer_id=eq.'+customer,'/customer?select=id,contact_email&id=eq.'+customer,'/customer_phone?select=customer_id,phone_number&is_primary=eq.true&customer_id=eq.'+customer]){const x=await request(token,route);assert.equal(x.status,200);oldBytes+=x.bytes;}report.metrics.inboxOld={requests:4,bytes:oldBytes};pass('Inbox enrich is one bounded caller-scoped RPC instead of four HTTP database requests');
 r=await rpc(token,'get_admin_chat_customer_panel',{p_customer:customer});assert.equal(r.status,200);assert.equal(r.data.pets.length,10);assert.equal(r.data.petsHasMore,true);assert.equal(r.data.pawpoints,0);assert.deepEqual(r.data.openTickets,[]);assert.equal(r.data.recentOrder,null);assert.equal(r.data.recentBooking,null);report.metrics.customerPanel={requests:1,previousRequests:6,bytes:r.bytes};
 sql(`INSERT INTO public.support_ticket(ticket_code,customer_id,channel,category,subject,priority,type,status) SELECT 'QA-${customer}-'||i,'${customer}','web','service','QA ticket '||i,'normal','complaint','pending' FROM generate_series(1,6) i;`);
 r=await rpc(token,'get_admin_chat_customer_panel',{p_customer:customer});assert.equal(r.status,200);assert.equal(r.data.openTickets.length,5);assert.equal(r.data.ticketsHasMore,true);pass('Customer panel bundles six reads; ten pets/five tickets with explicit hasMore and actual empty order state');
 for(const t of [limited,customerToken])for(const name of ['get_admin_chat_inbox_view','get_admin_chat_customer_panel']){const x=await rpc(t,name,name.endsWith('view')?{p_query:query}:{p_customer:customer});assert.equal(x.status,403);assert.equal(x.data.code,'42501');}pass('Chat-only staff and non-staff JWT cannot read protected customer information');
 const lease=await rpc(token,'acquire_admin_chat_read',{p_request:crypto.randomUUID()});assert.equal(lease.status,200);
 const holder=spawn('docker',args,{windowsHide:true,stdio:['pipe','pipe','pipe']});let ready='';const held=new Promise((resolve,reject)=>{holder.stdout.on('data',d=>{ready+=d;if(ready.includes('SLOTS_READY'))resolve();});holder.on('error',reject);holder.on('exit',code=>{if(code)reject(Error('local_lock_holder'));});});
 const exited=new Promise(resolve=>holder.on('exit',resolve));holder.stdin.end("BEGIN; SELECT pg_advisory_xact_lock(hashtext('pawpal_chat_read_source_v1'),i) FROM generate_series(1,4) i; SELECT 'SLOTS_READY'; SELECT pg_sleep(2); COMMIT;");await held;
 for(const [name,body]of [['get_admin_chat_inbox_view',{p_query:query}],['get_admin_chat_customer_panel',{p_customer:customer}],['run_admin_chat_read',{p_lease:lease.data,p_tool:'history.context',p_filters:{sessionId:crypto.randomUUID()}}]])assert.equal((await rpc(token,name,body)).data.code,'PT429');await exited;
 assert.equal((await rpc(token,'get_admin_chat_customer_panel',{p_customer:customer})).status,200);await rpc(token,'release_admin_chat_read',{p_lease:lease.data});pass('Direct browser panels and Copilot share four SQL slots; fail fast while full and recover after release');
 sql(`UPDATE public.chat_conversation SET internal_note=repeat('x',34000) WHERE id='${conversation}';`);assert.equal((await rpc(token,'get_admin_chat_inbox_view',{p_query:query})).data.code,'54000');
 sql(`UPDATE public.chat_conversation SET internal_note=NULL WHERE id='${conversation}'; UPDATE public.pet_profile SET allergy=repeat('x',4000) WHERE customer_id='${customer}';`);assert.equal((await rpc(token,'get_admin_chat_customer_panel',{p_customer:customer})).data.code,'54000');pass('Oversized inbox and customer panels rejected in SQL before source payload leaves database');
 report.status='PASS';
})().catch(e=>{report.error={code:e.code||null,message:e.message?.slice(0,200)};console.error('Local panels failed:',report.error);process.exitCode=1;}).finally(()=>fs.writeFileSync(out+'/panel-results.txt',JSON.stringify(report,null,2)+'\n'));
