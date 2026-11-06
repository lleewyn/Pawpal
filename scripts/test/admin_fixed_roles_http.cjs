// Signed JWT / real PostgREST acceptance on a loopback-only, task-owned container.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),jwt=require('jsonwebtoken'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const folder='docs/security/phase2',env=JSON.parse(fs.readFileSync(folder+'/local-environment.txt','utf8'));
assert.match(env.database,/^pawpal_access_[a-f0-9]{12}$/);
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:30000,maxBuffer:4*1024*1024}).trim();
const runSQL=(database,input)=>docker(['exec','-i','supabase-db','psql','-U','supabase_admin','-d',database,'-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f','-'],input);
assert.equal(runSQL(env.database,"SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()"),env.marker);
const database='pawpal_access_http_'+crypto.randomBytes(6).toString('hex'),marker=env.marker+'-http';
const sql=input=>runSQL(database,input);
const report={capturedAt:new Date().toISOString(),migrationSha256:crypto.createHash('sha256').update(fs.readFileSync('scripts/database/v1/165_admin_fixed_roles.sql')).digest('hex'),scope:'Real local PostgREST verifies task-signed JWTs; no Auth sign-in, browser, model or Cloud writes',checks:[],status:'INCOMPLETE'};
const id=n=>'16500000-0000-4000-8000-'+String(n).padStart(12,'0');
let container,privateEnvFile;
(async()=>{try{
 runSQL('postgres',`CREATE DATABASE ${database} TEMPLATE ${env.database}; COMMENT ON DATABASE ${database} IS '${marker}';`);
 const source=JSON.parse(docker(['inspect','supabase-rest']))[0];
 const vars=Object.fromEntries(source.Config.Env.map(v=>{const i=v.indexOf('=');return [v.slice(0,i),v.slice(i+1)];}));
 const uri=new URL(vars.PGRST_DB_URI);uri.pathname='/'+database;vars.PGRST_DB_URI=uri.toString();
 const secret=crypto.randomBytes(48).toString('hex');vars.PGRST_JWT_SECRET=secret;vars.PGRST_DB_SCHEMAS='public';vars.PGRST_SERVER_PORT='3000';
 const file=path.join(env.privateDir,'rest-test.private.env');privateEnvFile=file;fs.writeFileSync(file,Object.entries(vars).map(([k,v])=>{assert.ok(!/[\r\n]/.test(v));return k+'='+v;}).join('\n')+'\n');
 container=database.replaceAll('_','-')+'-rest';
 docker(['run','-d','--pull=never','--name',container,'--label','pawpal.access.owner='+env.marker,'--network',Object.keys(source.NetworkSettings.Networks)[0],'-p','127.0.0.1::3000','--env-file',file,source.Config.Image]);
 const info=JSON.parse(docker(['inspect',container]))[0],binding=info.NetworkSettings.Ports['3000/tcp'][0];assert.equal(binding.HostIp,'127.0.0.1');
 const base='http://127.0.0.1:'+binding.HostPort;
 for(let i=0;i<30;i++){try{const r=await fetch(base+'/',{signal:AbortSignal.timeout(1000)});if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 const token=who=>jwt.sign({sub:who,role:'authenticated',aud:'authenticated'},secret,{expiresIn:'15m'});
 async function request(who,route,body,method=body===undefined?'GET':'POST'){
  const r=await fetch(base+route,{method,headers:{Authorization:'Bearer '+token(who),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(5000)});
  return {status:r.status,body:await r.json()};
 }
 const pass=name=>{report.checks.push({name,status:'PASS'});console.log('PASS '+name);};
 let r=await request(id(1),'/rpc/get_staff_workspace',{p_kind:'self'});assert.equal(r.status,200);assert.equal(r.body.items[0].id,id(1));pass('Valid signed STAFF JWT reaches only its own profile projection');
 r=await request(id(3),'/rpc/get_staff_login_context',{});assert.equal(r.status,200);assert.deepEqual(r.body.staff.access_roles,['ADMIN']);pass('ADMIN JWT retains its administrative context');
 for(const table of ['staff','payment','refund_transaction','product_variant','audit_log']){r=await request(id(1),'/'+table+'?select=*&limit=10');assert.equal(r.status,200);assert.deepEqual(r.body,[]);}pass('Raw table HTTP reads do not expose staff, money, cost or audit data');
 r=await request(id(1),'/rpc/set_admin_staff_access',{p_request_id:id(80),p_staff_id:id(1),p_expected_updated_at:new Date().toISOString(),p_roles:['ADMIN'],p_permissions:[],p_reason:'QA'});assert.equal(r.status,403);pass('Direct RPC cannot promote STAFF to ADMIN');
 r=await request(id(1),'/rpc/admin_copilot_extended_facts',{p_intent:'revenue.summary',p_filters:{start_at:'2026-11-01T00:00:00+07:00',end_at:'2026-11-02T00:00:00+07:00'}});assert.equal(r.status,403);pass('Legacy chatbot revenue RPC is inaccessible to STAFF');
 r=await request(id(4),'/rpc/get_staff_workspace',{p_kind:'self'});assert.equal(r.status,403);pass('Blocked database account is denied even with a valid unexpired JWT');
 r=await request(id(1),'/rpc/get_staff_workspace',{p_kind:'self',p_page:0});assert.equal(r.status,400);pass('Invalid pagination returns a validation error');
 const invalid=await fetch(base+'/rpc/get_staff_workspace',{method:'POST',headers:{Authorization:'Bearer '+jwt.sign({sub:id(3),role:'authenticated'},'different-test-secret'),'Content-Type':'application/json'},body:JSON.stringify({p_kind:'self'})});assert.equal(invalid.status,401);pass('Forged signature is rejected by PostgREST before RPC execution');
 const anon=await fetch(base+'/staff_schedule?select=*&limit=1');assert.equal(anon.status,401);pass('Anonymous HTTP requests cannot read raw staff schedules');
 // Synthetic rows exist only in this disposable HTTP database, removed after the test.
 sql(fs.readFileSync(path.join(env.privateDir,'business-fixture.sql'),'utf8'));
 try{
  r=await request(id(1),'/rpc/get_staff_workspace',{p_kind:'appointments'});assert.equal(r.status,200);assert.deepEqual(r.body.items.map(i=>i.id),[id(20)]);
  r=await request(id(1),'/rpc/get_staff_workspace',{p_kind:'messages',p_id:id(31)});assert.equal(r.status,403);pass('JWT reads and cross-assignee transcript requests enforce actual database scope');
  r=await request(id(1),'/rpc/get_admin_service_cashier',{p_appointment_id:id(20)});assert.equal(r.status,200);assert.equal(r.body.remaining,100000);pass('Scoped service cashier remains usable through the real RPC gateway');
  r=await request(id(1),'/rpc/post_admin_service_money',{p_request_id:id(81),p_appointment_id:id(20),p_expected_state:r.body.version,p_action:'refund',p_details:{}});assert.equal(r.status,403);pass('Direct HTTP refund attempt is rejected before financial mutation');
  sql(`INSERT INTO auth.users(id,aud,role,email) VALUES('${id(90)}','authenticated','authenticated','access-customer@example.invalid'); UPDATE public.customer SET auth_user_id='${id(90)}' WHERE id='${id(10)}';`);
  r=await request(id(90),'/customer?select=id&limit=10');assert.equal(r.status,200);assert.deepEqual(r.body.map(row=>row.id),[id(10)]);
  r=await request(id(90),'/rpc/get_staff_workspace',{p_kind:'self'});assert.equal(r.status,403);pass('Customer own-row access survives while staff workspace remains forbidden');
  r=await request(id(90),'/rpc/own_booking_availability',{p_details:{pet_id:id(11),service_id:id(16),scheduled_start_at:'2030-01-01T08:00:00+07:00'}});
  assert.equal(r.status,200);assert.equal(typeof r.body.available,'boolean');assert.ok(!('staff_schedule' in r.body));pass('Customer availability RPC stays callable without exposing raw schedules');
  const publicServices=await fetch(base+'/service?select=id&limit=1');assert.equal(publicServices.status,200);assert.equal((await publicServices.json()).length,1);pass('Public service catalog still works after the staff boundary');
  const version=idValue=>sql(`SELECT updated_at FROM public.staff WHERE id='${idValue}'`);
  r=await request(id(3),'/rpc/set_admin_staff_access',{p_request_id:id(82),p_staff_id:id(2),p_expected_updated_at:version(id(2)),p_roles:['ADMIN'],p_permissions:[],p_reason:'QA second manager'});assert.equal(r.status,200);
  const [left,right]=await Promise.all([
   request(id(3),'/rpc/set_admin_staff_access',{p_request_id:id(83),p_staff_id:id(2),p_expected_updated_at:version(id(2)),p_roles:['STAFF'],p_permissions:[],p_reason:'QA race'}),
   request(id(2),'/rpc/set_admin_staff_access',{p_request_id:id(84),p_staff_id:id(3),p_expected_updated_at:version(id(3)),p_roles:['STAFF'],p_permissions:[],p_reason:'QA race'})
  ]);
  assert.equal([left,right].filter(v=>v.status===200).length,1);assert.ok([left,right].some(v=>[400,403].includes(v.status)));
  assert.equal(sql("SELECT count(*) FROM public.staff_role WHERE role_code='ADMIN'"),'1');pass('Concurrent manager demotions retain exactly one active ADMIN');
 }finally{
  // Business fixtures live only in this disposable database. Its marker is retained for local review.
 }
 report.status='PASS';
}catch(e){report.error={name:e.name,message:String(e.message).slice(0,400)};console.error(report.error);process.exitCode=1;}
finally{if(container){try{const info=JSON.parse(docker(['inspect',container]))[0];if(info.Config.Labels['pawpal.access.owner']===env.marker)docker(['rm','-f',container]);}catch{}}
 try{if(sql("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()")===marker){runSQL('postgres',`DROP DATABASE ${database};`);report.disposableDatabaseRemoved=true;}}catch{report.disposableDatabaseRemoved=false;}
 if(privateEnvFile&&path.dirname(privateEnvFile)===env.privateDir&&fs.existsSync(privateEnvFile))fs.unlinkSync(privateEnvFile);
 fs.writeFileSync(folder+'/http-results.txt',JSON.stringify(report,null,2)+'\n');}})();
