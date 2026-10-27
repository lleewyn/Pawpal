const {test}=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../shared/guest-checkout-preferences.mjs');
const a='12345678-1234-4123-8123-123456789012',b='22345678-1234-4123-8123-123456789012';
function memory(){const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}
test('Checkout preference survives reload with only voucher and cart scope, no contact/prices',async()=>{
 const m=await load(),storage=memory(),scope={mode:'cart',lines:[{variant_id:a,quantity:2}],phone:'private',address:'private',price:1};m.writeGuestCheckoutPreferences(storage,scope,' PUBLIC ');assert.deepEqual(m.readGuestCheckoutPreferences(storage,scope),{voucherCode:'PUBLIC'});const raw=storage.getItem(m.GUEST_CHECKOUT_PREFERENCES);assert.equal(raw.includes('private'),false);assert.equal(raw.includes('price'),false);
});
test('Changed quantities and buy-now mode cannot inherit a different checkout voucher',async()=>{
 const m=await load(),storage=memory(),scope={mode:'cart',lines:[{variant_id:a,quantity:2}]};m.writeGuestCheckoutPreferences(storage,scope,'PUBLIC');assert.equal(m.readGuestCheckoutPreferences(storage,{...scope,mode:'buynow'}),null);assert.equal(m.readGuestCheckoutPreferences(storage,{...scope,lines:[{variant_id:a,quantity:3}]}),null);assert.equal(m.readGuestCheckoutPreferences(storage,{...scope,lines:[{variant_id:b,quantity:2}]}),null);
});
test('Equivalent line order restores coupon; confirmed cleanup never clears another scope',async()=>{
 const m=await load(),storage=memory(),scope={mode:'cart',lines:[{variant_id:a,quantity:2},{variant_id:b,quantity:1}]};m.writeGuestCheckoutPreferences(storage,scope,'PUBLIC');assert.ok(m.readGuestCheckoutPreferences(storage,{...scope,lines:[...scope.lines].reverse()}));m.clearGuestCheckoutPreferences(storage,{...scope,mode:'buynow'});assert.ok(m.readGuestCheckoutPreferences(storage,scope));m.clearGuestCheckoutPreferences(storage,scope);assert.equal(storage.getItem(m.GUEST_CHECKOUT_PREFERENCES),null);
});
test('Damaged or blocked preference storage does not restore an unverified coupon',async()=>{
 const m=await load(),storage=memory(),scope={mode:'cart',lines:[{variant_id:a,quantity:1}]};storage.setItem(m.GUEST_CHECKOUT_PREFERENCES,'bad');assert.equal(m.readGuestCheckoutPreferences(storage,scope),null);assert.equal(storage.getItem(m.GUEST_CHECKOUT_PREFERENCES),'bad');assert.equal(m.readGuestCheckoutPreferences({getItem(){throw Error('blocked');}},scope),null);assert.throws(()=>m.writeGuestCheckoutPreferences({setItem(){throw Error('blocked');}},scope,'PUBLIC'),/Chưa lưu/);
});
