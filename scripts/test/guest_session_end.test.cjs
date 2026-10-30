const {test}=require('node:test'),assert=require('node:assert/strict');
const {createGuestCommerce}=require('../api/guest_commerce');
function fixture({fail=false}={}){
 const calls=[];const handle=createGuestCommerce({admin:{async rpc(name,args){calls.push({name,args});return fail?{error:{code:'XX000',message:'private'}}:{data:true}}},secret:'test-secret-with-at-least-32-bytes-long',origins:['https://pawpal.test'],production:true,limit:async()=>{}});
 async function send(action,cookie){const res={code:200,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(data){this.data=data;return this}};await handle({method:'POST',headers:{origin:'https://pawpal.test','content-type':'application/json',cookie},body:{}},res,action);return res;}
 return {send,calls,async cookie(){return (await send('session')).headers['Set-Cookie'].split(';')[0]}};
}
test('ending a missing or invalid guest cookie is idempotent and also clears lookup proof',async()=>{
 for(const cookie of [undefined,'__Host-pawpal_guest=invalid']){const f=fixture(),res=await f.send('end',cookie);assert.equal(res.code,200);assert.equal(res.data.success,true);assert.equal(f.calls.length,0);const cookies=res.headers['Set-Cookie'];assert.equal(cookies.length,2);for(const c of cookies)assert.match(c,/Max-Age=0; Secure/);assert.match(cookies[1],/^__Host-pawpal_lookup=/);}
});
test('ending a valid cookie revokes only its server session and never reads customer context',async()=>{
 const f=fixture(),cookie=await f.cookie(),res=await f.send('end',cookie);assert.equal(res.code,200);assert.deepEqual(f.calls.map(c=>c.name),['guest_commerce_end']);assert.match(f.calls[0].args.p_hash,/^[a-f0-9]{64}$/);
});
test('a database failure still removes browser cookies but does not report cleanup success',async()=>{
 const f=fixture({fail:true}),cookie=await f.cookie(),res=await f.send('end',cookie);assert.equal(res.code,503);assert.equal(res.data.success,false);assert.equal(res.headers['Set-Cookie'].length,2);assert.ok(!res.data.message.includes('private'));
});
