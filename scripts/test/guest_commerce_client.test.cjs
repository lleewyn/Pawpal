const {test}=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../shared/guest-commerce-client.mjs');
const id='12345678-1234-4123-8123-123456789012';
const response=(data={success:true},status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
function serialLocks(){let tail=Promise.resolve();return {request(_name,fn){const operation=tail.then(fn);tail=operation.catch(()=>{});return operation;}};}

test('Import/client creation is lazy; parallel reads bootstrap once and never send credentials in headers',async()=>{
 const {createGuestCommerceClient}=await load(),calls=[];
 const client=createGuestCommerceClient({locks:serialLocks(),fetcher:async(url,options)=>{calls.push({url,options});return response();}});
 assert.equal(calls.length,0);
 await Promise.all([client.request('context',{page:1}),client.request('context',{page:2})]);
 assert.equal(calls.filter(v=>v.url.endsWith('/session')).length,1);assert.equal(calls.length,3);
 for(const call of calls){assert.equal(call.options.credentials,'same-origin');assert.equal(call.options.cache,'no-store');assert.deepEqual(call.options.headers,{'Content-Type':'application/json'});}
 await client.ensureSession();assert.equal(calls.length,3);
});

test('Two tab clients share the browser lock and cannot mint their first cookie concurrently',async()=>{
 const {createGuestCommerceClient}=await load(),locks=serialLocks();let active=0,max=0,issued=false;
 const fetcher=async(url)=>{if(url.endsWith('/session')){active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));issued=true;active--;}return response();};
 const a=createGuestCommerceClient({locks,fetcher}),b=createGuestCommerceClient({locks,fetcher});
 await Promise.all([a.ensureSession(),b.ensureSession()]);assert.equal(issued,true);assert.equal(max,1);
});

test('Double click shares a mutation, snapshots its payload and rejects changed input under the same ID',async()=>{
 const {createGuestCommerceClient}=await load(),calls=[];let release;
 const client=createGuestCommerceClient({locks:serialLocks(),fetcher:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});if(url.endsWith('/order-create'))await new Promise(r=>release=r);return response();}});
 await client.ensureSession();
 const payload={requestId:id,details:{note:'Original'}},first=client.request('order-create',payload),second=client.request('order-create',payload);
 assert.equal(first,second);payload.details.note='Edited';
 await assert.rejects(client.request('order-create',payload),error=>error.status===409);
 while(!release)await new Promise(r=>setImmediate(r));release();await first;
 assert.equal(calls.filter(v=>v.url.endsWith('/order-create')).length,1);assert.equal(calls.at(-1).body.details.note,'Original');
});

test('Timeout marks mutation uncertain, aborts transport and never retries or invents a new ID',async()=>{
 const {createGuestCommerceClient}=await load();let writes=0,signal;
 const client=createGuestCommerceClient({locks:serialLocks(),timeoutMs:20,fetcher:async(url,options)=>{if(url.endsWith('/session'))return response();writes++;signal=options.signal;return new Promise(()=>{});}});
 await assert.rejects(client.request('booking-create',{requestId:id}),error=>error.uncertain===true);
 assert.equal(writes,1);assert.equal(signal.aborted,true);
});

test('Invalid session stops the mutation and is not silently replaced during that request',async()=>{
 const {createGuestCommerceClient}=await load(),calls=[];let invalid=false;
 const client=createGuestCommerceClient({locks:serialLocks(),fetcher:async(url)=>{calls.push(url);return invalid?response({success:false,message:'Expired'},401):response();}});
 await client.ensureSession();invalid=true;
 await assert.rejects(client.request('order-create',{requestId:id}),error=>error.status===401&&error.message==='Expired');
 assert.equal(calls.length,2);assert.equal(calls.filter(v=>v.endsWith('/session')).length,1);
});

test('Member state is checked again after queued bootstrap; guest dispatch cannot downgrade a member',async()=>{
 const {createGuestCommerceClient}=await load();let member=false,calls=0,release;
 const locks={request(_key,fn){return new Promise(resolve=>release=()=>resolve(fn()));}};
 const client=createGuestCommerceClient({locks,hasMember:()=>member,fetcher:async()=>{calls++;return response();}});
 const pending=client.request('context');member=true;release();
 await assert.rejects(pending,error=>error.status===409);assert.equal(calls,0);
});

test('Malformed response and network interruption never report a successful order',async()=>{
 const {createGuestCommerceClient}=await load();
 for(const failure of [async()=>{throw Error('offline');},async()=>({ok:true,status:200,json:async()=>{throw Error('bad JSON');}})]){
  const client=createGuestCommerceClient({locks:serialLocks(),fetcher:async(url)=>url.endsWith('/session')?response():failure()});
  await assert.rejects(client.request('order-create',{requestId:id}),error=>error.uncertain===true);
 }
});

test('Login while a mutation is in flight discards its UI result and preserves uncertainty',async()=>{
 const {createGuestCommerceClient}=await load();let member=false,release;
 const client=createGuestCommerceClient({locks:serialLocks(),hasMember:()=>member,fetcher:async(url)=>{if(url.endsWith('/session'))return response();await new Promise(resolve=>release=resolve);return response();}});
 const pending=client.request('order-create',{requestId:id});while(!release)await new Promise(resolve=>setImmediate(resolve));
 member=true;release();await assert.rejects(pending,error=>error.status===409&&error.uncertain===true);
});

test('Unsupported coordination, invalid action and missing request ID fail before any network traffic',async()=>{
 const {createGuestCommerceClient}=await load();let calls=0;
 const client=createGuestCommerceClient({locks:null,fetcher:async()=>{calls++;return response();}});
 await assert.rejects(client.ensureSession(),/trình duyệt/);
 await assert.rejects(client.request('../other'),error=>error.status===400);
 await assert.rejects(client.request('pets',{}),error=>error.status===400);assert.equal(calls,0);
});

test('Ending never bootstraps and clears readiness even when the server rejects the expired cookie',async()=>{
 const {createGuestCommerceClient}=await load(),calls=[];
 const client=createGuestCommerceClient({locks:serialLocks(),fetcher:async(url)=>{calls.push(url);return response({success:false,message:'Expired'},401);}});
 await assert.rejects(client.end(),error=>error.status===401);assert.deepEqual(calls,['/api/customer/guest/end']);
});
test('Account generation invalidation rejects a late mutation after a full member-to-guest round trip',async()=>{
 const {createGuestCommerceClient}=await load();let release,writes=0;
 const client=createGuestCommerceClient({locks:serialLocks(),hasMember:()=>false,fetcher:async(url)=>{if(url.endsWith('/session'))return response();writes++;await new Promise(resolve=>release=resolve);return response();}});
 const pending=client.request('order-create',{requestId:id});while(!release)await new Promise(resolve=>setImmediate(resolve));
 client.invalidate();client.invalidate();release();await assert.rejects(pending,error=>error.uncertain===true&&error.status===401);assert.equal(writes,1);
});
