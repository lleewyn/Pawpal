// Real HTTP handler -> PostgreSQL service RPC, all fixtures/DDL rolled back.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),express=require('express');
const {connect}=require('../database/v1/service_import_connection.cjs');
const {createGuestCommerce,normalizePhone}=require('../api/guest_commerce');
const file='scripts/database/v1/113_guest_commerce_api.sql',source=fs.readFileSync(file,'utf8');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const body=source.replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,'');
if(!process.argv.includes('--verify-cloud')){console.log('Use --verify-cloud for HTTP->Cloud SQL rollback verification.');process.exit(0);}
(async()=>{
 const db=await connect();let server,lastRpcError;const checks=[];let queries=0;const q=async(s,a)=>{queries++;return db.query(s,a);},pass=name=>checks.push({name,status:'PASS'});
 try{
  await q("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='2s'");
  const signatures=['public.guest_commerce_context(text,integer)','public.guest_commerce_save_pet(text,timestamptz,uuid,text,text,jsonb)','public.guest_commerce_end(text)'];
  for(const signature of signatures)assert.equal((await q('SELECT to_regprocedure($1)::text value',[signature])).rows[0].value,null,'113 already installed; refuse overwrite');
  await q(body);
  await q('SET LOCAL ROLE anon');await q('SAVEPOINT deny');let code;try{await q('SELECT public.guest_commerce_context($1,1)',['0'.repeat(64)]);}catch(e){code=e.code;}await q('ROLLBACK TO SAVEPOINT deny');assert.equal(code,'42501');await q('RESET ROLE');pass('Anonymous role cannot execute service-only guest RPC');
  await q('SET LOCAL ROLE authenticated');await q('SAVEPOINT deny');code=null;try{await q('SELECT public.guest_commerce_context($1,1)',['0'.repeat(64)]);}catch(e){code=e.code;}await q('ROLLBACK TO SAVEPOINT deny');assert.equal(code,'42501');await q('RESET ROLE');pass('Customer role cannot execute service-only guest RPC');
  const breed=(await q('SELECT id FROM public.pet_breed WHERE is_active ORDER BY id LIMIT 1')).rows[0]?.id;assert.ok(breed);
  const baseline=(await q('SELECT (SELECT count(*)::int FROM public.customer) customers,(SELECT count(*)::int FROM public.pet_profile) pets,(SELECT count(*)::int FROM public.guest_session) sessions')).rows[0];
  await q('SET LOCAL ROLE service_role');
  const mappings={guest_commerce_context:['p_hash','p_page'],guest_commerce_save_pet:['p_hash','p_expires','p_request','p_phone','p_name','p_pet'],guest_commerce_end:['p_hash'],customer_auth_rate_limit:['p_key','p_max','p_window_seconds']};
  const admin={rpc:async(name,args)=>{
   assert.ok(mappings[name]);const keys=mappings[name];await q('SAVEPOINT rpc_call');
   try{const data=(await q(`SELECT public.${name}(${keys.map((_,i)=>'$'+(i+1)).join(',')}) value`,keys.map(k=>args[k]))).rows[0].value;await q('RELEASE SAVEPOINT rpc_call');return {data};}
   catch(e){lastRpcError={code:e.code,message:e.message};await q('ROLLBACK TO SAVEPOINT rpc_call');await q('RELEASE SAVEPOINT rpc_call');return {error:{code:e.code,message:e.message}};}
  }};
  const app=express();app.use(express.json({limit:'20kb'}));server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  // PostgreSQL now() is frozen by the outer rollback transaction. Align the
  // injected application clock with it instead of pretending each RPC committed.
  const origin='http://127.0.0.1:'+server.address().port;let clock=Number((await q('SELECT extract(epoch FROM now())::float8 seconds')).rows[0].seconds)*1000;
  const handler=createGuestCommerce({admin,secret:crypto.randomBytes(32).toString('hex'),origins:[origin],production:true,now:()=>clock});
  app.all('/:action',(req,res)=>handler(req,res,req.params.action));
  const send=async(action,data={},cookie,extra={})=>{const response=await fetch(origin+'/'+action,{method:'POST',headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{}),...extra},body:JSON.stringify(data)});return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')};};
  let result=await send('session');assert.equal(result.status,200);assert.equal(result.data.initialized,false);assert.ok(result.cookie.includes('__Host-pawpal_guest=')&&result.cookie.includes('HttpOnly')&&result.cookie.includes('Secure')&&result.cookie.includes('SameSite=Lax'));const a=result.cookie.split(';')[0];
  assert.equal(JSON.stringify(result.data).includes('token'),false);const noProfiles=(await q('SELECT count(*)::int n FROM public.customer')).rows[0].n;assert.equal(noProfiles,baseline.customers);pass('Bootstrap issues secure HttpOnly cookie, exposes no token, creates no customer');
  result=await send('context',{},a);assert.equal(result.data.initialized,false);pass('Unbound signed session reads empty context without phone lookup');
  const requestA=crypto.randomUUID(),requestB=crypto.randomUUID(),fixture=crypto.randomUUID().slice(0,8);
  const payloadA={requestId:requestA,contact:{name:'Guest API A '+fixture,phone:'0950000001'},pet:{name:'Probe A',breedId:breed,gender:'nam',weight:3.5,allergy:'Thông tin test'}};
  result=await send('pets',payloadA,a);assert.equal(result.status,200,JSON.stringify({response:result.data,rpc:lastRpcError}));assert.equal(result.data.petId,requestA);assert.equal(result.data.created,true);pass('HTTP pet save atomically creates scoped customer, session, pet and weight');
  result=await send('pets',payloadA,a);assert.equal(result.status,200);assert.equal(result.data.created,false);assert.equal((await q('SELECT count(*)::int n FROM public.pet_weight_history WHERE pet_id=$1',[requestA])).rows[0].n,1);pass('Exact HTTP retry keeps Pet ID and one initial weight row');
  result=await send('pets',{...payloadA,pet:{...payloadA.pet,name:'Changed'}},a);assert.equal(result.status,409);pass('Changed payload under same request ID conflicts instead of duplicate pet');
  result=await send('pets',{...payloadA,contact:{...payloadA.contact,phone:'0950000002'}},a);assert.equal(result.status,409);pass('Phone change cannot move the existing session to another customer');
  const b=(await send('session')).cookie.split(';')[0];
  const payloadB={requestId:requestB,contact:{name:'Guest API B '+fixture,phone:'+84 950 000 001'},pet:{name:'Probe B',breedId:breed}};
  result=await send('pets',payloadB,b);assert.equal(result.status,200);
  const owners=(await q('SELECT count(DISTINCT customer_id)::int n FROM public.pet_profile WHERE id=ANY($1::uuid[])',[[requestA,requestB]])).rows[0].n;assert.equal(owners,2);pass('Separate session with identical normalized phone gets isolated profile, no merge');
  result=await send('context',{},a);assert.equal(result.status,200);assert.deepEqual(result.data.pets.map(p=>p.id),[requestA]);assert.equal(result.data.contact.name,payloadA.contact.name);assert.ok(!JSON.stringify(result.data).includes('allergy'));pass('Context returns only own minimal pet data, no other phone-matching profile');
  result=await send('pets',{...payloadB,requestId:requestA},b);assert.equal(result.status,403);assert.equal(result.cookie,null);pass('Known foreign Pet ID denied without clearing valid session cookie');
  const next=crypto.randomUUID();result=await send('pets',{...payloadA,requestId:next,pet:{name:'Probe second A',breedId:breed}},a);assert.equal(result.status,200);assert.equal((await q('SELECT count(*)::int n FROM public.customer')).rows[0].n,baseline.customers+2);pass('New pet in same session reuses customer, preserves distinct Pet IDs');
  result=await send('context',{phone:'0950000001'},b);assert.equal(result.status,400);pass('Context does not accept phone or arbitrary owner lookup input');
  result=await send('context',{page:0},a);assert.equal(result.status,400);pass('Pet pagination rejects invalid bounds');
  result=await send('context',{},undefined);assert.equal(result.status,401);pass('Missing cookie cannot access guest context');
  result=await send('context',{},a.slice(0,-1)+(a.endsWith('A')?'B':'A'));assert.equal(result.status,401);pass('Tampered signed cookie rejected');
  result=await send('context',{},a+'; '+a);assert.equal(result.status,401);pass('Duplicate cookie ambiguity rejected');
  result=await send('context',{},a,{origin:'https://untrusted.invalid'});assert.equal(result.status,403);pass('Cross-origin requests rejected');
  result=await send('context',{},a,{authorization:'Bearer fake'});assert.equal(result.status,409);pass('Bearer request cannot silently downgrade to guest');
  clock+=8*86400000;result=await send('context',{},a);assert.equal(result.status,401);clock-=8*86400000;pass('Expired cookie rejected before private data lookup');
  result=await send('end',{},a);assert.equal(result.status,200);assert.ok(result.cookie.includes('Max-Age=0'));result=await send('context',{},a);assert.equal(result.status,401);pass('End revokes server binding; copied old cookie cannot regain access');
  assert.equal(normalizePhone('0084 950 000 001'),'0950000001');assert.throws(()=>normalizePhone('0950000001 extension2'));pass('Phone normalization accepts supported country forms and rejects text');
  await q('RESET ROLE');
  await q(fs.readFileSync('scripts/database/v1/113_guest_commerce_api_rollback.sql','utf8').replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,''));
  for(const signature of signatures)assert.equal((await q('SELECT to_regprocedure($1)::text value',[signature])).rows[0].value,null);
  assert.equal((await q('SELECT count(*)::int n FROM public.pet_profile WHERE id=ANY($1::uuid[])',[[requestA,requestB,next]])).rows[0].n,3);pass('SQL reverse removes only API definitions and preserves saved pet records');
  await q('ROLLBACK');
  assert.equal((await q('SELECT count(*)::int n FROM public.pet_profile WHERE id=ANY($1::uuid[])',[[requestA,requestB,next]])).rows[0].n,0);
  for(const signature of signatures)assert.equal((await q('SELECT to_regprocedure($1)::text value',[signature])).rows[0].value,null);
  pass('All RPC definitions, sessions, contacts, pets and weights rolled back');
  fs.writeFileSync('docs/verification/sync/guest-commerce-api-rollback.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',migrationSha256:hash(source),handlerSha256:hash(fs.readFileSync('scripts/api/guest_commerce.js','utf8')),queries,checks,scope:'Actual loopback HTTP handler and real Cloud SQL RPC/rate limiter under service_role inside rollback; signed cookie tests, SQL anon/customer roles; no real Auth/REST service request, no concurrency/transaction booking/checkout/UI acceptance, no Logs/SMS'},null,2)+'\n');
  console.log('PASS',checks.length,'checks;',queries,'SQL; HTTP->Cloud RPC fixtures/DDL rolled back.');
 }catch(e){await db.query('RESET ROLE').catch(()=>{});await db.query('ROLLBACK').catch(()=>{});throw e;}
 finally{if(server)await new Promise(resolve=>server.close(resolve));await db.end();}
})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
