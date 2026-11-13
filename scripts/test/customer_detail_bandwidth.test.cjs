const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('detail queries filter both owner and exact record; empty data skips all enrichment RPCs',async()=>{
 const reads=[];
 const db={from(table){const info={table,filters:[]};const q={select(){return q;},order(){return q;},eq(key,value){info.filters.push([key,value]);return q;},then(resolve){reads.push(info);return Promise.resolve({data:[]}).then(resolve);}};return q;},rpc(){throw Error('Unnecessary enrichment');}};
 const ctx=vm.createContext({window:{getSupabaseClient:()=>db},console,resolveAuthenticatedCustomerId:async(_db,user)=>user.id});
 const code=fs.readFileSync('scripts/api/api.js','utf8').replace(/^import .*;\r?$/gm,'').replace('export const API =','const API =');
 vm.runInContext(code+'\nglobalThis.API=API;',ctx);
 const uuid='11111111-1111-4111-8111-111111111111';
 await ctx.API.getUserOrders({id:'owner'},{id:'ORD-123'});
 await ctx.API.getUserOrders({id:'owner'},{id:uuid});
 await ctx.API.getUserBookings({id:'owner'},{id:'APP-123'});
 await ctx.API.getUserBookings({id:'owner'},{id:uuid});
 assert.deepEqual(reads.map(r=>r.filters),[
  [['customer_id','owner'],['order_code','ORD-123']],[['customer_id','owner'],['id',uuid]],
  [['customer_id','owner'],['appointment_code','APP-123']],[['customer_id','owner'],['id',uuid]]
 ]);
});
