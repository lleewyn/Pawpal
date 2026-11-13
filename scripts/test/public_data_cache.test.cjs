const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('scripts/shared/data-loader.js','utf8');
function harness(storage=new Map()) {
    let now=100000, calls=0, fail=false;
    const chain={select(){return this;},in(){return this;},eq(){return this;},order(){return this;},limit(){return this;},
        then(resolve){calls++;return Promise.resolve({data:[{id:'published'}],error:fail?Error('offline'):null}).then(resolve);}};
    const db={from:()=>chain};
    const context=vm.createContext({console:{log(){}},location:{origin:'https://pawpal.test'},Date:{now:()=>now},
        sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
        window:{SupabaseClientConfig:{url:'https://one.supabase.co'},getSupabaseClient:()=>db}});
    vm.runInContext(source,context);
    return {context,storage,api:context.window.DataLoader,calls:()=>calls,advance:ms=>now+=ms,fail:value=>fail=value};
}
test('concurrent reads, repeated navigation and reload reuse one published snapshot',async()=>{
    const h=harness();
    const rows=await Promise.all(Array.from({length:8},()=>h.api.loadHomeBanners()));
    assert.equal(h.calls(),1);rows[0][0].id='mutated';
    assert.equal((await h.api.loadHomeBanners())[0].id,'published');assert.equal(h.calls(),1);
    const reloaded=harness(h.storage);await reloaded.api.loadHomeBanners();assert.equal(reloaded.calls(),0);
    h.advance(30001);await h.api.loadHomeBanners();assert.equal(h.calls(),2);
});
test('expired snapshots do not hide failures and retry is not poisoned',async()=>{
    const h=harness();await h.api.loadHomeBanners();h.advance(30001);h.fail(true);
    await assert.rejects(h.api.loadHomeBanners(),/offline/);h.fail(false);
    await h.api.loadHomeBanners();assert.equal(h.calls(),3);
});
test('cache scopes projects and separates data groups with their own expiry',async()=>{
    const h=harness();await h.api.loadHomeBanners();await h.api.loadMembershipTiers();assert.equal(h.calls(),2);
    h.advance(31000);await h.api.loadMembershipTiers();assert.equal(h.calls(),2);
    h.context.window.SupabaseClientConfig.url='https://two.supabase.co';await h.api.loadHomeBanners();assert.equal(h.calls(),3);
    h.advance(120001);await h.api.loadMembershipTiers();assert.equal(h.calls(),4);
});
test('storage denial still permits deduplicated reads',async()=>{
    const h=harness();h.context.sessionStorage={getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}};
    await Promise.all([h.api.loadHomeBanners(),h.api.loadHomeBanners()]);assert.equal(h.calls(),1);
});
test('service RPC POST reads are deduplicated without changing mutation APIs',async()=>{
    const h=harness();let reads=0;
    h.context.window.getSupabaseClient=()=>({rpc:async name=>{assert.equal(name,'public_service_directory');reads++;return {data:[]};}});
    await Promise.all([h.api.loadServices(),h.api.loadServices(),h.api.loadServices()]);assert.equal(reads,1);
    h.advance(60001);await h.api.loadServices();assert.equal(reads,2);
});
test('home text-only reviews skip all review image metadata reads',async()=>{
    const h=harness();
    h.context.window.getSupabaseClient=()=>({rpc:async()=>({data:[{id:'review',rating:5,review_content:'Good'}]}),from(){throw Error('Unexpected image read');}});
    const rows=await h.api.getServiceReviews('service',{includeImages:false});
    assert.equal(rows[0].text,'Good');assert.equal(rows[0].images.length,0);
});
