const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture({error=null,rows=[],taxonomy=false}={}){
 const calls=[];let writes=0;
 const db={async rpc(name,args){calls.push([name,args]);return {data:args.p_id,error};},from(table){const q={select(){return q;},order(k,options){calls.push(['order',{k,...options}]);return q;},limit(n,options){calls.push(['limit',{n,...options}]);return q;},eq(k,v){calls.push([k,v]);return q;},update(){writes++;return q;},single(){return q;},then(resolve){const data=taxonomy?(table==='pet_species'?[{id:'species',species_name:'Chó',is_active:true}]:[{id:'breed',species_id:'species',breed_name:'Known breed',is_active:true}]):rows;return Promise.resolve({data,error}).then(resolve);}};return q;}};
 const context={console,crypto:require('node:crypto').webcrypto,petArchiveDeadline:time=>time?new Date(time).getTime()+30*86400000:null,resolveCustomerPetImages:async()=>{},uploadCustomerPetImage:async(db,file,id,kind)=>{calls.push(['image-upload',{id,kind}]);return kind+'-asset';},localStorage:{getItem(k){return k==='pawpal_current_user'?JSON.stringify({id:'11111111-1111-4111-8111-111111111111',name:'Fixture'}):JSON.stringify([{name:'Cached ghost'}]);},setItem(){throw Error('Unexpected business cache write');}},window:{SupabaseClient:db}};
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
test('custom breed is passed with its selected species for transactional validation',async()=>{
 const f=fixture({taxonomy:true});await vm.runInContext("savePets([{name:'Fixture',species:'dog',breed:'Custom breed',weight:5}])",f.context);
 const args=f.calls.find(([name])=>name==='save_own_pet')[1];assert.equal(args.p_values.breed_name,'Custom breed');assert.equal(args.p_values.species_name,'Chó');assert.equal(args.p_values.breed_id,undefined);
});
test('both selected files are uploaded and their asset IDs are saved with the same pending pet ID',async()=>{
 const f=fixture({taxonomy:true});await vm.runInContext("savePets([{name:'Fixture',species:'dog',breed:'Custom breed',weight:4.5,_pendingId:'pending-pet',avatarFile:{},vaccineFile:{}}])",f.context);
 const args=f.calls.find(([name])=>name==='save_own_pet')[1];assert.equal(args.p_id,'pending-pet');assert.equal(args.p_values.avatar_media_asset_id,'avatar-asset');assert.equal(args.p_values.vaccine_media_asset_id,'vaccine-asset');
 assert.deepEqual(f.calls.filter(([name])=>name==='image-upload').map(([,args])=>args.id),['pending-pet','pending-pet']);
});
test('reading a saved pet maps both persisted image references into view/edit fields',async()=>{
 const f=fixture({rows:[{id:'pet',pet_name:'Miu Miu',avatar_media_asset_id:'avatar',vaccine_media_asset_id:'vaccine',resolved_avatar_url:'blob:avatar',resolved_vaccine_url:'blob:vaccine',vaccination_recorded:true,pet_weight_history:[]}]});
 const [pet]=await vm.runInContext('getPets()',f.context);assert.equal(pet.avatar,'blob:avatar');assert.equal(pet.vaccineCardPhoto,'blob:vaccine');assert.equal(pet.vaccinated,true);
});

test('pet list requests only the three newest weight rows per pet',async()=>{
 const f=fixture();await vm.runInContext('getPets()',f.context);
 assert.ok(f.calls.some(([k,v])=>k==='limit'&&v.n===3&&v.referencedTable==='pet_weight_history'));
 const order=f.calls.filter(([k,v])=>k==='order'&&v.referencedTable==='pet_weight_history').map(([,v])=>v.k);
 assert.deepEqual(order,['measured_at','created_at','id']);
});

test('admin safety note stays independent from allergy when reading and saving',async()=>{
 const read=fixture({rows:[{id:'pet-1',pet_name:'Fixture',safety_note:'Do not handle roughly',allergy:'Food allergy',pet_weight_history:[]}]});
 const pets=await vm.runInContext('getPets()',read.context);assert.equal(pets[0].safetyNote,'Do not handle roughly');
 const save=fixture({taxonomy:true});
 await vm.runInContext("savePets([{name:'Fixture',species:'dog',breed:'Known breed',weight:5,safetyNote:'Do not handle roughly',alert:'Allergy display',allergies:'New allergy'}])",save.context);
 const call=save.calls.find(([name])=>name==='save_own_pet');assert.equal(call[1].p_values.safety_note,'Do not handle roughly');assert.equal(call[1].p_values.allergy,'New allergy');
});

test('installed Supabase client encodes the nested history limit without extra requests',async()=>{
 const {createClient}=require('@supabase/supabase-js');const urls=[];
 const db=createClient('https://offline.invalid','offline-public-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async url=>{urls.push(new URL(String(url)));return new Response('[]',{headers:{'Content-Type':'application/json'}});}}});
 const f=fixture();f.context.window.SupabaseClient=db;await vm.runInContext('getPets()',f.context);
 assert.equal(urls.length,1);assert.equal(urls[0].searchParams.get('pet_weight_history.limit'),'3');
 assert.equal(urls[0].searchParams.get('pet_weight_history.order'),'measured_at.desc,created_at.desc,id.desc');
 assert.equal(urls[0].searchParams.get('customer_id'),'eq.11111111-1111-4111-8111-111111111111');
});

test('pet response from the previous actor is rejected before returning rows',async()=>{
 const f=fixture();let finish;
 f.context.window.SupabaseClient={from(){const q={select(){return q;},eq(){return q;},order(){return q;},limit(){return q;},then(resolve){finish=()=>resolve({data:[],error:null});}};return q;}};
 const pending=vm.runInContext('getPets()',f.context);await new Promise(r=>setImmediate(r));assert.ok(finish);
 f.context.localStorage.getItem=()=>JSON.stringify({id:'other-owner'});finish();await assert.rejects(pending,/Phiên đăng nhập đã thay đổi/);
});
