const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createHandler}=require('../../api/admin-chat.js');
async function invoke({busy=false,rate=false,sourceError=false,saveError=false,replay=false,question='Có bao nhiêu SKU dưới ngưỡng?'}={}){
 const events=[],lease=randomUUID(),staff=randomUUID(),sessionId=randomUUID();
 const permissions=['admin_copilot_history.read','admin_copilot_history.write','inventory.read','product_variant.read','product.read'];
 const caller={rpc:async(name,args)=>{events.push(name);if(name==='acquire_admin_chat_read')return busy||rate?{error:{code:'PT429',message:rate?'chat_read_rate_limited':'chat_read_busy'}}:{data:lease};
  if(name==='release_admin_chat_read'){assert.equal(args.p_lease,lease);return {data:null};}
  assert.equal(name,'run_admin_chat_read');assert.equal(args.p_lease,lease);return sourceError?{error:{code:'57014'}}:{data:{intent:'inventory.low_stock',items:[],total:0,scope:{},as_of:new Date().toISOString()}};}};
 const service={from(){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:replay?{staff_id:staff,session_id:sessionId,content:question}:null}),single:async()=>({data:{content:'saved'}})};return q;},rpc:async()=>{events.push('save');return saveError?{error:{code:'58000'}}:{data:'saved'};}};
 const handler=createHandler({verify:async()=>({authorized:true,staff:{id:staff,permissions},user:{id:randomUUID()},caller}),serviceClient:service,generateReply:()=>{throw Error('No model');}});
 const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};
 await handler({method:'POST',headers:{},body:{sessionId,requestId:randomUUID(),question}},res);return {res,events};
}
test('default API acquires shared lease, uses wrapper and releases after save',async()=>{const r=await invoke();assert.equal(r.res.statusCode,200);assert.deepEqual(r.events,['acquire_admin_chat_read','run_admin_chat_read','save','release_admin_chat_read']);});
test('busy shared admission returns 429 without source, model or save',async()=>{const r=await invoke({busy:true});assert.equal(r.res.statusCode,429);assert.deepEqual(r.events,['acquire_admin_chat_read']);});
test('shared rate exhaustion returns explicit minute limit and Retry-After without source or save',async()=>{const r=await invoke({rate:true});assert.equal(r.res.statusCode,429);assert.equal(r.res.headers['Retry-After'],'60');assert.ok(r.res.data.error.includes('một phút'));assert.deepEqual(r.events,['acquire_admin_chat_read']);});
test('lightweight new questions also enter shared admission, while consuming zero business source reads',async()=>{const r=await invoke({question:'Bạn làm được gì?'});assert.equal(r.res.statusCode,200);assert.deepEqual(r.events,['acquire_admin_chat_read','save','release_admin_chat_read']);});
test('source and persistence failures release lease; replay does not reacquire or read sources',async()=>{
 for(const params of [{sourceError:true},{saveError:true}]){const r=await invoke(params);assert.ok(r.res.statusCode>=500);assert.equal(r.events.at(-1),'release_admin_chat_read');}
 const r=await invoke({replay:true});assert.equal(r.res.statusCode,200);assert.deepEqual(r.events,[]);
});
