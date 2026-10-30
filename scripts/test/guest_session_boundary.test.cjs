const {test}=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../shared/guest-session-boundary.mjs');
const storage=initial=>{const map=new Map(Object.entries(initial||{}));return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)}};
const response=(success=true)=>({ok:success,json:async()=>({success})});
function locks(){let tail=Promise.resolve();return {request(_key,fn){const next=tail.then(fn);tail=next.catch(()=>{});return next}};}

test('identity boundary clears guest journals synchronously, revokes once and keeps a cross-tab epoch',async()=>{
 const {createGuestSessionBoundary,GUEST_RESET_PENDING,GUEST_IDENTITY_EPOCH}=await load();
 const local=storage(),tab=storage({pawpal_guest_pet_request_v1:'pet',pawpal_guest_booking_request_v1:'booking',pawpal_guest_order_request_v1:'order',pawpal_guest_checkout_selection_v1:'selection',unrelated:'keep'});
 let release,published=0;const sent=[];
 const boundary=createGuestSessionBoundary({storage:local,tabStorage:tab,publish:()=>published++,fetcher:async(url,options)=>{sent.push({url,options});await new Promise(r=>release=r);return response();}});
 const a=boundary.reset(),b=boundary.reset();assert.equal(a,b);assert.equal(published,1);
 for(const key of ['pet','booking','order'])assert.equal(tab.getItem('pawpal_guest_'+key+'_request_v1'),null);
 assert.equal(tab.getItem('pawpal_guest_checkout_selection_v1'),null);assert.equal(tab.getItem('unrelated'),'keep');
 assert.ok(local.getItem(GUEST_RESET_PENDING));assert.equal(local.getItem(GUEST_RESET_PENDING),local.getItem(GUEST_IDENTITY_EPOCH));
 release();await a;assert.equal(local.getItem(GUEST_RESET_PENDING),null);assert.ok(local.getItem(GUEST_IDENTITY_EPOCH));
 assert.equal(sent.length,1);assert.equal(sent[0].url,'/api/customer/guest/end');assert.equal(sent[0].options.credentials,'same-origin');assert.equal(sent[0].options.headers.Authorization,undefined);
});

test('failed cleanup blocks guest bootstrap and retries before a new context can be requested',async()=>{
 const {createGuestSessionBoundary,GUEST_RESET_PENDING}=await load();const {createGuestCommerceClient}=await import('../shared/guest-commerce-client.mjs');
 const local=storage(),events=[];let offline=true;
 const boundary=createGuestSessionBoundary({storage:local,tabStorage:storage(),fetcher:async()=>{events.push('end');if(offline)throw Error('offline');return response();}});
 await assert.rejects(boundary.reset(),/offline/);assert.ok(local.getItem(GUEST_RESET_PENDING));
 const client=createGuestCommerceClient({locks:locks(),ensureBoundary:boundary.ensure,fetcher:async url=>{events.push(url.split('/').at(-1));return response();}});
 await assert.rejects(client.request('context'));assert.deepEqual(events,['end','end']);
 offline=false;await client.request('context');assert.deepEqual(events,['end','end','end','session','context']);assert.equal(local.getItem(GUEST_RESET_PENDING),null);
});

test('cleanup and first-cookie creation across tabs share the same lock',async()=>{
 const {createGuestSessionBoundary}=await load();const {createGuestCommerceClient}=await import('../shared/guest-commerce-client.mjs');
 const local=storage(),shared=locks(),events=[];let release;
 const first=createGuestSessionBoundary({storage:local,tabStorage:storage(),locks:shared,fetcher:async()=>{events.push('end-start');await new Promise(r=>release=r);events.push('end-done');return response();}});
 const pending=first.reset();while(!release)await new Promise(r=>setImmediate(r));
 const second=createGuestSessionBoundary({storage:local,tabStorage:storage(),locks:shared,fetcher:async()=>{events.push('end-second');return response();}});
 const client=createGuestCommerceClient({locks:shared,ensureBoundary:second.ensure,fetcher:async url=>{events.push(url.split('/').at(-1));return response();}});
 const context=client.request('context');await new Promise(r=>setImmediate(r));assert.deepEqual(events,['end-start']);
 release();await Promise.all([pending,context]);assert.ok(events.indexOf('session')>events.indexOf('end-done'));assert.ok(events.indexOf('context')>events.indexOf('end-second'));
});

test('a queued old payload cannot run after the identity changes while cleanup is pending',async()=>{
 const {createGuestCommerceClient}=await import('../shared/guest-commerce-client.mjs');let release,calls=0;
 const client=createGuestCommerceClient({locks:locks(),ensureBoundary:()=>new Promise(r=>release=r),fetcher:async()=>{calls++;return response();}});
 const pending=client.request('pets',{requestId:'11111111-1111-4111-8111-111111111111',contact:{name:'Previous owner'}});
 client.invalidate();release();await assert.rejects(pending,e=>e.status===401);assert.equal(calls,1); // Only the safe empty bootstrap; no old payload.
});

test('cleanup timeout retains the pending boundary instead of serving the old guest cookie',async()=>{
 const {createGuestSessionBoundary,GUEST_RESET_PENDING}=await load();const local=storage();
 const boundary=createGuestSessionBoundary({storage:local,tabStorage:storage(),timeoutMs:5,fetcher:async()=>new Promise(()=>{})});
 await assert.rejects(boundary.reset(),/kết nối/);assert.ok(local.getItem(GUEST_RESET_PENDING));
});
