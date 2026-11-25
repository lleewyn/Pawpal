const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');const {settings}=require('../../my-server/scripts/database/v1/cloud_connection.cjs');
const {createGuestPhoneHistory}=require('../../my-server/scripts/api/guest_phone_history');
(async()=>{
 const {config}=settings();const admin=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 // Read real records; OTP challenges are simulated in memory and no database writes are made.
 const challenges=new Map(),store={async limit(){},async issue(c){challenges.set(c.id,{...c,status:'pending'});},async activate(id,ok){challenges.get(id).status=ok?'active':'failed';},async claim(id,mode,hash,claimId){const c=challenges.get(id);if(!c||c.status!=='active'||c.hash!==hash||c.mode!==mode)throw Error('Invalid OTP');c.status='claimed';c.claimId=claimId;return c;},async finish(id,claimId,ok){const c=challenges.get(id);assert.equal(c.claimId,claimId);c.status=ok?'consumed':'active';}};
 const handle=createGuestPhoneHistory({admin:{from:table=>admin.from(table)},secret:crypto.randomBytes(32).toString('hex'),production:false,demo:true,store});
 async function send(body,cookie){const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.statusCode=c;return this;},json(data){this.data=data;return this;}};await handle({body,headers:{origin:'http://localhost:4000',cookie},socket:{remoteAddress:'local-verification'}},res);return res;}
 for(const [phone,bookings,orders] of [['0999999999',0,1],['0988888889',1,0],['0972163376',4,3]]){
  const begin=await send({phone});assert.equal(begin.statusCode,200,begin.data.message);assert.equal(begin.data.bookings,undefined);
  const cookie=begin.headers['Set-Cookie'].split(';')[0],challengeId=begin.data.challengeId;
  assert.equal((await send({phone,challengeId,code:'000000'},cookie)).statusCode,400);
  const verified=await send({phone,challengeId,code:'555666'},cookie);assert.equal(verified.statusCode,200,verified.data.message);
  assert.equal(verified.data.bookings.length,bookings);assert.equal(verified.data.orders.length,orders);
  const grant=verified.data.pagination.grant;
  const refreshed=await send({phone,historyPage:{grant,page:0}});assert.equal(refreshed.statusCode,200,refreshed.data.message);assert.equal(refreshed.data.orders.length,orders);
  assert.equal((await send({phone:'0900000000',historyPage:{grant,page:0}})).statusCode,400);
  assert.equal((await send({phone,challengeId,code:'555666'},cookie)).statusCode,400);
  console.log(`${phone}: PASS OTP required, ${bookings} bookings / ${orders} orders, cross-phone and replay blocked`);
 }
 const member=await send({phone:'0963963963'});assert.equal(member.statusCode,400);assert.ok(member.data.message.includes('đã có tài khoản'));assert.equal(member.data.challengeId,undefined);
 console.log('0963963963: PASS existing member requires login, account preserved');
 console.log('PASS live lookup without changing customer, employee, appointment or order data');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
