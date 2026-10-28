const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../../api/admin-chat.js');
const permissions=['inventory.read','product_variant.read','product.read','admin_copilot_history.write'];
async function invoke({allow=true,error,oversized=false}={}){let sources=0,saves=0,models=0;
 const handler=createHandler({readAdmission:{acquire:async()=>null,release:async()=>{}},verify:async()=>({authorized:true,staff:{id:'staff',permissions:allow?permissions:['admin_copilot_history.write']},user:{id:'actor'},caller:{rpc:async()=>{sources++;return error?{error}:{data:{intent:'inventory.low_stock',total:0,items:[],scope:{},as_of:'2026-10-28T00:00:00Z',padding:oversized?'x'.repeat(33000):''}};}}}),serviceClient:{from(){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null})};return q;},rpc:async()=>{saves++;return {data:'saved'};}},generateReply:async()=>{models++;throw Error('no model');}});
 const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};
 await handler({method:'POST',headers:{},body:{requestId:'10000000-0000-4000-8000-000000000001',sessionId:'20000000-0000-4000-8000-000000000002',question:'Có bao nhiêu SKU dưới ngưỡng?'}},res);return {res,sources,saves,models};
}
test('missing business permission returns 403 without business query or saved fake history',async()=>{const r=await invoke({allow:false});assert.equal(r.res.statusCode,403);assert.equal(r.sources,0);assert.equal(r.saves,0);});
test('source byte budget failure returns 422 with narrower-scope guidance, no AI or saved exchange',async()=>{const r=await invoke({oversized:true});assert.equal(r.res.statusCode,422);assert.ok(r.res.body.error.includes('thu hẹp'));assert.equal(r.saves,0);assert.equal(r.models,0);});
test('cancelled/expired source returns 504 rather than false zero and saves nothing',async()=>{const r=await invoke({error:{code:'57014'}});assert.equal(r.res.statusCode,504);assert.equal(r.saves,0);assert.equal(r.models,0);});
