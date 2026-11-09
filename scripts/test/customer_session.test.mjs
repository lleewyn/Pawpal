import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyCustomerSession} from '../shared/customer-session.mjs';
const stores=user=>{
 const make=()=>{const data=new Map([['pawpal_current_user',JSON.stringify(user)],['pawpal_admin_supabase_auth','admin-session']]);return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};
 return {storage:make(),tabStorage:make()};
};
test('cached profile without a real session is cleared in both stores, preserving admin auth',async()=>{
 const saved=stores({id:'old',auth_user_id:'old-auth'});
 const client={auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>assert.fail('no user request without session')}};
 assert.equal(await verifyCustomerSession(client,saved),null);
 for(const store of Object.values(saved)){assert.equal(store.getItem('pawpal_current_user'),null);assert.equal(store.getItem('pawpal_admin_supabase_auth'),'admin-session');}
});
test('a refreshed and server-verified session is retained; simultaneous consumers share verification',async()=>{
 const saved=stores({id:'customer',auth_user_id:'auth'});let requests=0;
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'auth'}}}}),getUser:async()=>{requests++;return {data:{user:{id:'auth'}}};}}};
 const users=await Promise.all([verifyCustomerSession(client,saved),verifyCustomerSession(client,saved)]);
 assert.equal(requests,1);assert.equal(users[0].id,'auth');assert.ok(saved.storage.getItem('pawpal_current_user'));
});
test('a rejected token clears stale identity; a temporary network failure retains recoverable identity',async()=>{
 for(const [error,cleared]of [[{name:'AuthApiError',status:401},true],[{name:'AuthRetryableFetchError',status:503},false]]){
  const saved=stores({id:'customer'}),client={auth:{getSession:async()=>({data:{session:{}}}),getUser:async()=>({error})}};
  if(cleared)assert.equal(await verifyCustomerSession(client,saved),null);else await assert.rejects(verifyCustomerSession(client,saved),value=>value===error);
  assert.equal(saved.storage.getItem('pawpal_current_user')===null,cleared);
 }
});
test('temporary guest profiles and a newer account are not cleared by an old verification',async()=>{
 const guest=stores({id:'guest',is_temporary:true});
 await verifyCustomerSession({auth:{getSession:async()=>({data:{session:null}})}},guest);
 assert.ok(guest.storage.getItem('pawpal_current_user'));
 const saved=stores({id:'old'});let release;
 const check=verifyCustomerSession({auth:{getSession:()=>new Promise(resolve=>release=resolve)}},saved);
 for(const store of Object.values(saved))store.setItem('pawpal_current_user','{"id":"new"}');
 release({data:{session:null}});await check;
 for(const store of Object.values(saved))assert.equal(store.getItem('pawpal_current_user'),'{"id":"new"}');
});
