const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const tick=()=>new Promise(r=>setImmediate(r));
function harness(fetchImpl){
 let fetcher;
 const window={fetch:fetchImpl,location:{pathname:'/admin/'},__PAWPAL_SUPABASE_CONFIG__:{url:'https://test.supabase.co',anonKey:'test'},
  supabase:{createClient(_url,_key,options){fetcher=options.global.fetch;return {};}}};
 vm.runInNewContext(fs.readFileSync('scripts/api/supabase-client.js','utf8'),{window,Headers,Response,URL,DOMException,setTimeout,console:{log(){},error(){}}});
 return fetcher;
}
test('read bursts use at most four active requests and drain every queued read',async()=>{
 let active=0,max=0,calls=0;const releases=[];
 const fetch=harness(async()=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>releases.push(r));active--;return new Response('[]');});
 const jobs=Array.from({length:11},(_,i)=>fetch('https://test.supabase.co/rest/v1/table?id=eq.'+i));
 await tick();assert.equal(calls,4);
 while(calls<11||active){releases.splice(0).forEach(r=>r());await tick();}
 assert.equal((await Promise.all(jobs)).length,11);assert.equal(max,4);
});
test('read-only RPCs deduplicate by body and actor; writes never deduplicate',async()=>{
 let calls=0;
 const fetch=harness(async()=>{calls++;await tick();return new Response('[]');});
 const url='https://test.supabase.co/rest/v1/rpc/admin_customer_page';
 const options={method:'POST',body:'{"p_page":1}',headers:{Authorization:'Bearer A'}};
 await Promise.all(Array.from({length:10},()=>fetch(url,options)));assert.equal(calls,1);
 await Promise.all([fetch(url,options),fetch(url,{...options,body:'{"p_page":2}'}),fetch(url,{...options,headers:{Authorization:'Bearer B'}})]);assert.equal(calls,4);
 await Promise.all(Array.from({length:6},()=>fetch('https://test.supabase.co/rest/v1/rpc/save_own_customer_avatar',options)));assert.equal(calls,10);
});
test('aborted queued reads never reach Supabase',async()=>{
 const releases=[];let calls=0;
 const fetch=harness(async()=>{calls++;await new Promise(r=>releases.push(r));return new Response('[]');});
 const jobs=Array.from({length:4},(_,i)=>fetch('https://test.supabase.co/rest/v1/t?id='+i));await tick();
 const abort=new AbortController();const queued=fetch('https://test.supabase.co/rest/v1/queued',{signal:abort.signal});
 const rejected=assert.rejects(queued,error=>error.name==='AbortError');abort.abort();await rejected;
 releases.splice(0).forEach(r=>r());await Promise.all(jobs);assert.equal(calls,4);
});
test('read slots stay occupied while response bodies are still downloading',async()=>{
 let calls=0;const bodies=[];
 const fetch=harness(async()=>{calls++;return new Response(new ReadableStream({start(controller){bodies.push(controller);}}));});
 const jobs=Array.from({length:6},(_,i)=>fetch('https://test.supabase.co/rest/v1/stream?id='+i));
 await tick();assert.equal(calls,4);
 bodies.splice(0).forEach(c=>c.close());
 for(let i=0;i<10&&calls<6;i++)await tick();
 assert.equal(calls,6);bodies.splice(0).forEach(c=>c.close());await Promise.all(jobs);
});
