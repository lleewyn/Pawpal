const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const tick=()=>new Promise(setImmediate);
function fixture(){
 let owner='A',reads=0,hold=null,removed=0,writes=0,writeResult={data:1},writeHold=null;const events={},channels=[],timers=new Map();let seq=0;
 const db={rpc:async(name,args)=>{if(name==='mark_own_notifications_read'){writes++;db.lastWrite=args;if(writeHold){const wait=writeHold;writeHold=null;await wait;}return writeResult;}reads++;const captured=owner;if(hold){const wait=hold;hold=null;await wait;}return {data:{customer_id:captured,rows:[{id:captured,read_at:null}],snapshot_at:'2026-10-26T00:00:00Z'}};},channel(){const ch={on(_type,filter,callback){this.filter=filter;this.event=callback;return this;},subscribe(callback){this.status=callback;return this;}};channels.push(ch);return ch;},removeChannel(){removed++;}};
 const document={visibilityState:'visible',querySelector:()=>null,getElementById:()=>null,dispatchEvent(){},addEventListener(k,fn){events[k]=fn;}};
 const context={document,window:{getSupabaseClient:()=>db,addEventListener(k,fn){events[k]=fn;}},localStorage:{getItem:()=>JSON.stringify({id:owner})},crypto:{randomUUID:()=>String(seq++)},CustomEvent:class{},setTimeout(fn){const id=++seq;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
 const source=fs.readFileSync('components/header/header.js','utf8');
 vm.runInNewContext(source.slice(0,source.indexOf('    let cartBadgeRevision'))+'\nfunction renderNoticeModal(){};window.testMark=markNoticeRead;window.testRefresh=refreshNotices;window.testRows=()=>noticeState.rows;})();',context);
 return {mark:id=>context.window.testMark(id),writes:()=>writes,lastWrite:()=>db.lastWrite,writeResult:r=>writeResult=r,holdWrite(){let release;writeHold=new Promise(r=>release=r);return release;},context,events,channels,document,reads:()=>reads,removed:()=>removed,owner(value){owner=value;},hold(){let release;hold=new Promise(r=>release=r);return release;},async flush(){const jobs=[...timers.values()];timers.clear();await Promise.all(jobs.map(fn=>fn()));await tick();},refresh:()=>context.window.testRefresh(),rows:()=>context.window.testRows()};
}
test('notification events coalesce, hidden tab defers, reconnect refreshes once',async()=>{
 const f=fixture();await f.refresh();assert.equal(f.reads(),1);assert.equal(f.channels[0].filter.filter,'customer_id=eq.A');
 for(let i=0;i<10;i++)f.channels[0].event();await f.flush();assert.equal(f.reads(),2);
 f.document.visibilityState='hidden';f.channels[0].event();await f.flush();assert.equal(f.reads(),2);
 f.document.visibilityState='visible';f.events.visibilitychange();await f.flush();assert.equal(f.reads(),3);
 f.channels[0].status('SUBSCRIBED');await f.flush();assert.equal(f.reads(),3);
 f.channels[0].status('SUBSCRIBED');await f.flush();assert.equal(f.reads(),4);
 await f.flush();assert.equal(f.reads(),4);
});
test('notification event during pending read gets one follow-up',async()=>{
 const f=fixture();await f.refresh();const release=f.hold(),pending=f.refresh();f.channels[0].event();const scheduled=f.flush();release();await pending;await scheduled;await f.flush();assert.equal(f.reads(),3);
});
test('account changes reject stale response including A to B to A',async()=>{
 const f=fixture();await f.refresh();const release=f.hold(),pending=f.refresh();
 f.owner('B');f.events.auth_state_changed();await tick();assert.equal(f.rows()[0].id,'B');
 f.owner('A');f.events.auth_state_changed();await tick();const count=f.channels.length;
 release();await pending;assert.equal(f.channels.length,count);assert.equal(f.rows()[0].id,'A');assert.ok(f.removed()>=2);
});
test('pagehide cancels scheduled reads and pageshow restores subscription',async()=>{
 const f=fixture();await f.refresh();f.channels[0].event();f.events.pagehide();await f.flush();assert.equal(f.reads(),1);assert.equal(f.removed(),1);
 f.events.pageshow({persisted:true});await tick();assert.equal(f.reads(),2);assert.equal(f.channels.length,2);
});
test('mark read waits for acknowledgement, coalesces double click and sends snapshot cutoff',async()=>{
 const f=fixture();await f.refresh();const release=f.holdWrite(),a=f.mark(null),b=f.mark(null);
 assert.equal(f.writes(),1);assert.equal(f.reads(),1);assert.equal(f.rows()[0].read_at,null);
 assert.equal(f.lastWrite().p_expected_owner,'A');assert.equal(f.lastWrite().p_before,'2026-10-26T00:00:00Z');
 release();await Promise.all([a,b]);assert.equal(f.reads(),2);
});
test('failed or malformed mark acknowledgement preserves unread and allows retry',async()=>{
 const f=fixture();await f.refresh();
 for(const result of [{error:Error('offline')},{data:null},{data:-1}]){f.writeResult(result);await assert.rejects(f.mark('A'));assert.equal(f.rows()[0].read_at,null);}
 assert.equal(f.reads(),1);f.writeResult({data:0});await f.mark('A');assert.equal(f.reads(),2);
});
test('mark response from old actor never refreshes new account',async()=>{
 const f=fixture();await f.refresh();const release=f.holdWrite(),pending=f.mark('A');f.owner('B');f.events.auth_state_changed();await tick();const reads=f.reads();release();await pending;assert.equal(f.reads(),reads);assert.equal(f.rows()[0].id,'B');
});
test('mark after an older read forces a fresh snapshot after acknowledgement',async()=>{
 const f=fixture();await f.refresh();const release=f.hold(),old=f.refresh(),write=f.mark('A');await tick();assert.equal(f.reads(),2);release();await Promise.all([old,write]);assert.equal(f.reads(),3);
});
