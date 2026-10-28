// Explicit opt-in. Task-owned local clone only; never reads Cloud configuration.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),jwt=require('jsonwebtoken');
const {execFileSync,fork}=require('node:child_process');
if(process.argv.includes('--worker')){
 process.on('message',async m=>{try{const r=await fetch(m.url+'/rpc/'+m.name,{method:'POST',headers:{Authorization:'Bearer '+m.token,'Content-Type':'application/json'},body:JSON.stringify(m.args),signal:AbortSignal.timeout(10000)});const body=await r.text();const data=body?JSON.parse(body):null;process.send({id:m.id,status:r.status,data});}catch{process.send({id:m.id,status:599});}});
}else if(process.argv.includes('--local-fixtures'))main().catch(e=>{console.error(e.message);process.exitCode=1;});
else console.log('No changes. Use --local-fixtures.');
async function main(){
 const out='docs/chatbot/stage2-admission-2026-10-28',env=JSON.parse(fs.readFileSync(out+'/local-environment.txt','utf8'));
 assert.equal(env.status,'READY');assert.match(env.database,/^pawpal_chatbot_g0_[a-f0-9]{12}$/);
 const cfg=JSON.parse(fs.readFileSync(path.join(env.privateDir,'connection.private.txt'),'utf8'));
 for(const key of ['auth','rest'])assert.equal(new URL(cfg[key]).hostname,'127.0.0.1');
 const sql=s=>execFileSync('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d',env.database,'-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f','-'],{input:s,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();
 assert.equal(sql("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()"),env.ownerMarker);
 sql(fs.readFileSync('scripts/database/v1/136_chat_read_admission.sql','utf8'));
 sql('ALTER TABLE public.product_variant ADD COLUMN IF NOT EXISTS catalog_retired boolean NOT NULL DEFAULT false;');
 const report={scope:'Marker-owned local PostgREST v14 only; no Cloud/model',checks:[],status:'INCOMPLETE'},workers=[],pending=new Map();let seq=0,original;
 const pass=name=>{report.checks.push({name,status:'PASS'});console.log('PASS '+name);};
 function worker(){const w=fork(__filename,['--worker'],{stdio:['ignore','ignore','pipe','ipc']});w.on('message',m=>{pending.get(m.id)?.(m);pending.delete(m.id);});workers.push(w);return w;}
 function call(w,token,name,args){return new Promise(resolve=>{const id=++seq;pending.set(id,resolve);w.send({id,url:cfg.rest,token,name,args});});}
 const service=jwt.sign({role:'service_role',aud:'authenticated'},cfg.jwtSecret,{expiresIn:'1h'});
 async function identity(){const id=crypto.randomUUID();const r=await fetch(cfg.auth+'/admin/users',{method:'POST',headers:{Authorization:'Bearer '+service,apikey:service,'Content-Type':'application/json'},body:JSON.stringify({email:'admission-'+id+'@example.invalid',password:crypto.randomBytes(24).toString('hex'),email_confirm:true})});const u=await r.json();assert.ok(r.ok,'local Auth fixture creation');
  sql(`INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password) VALUES('${id}','${u.id}','QA admission','QA','active',false); INSERT INTO public.staff_role(staff_id,role_code) VALUES('${id}','ADMIN');`);
  return jwt.sign({role:'authenticated',aud:'authenticated',sub:u.id},cfg.jwtSecret,{expiresIn:'1h'});}
 const a=worker(),b=worker(),c=worker();
 const acquire=(w,t)=>call(w,t,'acquire_admin_chat_read',{p_request:crypto.randomUUID()}),release=(w,t,l)=>call(w,t,'release_admin_chat_read',{p_lease:l});
 const run=(w,t,l,max=32768)=>call(w,t,'run_admin_chat_read',{p_lease:l,p_tool:'inventory.low_stock',p_filters:{},p_max_bytes:max});
 try{
  const ta=await identity(),tb=await identity(),tc=await identity();await new Promise(r=>setTimeout(r,600));
  const la=(await acquire(a,ta));assert.equal(la.status,200);const lb=await acquire(b,tb);assert.equal(lb.status,200);
  assert.equal((await acquire(c,tc)).data.code,'PT429');assert.equal((await acquire(c,ta)).data.code,'PT429');assert.equal(sql('SELECT count(*) FROM pawpal_private.chat_read_slot WHERE expires_at>clock_timestamp()'),'2');pass('Independent worker processes share two request slots; same actor and third actor fail fast');
  await release(c,tc,la.data);assert.equal((await acquire(c,tc)).data.code,'PT429');
  assert.equal((await run(c,tc,la.data)).data.code,'42501');pass('Another actor cannot use or release a lease');
  assert.equal((await run(a,ta,la.data,1)).data.code,'54000');pass('SQL rejects oversized result before emitting source payload');
  original=sql("SELECT pg_get_functiondef('public.admin_copilot_facts(text,jsonb)'::regprocedure)");
  // Test-only slow source in the disposable clone. Restore exact original in finally.
  sql(`CREATE OR REPLACE FUNCTION public.admin_copilot_facts(p_intent text,p_filters jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER AS $$ BEGIN PERFORM pg_sleep(2); RETURN jsonb_build_object('intent',p_intent,'items','[]'::jsonb,'total',0); END $$;
ALTER FUNCTION public.run_admin_chat_read(uuid,text,jsonb,integer) SET statement_timeout='200ms'; NOTIFY pgrst,'reload schema';`);
  await new Promise(r=>setTimeout(r,600));const start=Date.now();const timed=await run(a,ta,la.data);assert.equal(timed.data.code,'57014');assert.ok(Date.now()-start<1500,'database timeout hoisted before source execution');
  assert.equal(sql("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND state='active' AND query LIKE '%run_admin_chat_read%'"),'0');pass('PostgREST hoists function timeout: slow SQL cancelled and no active source remains');
  sql("ALTER FUNCTION public.run_admin_chat_read(uuid,text,jsonb,integer) SET statement_timeout='5s'; NOTIFY pgrst,'reload schema';");await new Promise(r=>setTimeout(r,600));
  const active=[run(a,ta,la.data),run(b,tb,lb.data),run(c,ta,la.data),run(c,tb,lb.data)];await new Promise(r=>setTimeout(r,150));assert.equal((await run(b,ta,la.data)).data.code,'PT429');for(const r of await Promise.all(active))assert.equal(r.status,200);pass('Four source transactions across processes; fifth rejected, locks recover after timeout');
  sql(original);original=null;
  sql(`UPDATE pawpal_private.chat_read_slot SET expires_at=clock_timestamp()-interval '1 second' WHERE token='${la.data}';`);
  const lc=await acquire(c,tc);assert.equal(lc.status,200);await release(a,ta,la.data);assert.equal(sql(`SELECT count(*) FROM pawpal_private.chat_read_slot WHERE token='${lc.data}'`),'1');assert.equal((await run(a,ta,la.data)).data.code,'42501');pass('Expired lease is reclaimed; stale release cannot affect replacement');
  await release(b,tb,lb.data);await release(c,tc,lc.data);assert.equal(sql('SELECT count(*) FROM pawpal_private.chat_read_slot WHERE token IS NOT NULL'),'0');pass('Release leaves two fixed empty slots; no growing queue or persistent fixture messages');report.status='PASS';
 }finally{if(original)sql(original);sql("ALTER FUNCTION public.run_admin_chat_read(uuid,text,jsonb,integer) SET statement_timeout='5s'; NOTIFY pgrst,'reload schema';");for(const w of workers)w.kill();fs.writeFileSync(out+'/admission-results.txt',JSON.stringify(report,null,2)+'\n');}
}
