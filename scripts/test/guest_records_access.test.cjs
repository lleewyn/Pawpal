const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createCustomerAuth}=require('../api/customer_auth');
function fixture({token='owner-token',owner='owner',target='owner',status='active'}={}){
 const reads=[];const admin={rpc:async()=>({data:true}),auth:{getUser:async t=>t==='owner-token'?{data:{user:{id:'auth-owner'}}}:{error:Error('invalid')}},from(table){reads.push(table);const q={select(){return q},eq(){return q},limit(){return q},order:async()=>({data:[],error:null}),maybeSingle:async()=>({data:table==='customer_phone'?{customer_id:target}:table==='customer'?{id:reads.filter(t=>t==='customer').length===1?owner:target,customer_status:status,auth_user_id:'auth-owner'}:null})};return q;}};
 const api=createCustomerAuth({admin,store:{limit:async()=>{}},clientFactory:()=>({})});
 return {reads,async run(){const res={code:200,setHeader(){},status(c){this.code=c;return this},json(body){this.body=body;return this}};await api.guestRecords({ip:'test',headers:{authorization:token?'Bearer '+token:''},body:{phone:'0951234567'}},res);return res;}};
}
test('phone-only and fake bearer cannot read transaction tables',async()=>{for(const token of ['', 'fake']){const f=fixture({token}),r=await f.run();assert.equal(r.code,401);assert.ok(!f.reads.includes('appointment')&&!f.reads.includes('sales_order'));}});
test('another phone owner and locked account cannot read transaction tables',async()=>{for(const params of [{target:'other'},{status:'locked'}]){const f=fixture(params),r=await f.run();assert.equal(r.code,403);assert.ok(!f.reads.includes('appointment')&&!f.reads.includes('sales_order'));}});
test('verified active owner can read only their history',async()=>{const f=fixture(),r=await f.run();assert.equal(r.code,200);assert.deepEqual(r.body,{success:true,bookings:[],orders:[]});assert.ok(f.reads.includes('appointment')&&f.reads.includes('sales_order'));});
test('frontend does not fall back to phone queries after a denied response',async()=>{
 const s=fs.readFileSync('pages/public/return-guest/return-guest.js','utf8'),start=s.indexOf('async function loadSupabaseGuestResults('),end=s.indexOf('\nfunction mapSupabaseOrderRow',start);let sent;
 const context={window:{getSupabaseClient:()=>({auth:{getSession:async()=>({data:{session:null}})},from(){throw Error('Direct DB fallback forbidden');}})},normalizePhone:p=>p,fetch:async(_url,options)=>{sent=options;return{ok:false,json:async()=>({success:false,message:'Verification required'})}}};vm.createContext(context);vm.runInContext(s.slice(start,end)+'\nthis.load=loadSupabaseGuestResults;',context);await assert.rejects(context.load('0951234567'),/Verification required/);assert.equal(sent.headers.Authorization,undefined);
});
