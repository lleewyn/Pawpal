const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture({failAuth=false,failRpc=false,foreign=false}={}){
 const calls=[],events=[];
 const db={auth:{getUser:async()=>({})},rpc:async(name,args)=>{calls.push({name,args});return {data:name==='own_wishlist_snapshot'?{customer_id:foreign?'other':'owner',productIds:[],serviceIds:[]}:args.p_saved,error:failRpc?Error('Rejected'):null};}};
 const context={window:{getSupabaseClient:()=>db},document:{dispatchEvent:event=>events.push(event)},CustomEvent:class{},wishlistIntents:new Map(),resolveCustomerId:async()=>{if(failAuth)throw Error('Denied');return 'owner';}};
 const source=fs.readFileSync('scripts/api/api.js','utf8');vm.runInNewContext('globalThis.api={'+source.slice(source.indexOf('    async getUserWishlist('),source.indexOf('    async getUserById('))+'};',context);
 return {api:context.api,calls,events};
}
test('explicit save and remove pass authenticated owner and desired state to RPC',async()=>{const f=fixture();await f.api.setWishlistItem('owner','item',false,true);await f.api.setWishlistItem('owner','item',true,false);assert.deepEqual(JSON.parse(JSON.stringify(f.calls)),[{name:'set_own_wishlist_item',args:{p_kind:'product',p_item:'item',p_saved:true,p_expected_owner:'owner'}},{name:'set_own_wishlist_item',args:{p_kind:'service',p_item:'item',p_saved:false,p_expected_owner:'owner'}}]);assert.equal(f.events.length,2);});
test('failed auth makes no mutation',async()=>{const f=fixture({failAuth:true});await assert.rejects(f.api.setWishlistItem('owner','item',false,true));assert.equal(f.calls.length,0);});
test('failed RPC never publishes success',async()=>{const f=fixture({failRpc:true});await assert.rejects(f.api.setWishlistItem('owner','item',false,true));assert.equal(f.events.length,0);});
test('snapshot for another owner is rejected',async()=>{const f=fixture({foreign:true});await assert.rejects(f.api.getUserWishlist('owner'));});
