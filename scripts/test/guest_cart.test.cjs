const {test}=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../shared/guest-cart.mjs');
const a='12345678-1234-4123-8123-123456789012',b='22345678-1234-4123-8123-123456789012';
test('Switch preserves quantity, merges an existing target and reads latest locked quantities',async()=>{
 const {createGuestCart}=await load(),f=fixture(),one=createGuestCart(f),two=createGuestCart(f);
 await one.add(a,2);await one.switchVariant(a,b,10);assert.deepEqual(one.read(),[{variant_id:b,quantity:2}]);
 await one.add(a,3);await Promise.all([two.add(b,1),one.switchVariant(a,b,6)]);assert.deepEqual(one.read(),[{variant_id:b,quantity:6}]);
});
test('Rejected variant switches preserve storage and unrelated lines',async()=>{
 const {createGuestCart,GUEST_CART_KEY}=await load(),f=fixture(),store=createGuestCart(f);
 await store.replace([{variant_id:a,quantity:2},{variant_id:b,quantity:3}]);const raw=f.values.get(GUEST_CART_KEY);
 for(const args of [[a,b,4],[a,b,0],[a,b,1.5],['bad',b,10],[a,'bad',10]]){await assert.rejects(store.switchVariant(...args));assert.equal(f.values.get(GUEST_CART_KEY),raw);}
 await store.switchVariant(a,a,10);assert.equal(f.values.get(GUEST_CART_KEY),raw);
 await store.set(a,0);const remaining=f.values.get(GUEST_CART_KEY);await assert.rejects(store.switchVariant(a,b,10));assert.equal(f.values.get(GUEST_CART_KEY),remaining);
});
function fixture(){const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};let tail=Promise.resolve();const locks={request(_key,fn){const result=tail.then(fn);tail=result.catch(()=>{});return result;}};return {values,storage,locks};}
test('Guest persistence keeps only variant and quantity, coalesces variants and never writes member cart',async()=>{
 const {createGuestCart,GUEST_CART_KEY}=await load(),f=fixture(),store=createGuestCart(f);
 f.values.set('pawpal_cart','member');await store.replace([{variant_id:a,quantity:1,price:1,name:'forged'},{variant_id:a,quantity:2},{variant_id:b,quantity:1}]);
 assert.deepEqual(store.read(),[{variant_id:a,quantity:3},{variant_id:b,quantity:1}]);assert.equal(f.values.get('pawpal_cart'),'member');assert.equal(f.values.get(GUEST_CART_KEY).includes('forged'),false);
});
test('Two tab stores sharing the lock do not lose simultaneous additions',async()=>{
 const {createGuestCart}=await load(),f=fixture(),one=createGuestCart(f),two=createGuestCart(f);
 await Promise.all([one.add(a,2),two.add(a,3),one.add(b,1)]);assert.deepEqual(one.read(),[{variant_id:a,quantity:5},{variant_id:b,quantity:1}]);
});
test('Invalid/corrupt cart is preserved; quantity/variant validation rejects before write',async()=>{
 const {createGuestCart,GUEST_CART_KEY}=await load(),f=fixture(),store=createGuestCart(f);f.values.set(GUEST_CART_KEY,'broken');
 assert.throws(()=>store.read());await assert.rejects(store.add(a,1));assert.equal(f.values.get(GUEST_CART_KEY),'broken');f.values.delete(GUEST_CART_KEY);
 for(const [id,quantity]of[[a,0],[a,-1],[a,1.5],[a,1000001],['other',1]])await assert.rejects(store.add(id,quantity));assert.equal(f.values.has(GUEST_CART_KEY),false);
});
test('Queued mutation checks member state after acquiring the lock',async()=>{
 const {createGuestCart}=await load(),f=fixture();let member=false,release;
 const store=createGuestCart({...f,mayUse:()=>!member,locks:{request(_key,fn){return new Promise((resolve,reject)=>release=()=>Promise.resolve().then(fn).then(resolve,reject));}}});
 const pending=store.add(a,1);member=true;release();await assert.rejects(pending,/Tài khoản/);assert.equal(f.values.size,0);
});
test('Hydration uses current variant price/images and retains unavailable variants for explicit removal',async()=>{
 const {hydrateGuestCart}=await load(),variant={id:a,price:100,images:['current']},product={id:'product',name:'Current',variants:[variant]};
 const rows=hydrateGuestCart([{variant_id:a,quantity:2,price:1},{variant_id:b,quantity:1}],[product]);assert.equal(rows[0].variant.price,100);assert.equal(rows[0].product.name,'Current');assert.equal(rows[1].available,false);assert.equal(rows[1].variant_id,b);
});
test('Removing one variant keeps the other variant of the same product; clear touches only guest storage',async()=>{
 const {createGuestCart}=await load(),f=fixture(),store=createGuestCart(f);await store.add(a,1);await store.add(b,2);await store.set(a,0);assert.deepEqual(store.read(),[{variant_id:b,quantity:2}]);await store.clear();assert.deepEqual(store.read(),[]);
});
test('Confirmed purchase consumes only purchased quantities, preserving later additions and unselected lines',async()=>{
 const {createGuestCart}=await load(),f=fixture(),store=createGuestCart(f);await store.add(a,2);await store.add(b,3);await store.add(a,1);await store.consume([{variant_id:a,quantity:2}]);assert.deepEqual(store.read(),[{variant_id:a,quantity:1},{variant_id:b,quantity:3}]);
});
test('Legacy canonical catalog UUIDs are valid references even without RFC version bits',async()=>{
 const {normalizeGuestLines}=await load();const id='d0000000-0000-0000-0000-000000000001';assert.deepEqual(normalizeGuestLines([{variant_id:id,quantity:1}]),[{variant_id:id,quantity:1}]);
});
test('A queued guest write cannot resume after login and logout even if current state is guest again',async()=>{
 const {createGuestCart}=await load(),f=fixture();let generation=0,release;
 const store=createGuestCart({...f,generation:()=>generation,locks:{request(_key,fn){return new Promise((resolve,reject)=>release=()=>Promise.resolve().then(fn).then(resolve,reject));}}});
 const pending=store.add(a,1);generation=2;release();await assert.rejects(pending,/Tài khoản/);assert.equal(f.values.size,0);
});
