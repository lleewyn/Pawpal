const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

for(const fail of [false,true])test(fail?'ledger error stops automatic retry and shows error':'empty ledger settles without an infinite render/fetch loop',async()=>{
 const tbody={dataset:{},innerHTML:'',querySelector:()=>null};
 const document={readyState:'loading',addEventListener(){},querySelectorAll:()=>[],getElementById:id=>id==='pawpointHistoryTbody'?tbody:null};
 let queries=0,loads=0;
 const db={from(){return {select(){return this;},order(){return this;},range(){queries++;return Promise.resolve(fail?{error:{message:'test unavailable'}}:{data:[]});}};}};
 const window={addEventListener(){},getSupabaseClient:()=>db,PawpalDataStore:{TTL:{OPERATIONAL:30000},fetch:async(_key,fetcher)=>{
  // A repeated cached empty result used to spin the microtask queue forever.
  if(++loads>3)return new Promise(()=>{});
  return loads===1?fetcher():[];
 }}};
 const context=vm.createContext({window,document,console:{warn(){},error(){},log(){}},sessionStorage:{getItem(){return null;}}});
 for(const file of ['customers.js','subtabs/tab-customer-pawpoint.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../pages/admin/modules/customers',file),'utf8'),context);
 window.PawpalCustomers.state.hasLoadedCustomers=true;
 window.PawpalCustomers.subtabs.pawpoint.renderPawpointHistory();
 await new Promise(resolve=>setImmediate(resolve));
 for(let i=0;i<5;i++)window.PawpalCustomers.subtabs.pawpoint.renderPawpointHistory();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(loads,1,'rendering again must not refetch an already empty or failed ledger');
 assert.equal(queries,1);
 assert.equal(window.PawpalCustomers.state.pawpointLoadStatus,fail?'error':'loaded');
 assert.match(tbody.innerHTML,fail?/Không thể tải/:/Không tìm thấy/);
});
