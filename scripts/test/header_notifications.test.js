const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(count,{fail=false}={}){
 const badge={style:{},textContent:''};let owner='owner',removed=0;const values=new Map([['pawpal_current_user',JSON.stringify({id:owner})],['pawpal_notifications',JSON.stringify([{id:'POISON'}])]]);
 const channel={on(){return this;},subscribe(){return this;}};
 const db={rpc:async()=>({data:{customer_id:owner,snapshot_at:new Date().toISOString(),rows:Array.from({length:owner==='owner'?count:1},(_,i)=>({id:owner+i,title:'Notice',content:'Body',sent_at:new Date().toISOString(),read_at:null}))},error:fail?Error('Rejected'):null}),channel:()=>channel,removeChannel(){removed++;}};
 const context={crypto:{randomUUID:()=> 'test'},CustomEvent:class{},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},document:{readyState:'loading',querySelector:()=>null,addEventListener(){},dispatchEvent(){},getElementById:id=>id==='notificationBadge'?badge:null},window:{addEventListener(){},getSupabaseClient:()=>db}};
 vm.runInNewContext(fs.readFileSync('components/header/header.js','utf8'),context);
 return {badge,async update(){context.window.updateNotificationBadge();await new Promise(setImmediate);},switch(){owner='other';values.set('pawpal_current_user',JSON.stringify({id:owner}));},removed:()=>removed};
}
for(const count of [0,3,9,10,12])test('Cloud unread badge '+count,async()=>{const f=fixture(count);await f.update();assert.equal(f.badge.textContent,count>9?'9+':String(count));assert.equal(f.badge.style.display,count?'flex':'none');});
test('failed Cloud read never imports browser notifications',async()=>{const f=fixture(3,{fail:true});await f.update();assert.equal(f.badge.style.display,'none');});
test('account change clears previous count and replaces subscription',async()=>{const f=fixture(5);await f.update();f.switch();await f.update();assert.equal(f.badge.textContent,'1');assert.equal(f.removed(),1);});
