const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture({error=null,rows=[],taxonomy=false}={}){
 const calls=[];let writes=0;
 const db={async rpc(name,args){calls.push([name,args]);return {data:args.p_id,error};},from(table){const q={select(){return q;},order(){return q;},eq(k,v){calls.push([k,v]);return q;},update(){writes++;return q;},single(){return q;},then(resolve){const data=taxonomy?(table==='pet_species'?[{id:'species',species_name:'Chó',is_active:true}]:[{id:'breed',species_id:'species',breed_name:'Known breed',is_active:true}]):rows;return Promise.resolve({data,error}).then(resolve);}};return q;}};
 const context={console,crypto:require('node:crypto').webcrypto,localStorage:{getItem(k){return k==='pawpal_current_user'?JSON.stringify({id:'11111111-1111-4111-8111-111111111111',name:'Fixture'}):JSON.stringify([{name:'Cached ghost'}]);},setItem(){throw Error('Unexpected business cache write');}},window:{SupabaseClient:db}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('scripts/api/petService.js','utf8').replace(/^import .*$/gm,'').replace(/^export /gm,''),context);
 return {context,calls,get writes(){return writes;}};
}
test('empty Cloud result never resurrects cached pets',async()=>{
 const f=fixture();assert.equal((await vm.runInContext('getPets()',f.context)).length,0);assert.equal(f.writes,0);
});
test('Cloud read error is reported instead of falling back to cached pets',async()=>{
 const f=fixture({error:new Error('Read denied')});await assert.rejects(vm.runInContext('getPets()',f.context),/Read denied/);
});
test('archive and restore reject database errors and always scope to current owner',async()=>{
 for(const action of ['deletePet','restorePet']){
  const f=fixture({error:new Error('Write denied')});await assert.rejects(vm.runInContext(`${action}('PET-TEST')`,f.context),/Write denied/);
  assert.ok(f.calls.some(([k,v])=>k==='customer_id'&&v==='11111111-1111-4111-8111-111111111111'));
 }
});
test('archive requires an actual returned row',async()=>{
 const f=fixture({rows:null});await assert.rejects(vm.runInContext("deletePet('PET-TEST')",f.context));
});
test('another customer ID cannot drive a pet lookup',async()=>{
 const f=fixture();await assert.rejects(vm.runInContext("getPets('foreign-customer')",f.context));assert.equal(f.calls.length,0);
});
test('inactive status written by Admin appears archived in the customer portal',async()=>{
 const f=fixture({rows:[{id:'pet-1',pet_name:'Fixture',status:'inactive',pet_weight_history:[]}]});
 const pets=await vm.runInContext('getPets()',f.context);assert.equal(pets[0].isArchived,true);
});
test('pet save delegates profile and weight to one RPC with original revision',async()=>{
 const f=fixture({taxonomy:true});
 await vm.runInContext("savePets([{name:'Fixture',species:'dog',breed:'Known breed',weight:5,_supabaseId:'pet-id',_updatedAt:'original'}])",f.context);
 const call=f.calls.find(([name])=>name==='save_own_pet');assert.equal(call[1].p_expected,'original');assert.equal(call[1].p_weight,5);assert.equal(f.writes,0);
});
test('unknown breed is rejected instead of silently choosing another breed',async()=>{
 const f=fixture({taxonomy:true});await assert.rejects(vm.runInContext("savePets([{name:'Fixture',species:'dog',breed:'Unknown breed',weight:5}])",f.context));
 assert.ok(!f.calls.some(([name])=>name==='save_own_pet'));
});
