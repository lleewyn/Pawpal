// A detail already present on the current page must refresh its payments and history.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 const source=fs.readFileSync('pages/admin/modules/orders/orders.js','utf8');
 const start=source.indexOf('    let ordersReadVersion = 0;'),end=source.indexOf('    window.PawpalOrders.fetchProductsData = fetchProductsData;',start);
 const old={id:'ORD-A',rawId:'id-a',paymentStatus:'unpaid',collected:0},fresh={...old,paymentStatus:'paid',collected:100};let histories=0,renders=0;
 const state={orders:[old],pageOrders:[old],selectedOrderId:'ORD-A'};
 const window={getSupabaseClient:()=>({rpc:async()=>({data:{ids:['id-a'],page:1},error:null})}),PawpalOrders:{state,controllers:{},renderOrderDetail:()=>renders++},PawpalOrderV1:{cached:async(k,f)=>f(),orders:async()=>[fresh],history:async()=>{histories++;return [{title:'Collected'}];}}};
 const context={window,sessionStorage:{getItem:()=>null},console,Set,Map};vm.createContext(context);
 vm.runInContext('let currentOrdersList=[];'+source.slice(start,end)+'window.run=fetchOrdersData;',context);
 await window.run({force:true,render:false});assert.equal(state.orders[0].collected,100);assert.equal(state.orders[0].paymentStatus,'paid');assert.equal(histories,1);assert.equal(state.orders[0].timeline[0].title,'Collected');assert.equal(renders,1);
 await window.PawpalOrders.ensureOrder('ORD-A');assert.equal(histories,1);
 await window.run({force:true,render:false});assert.equal(histories,2);
 console.log('PASS current-page detail refreshes committed payment and scoped history; cached reopening makes no duplicate history read.');
})().catch(e=>{console.error(e);process.exitCode=1;});
