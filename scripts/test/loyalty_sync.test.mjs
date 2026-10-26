import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLoyaltySync} from '../shared/loyalty-sync.mjs';
function fixture(){
 let owner='A',hidden=false,calls=0,hold=null,result={customer_id:'A'},rendered=[],errors=[];const timers=new Map();let id=0;
 const sync=createLoyaltySync({owner:()=>owner,hidden:()=>hidden,load:async()=>{calls++;if(hold){const wait=hold;hold=null;await wait;}if(result instanceof Error)throw result;return result;},apply:data=>rendered.push(data),fail:error=>errors.push(error),setTimer:fn=>{timers.set(++id,fn);return id;},clearTimer:id=>timers.delete(id)});
 return {sync,calls:()=>calls,rendered,errors,setOwner:v=>owner=v,setHidden:v=>hidden=v,result:v=>result=v,hold(){let release;hold=new Promise(r=>release=r);return release;},async flush(){const jobs=[...timers.values()];timers.clear();await Promise.all(jobs.map(fn=>fn()));}};
}
test('loyalty coalesces parallel reads and event bursts without polling',async()=>{
 const f=fixture(),release=f.hold(),reads=Array.from({length:10},()=>f.sync.refresh());assert.equal(f.calls(),1);release();await Promise.all(reads);
 for(let i=0;i<10;i++)f.sync.schedule();await f.flush();assert.equal(f.calls(),2);await f.flush();assert.equal(f.calls(),2);
});
test('hidden tab waits for visibility and events during read get one follow-up',async()=>{
 const f=fixture();f.setHidden(true);f.sync.schedule();await f.flush();assert.equal(f.calls(),0);f.setHidden(false);f.sync.visible();await f.flush();assert.equal(f.calls(),1);
 const release=f.hold(),read=f.sync.refresh();f.sync.schedule();const job=f.flush();release();await Promise.all([read,job]);await f.flush();assert.equal(f.calls(),3);
});
test('wrong snapshot owner and load failure never render data',async()=>{
 const f=fixture();f.result({customer_id:'B'});await f.sync.refresh();assert.equal(f.rendered.length,0);assert.equal(f.errors.length,1);f.result(Error('offline'));await f.sync.refresh();assert.equal(f.rendered.length,0);assert.equal(f.errors.length,2);
});
test('dispose and owner change invalidate pending result and timers',async()=>{
 for(const action of ['dispose','owner']){const f=fixture(),release=f.hold(),read=f.sync.refresh();f.sync.schedule();if(action==='dispose')f.sync.dispose();else f.setOwner('B');release();await read;await f.flush();assert.equal(f.rendered.length,0);assert.equal(f.calls(),1);}
});
