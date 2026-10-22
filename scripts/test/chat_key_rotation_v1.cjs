const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{execFileSync}=require('node:child_process');
const {service,admin,ok,browserPage}=require('./customer_completion_helpers.cjs');
const {createGenerator}=require('../../api/admin-chat.js');
const db=sql=>execFileSync('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d','pawpal_customers_3daa55e18acd','-v','ON_ERROR_STOP=1','-At'],{input:sql,encoding:'utf8'}).trim();
(async()=>{
 const {browser}=await browserPage();const ids=[randomUUID(),randomUUID()],secrets=ids.map(x=>'test-key-'+x);
 try{
  assert.equal((await ok(service.rpc('get_ai_key_pool_state'))).configured,false,'Isolated key pool must be empty');
  db(`INSERT INTO pawpal_private.ai_api_key(id,label,api_key) VALUES('${ids[0]}','Rotation test A','${secrets[0]}'),('${ids[1]}','Rotation test B','${secrets[1]}');`);
  const claimed=await Promise.all([service.rpc('claim_ai_api_key',{p_exclude:[]}),service.rpc('claim_ai_api_key',{p_exclude:[]})]);claimed.forEach(r=>assert.ifError(r.error));
  assert.equal(new Set(claimed.map(r=>r.data[0].id)).size,2);
  assert.equal((await ok(service.rpc('claim_ai_api_key',{p_exclude:[]}))).length,0);
  for(const r of claimed)await ok(service.rpc('finish_ai_api_key',{p_id:r.data[0].id,p_lease:r.data[0].lease_id,p_outcome:'success',p_retry_seconds:60}));
  assert.equal((await admin.rpc('get_ai_key_pool_state')).error.code,'42501');
  assert.equal((await admin.rpc('claim_ai_api_key',{p_exclude:[]})).error.code,'42501');
  let calls=0,limited;
  const generate=createGenerator({serviceClient:service,environmentKey:()=>{throw Error('Must not bypass configured pool');},request:async key=>{calls++;if(calls===1){limited=ids[secrets.indexOf(key)];throw Object.assign(Error('Provider details must never escape'),{status:429,errorDetails:[{retryDelay:'120s'}]});}return 'Verified rotated response';}});
  assert.equal(await generate('Question',{},[]),'Verified rotated response');assert.equal(calls,2);
  assert.equal(db(`SELECT last_outcome||':'||(cooldown_until>now())::text FROM pawpal_private.ai_api_key WHERE id='${limited}'`),'rate_limited:true');
  const remaining=ids.find(id=>id!==limited);
  const invalid=createGenerator({serviceClient:service,environmentKey:()=>{throw Error('No environment bypass');},request:async()=>{throw Object.assign(Error('Do not expose key'),{status:403});}});
  await assert.rejects(invalid('Question',{},[]),/ai_key_pool_exhausted/);
  assert.equal(db(`SELECT is_active::text FROM pawpal_private.ai_api_key WHERE id='${remaining}'`),'false');
  let fallbackCalls=0;const blocked=createGenerator({serviceClient:service,environmentKey:()=>{fallbackCalls++;return 'unused';},request:async()=>{throw Error('Must not request cooled keys');}});
  await assert.rejects(blocked('Question',{},[]),/ai_key_pool_exhausted/);assert.equal(fallbackCalls,0);
  db(`DELETE FROM pawpal_private.ai_api_key WHERE id IN ('${ids[0]}','${ids[1]}');`);
  const fallback=createGenerator({serviceClient:service,environmentKey:()=> 'test-environment-key',request:async()=> 'Environment fallback'});
  assert.equal(await fallback('Question',{},[]),'Environment fallback');
  console.log('PASS private-only RPC grants, concurrent distinct leases, 429 cooldown/failover, invalid-key disable, no cooldown bypass and empty-pool environment fallback.');
 }finally{db(`DELETE FROM pawpal_private.ai_api_key WHERE id IN ('${ids[0]}','${ids[1]}');`);await browser.close();}
})().catch(error=>{console.error(error.name+': '+error.message);process.exitCode=1;});
