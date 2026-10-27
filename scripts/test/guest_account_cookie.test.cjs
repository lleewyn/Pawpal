const {test}=require('node:test'),assert=require('node:assert/strict');
const {createGuestCommerce}=require('../api/guest_commerce'),{normalizeVietnamPhone}=require('../shared/phone-normalization.cjs'),{phoneLocal}=require('../api/customer_auth');
const {createGuestAccountLink}=require('../api/guest_account_link');
test('Automatic link discovery uses only matching cookie context, skips absent/other-phone sessions and fails closed on DB errors',async()=>{
 const secret='cookie-test-secret-with-at-least-32-characters',origins=['https://pawpal.test'];let fail=false,calls=0;
 const admin={rpc:async()=>{calls++;return fail?{error:{message:'private'}}:{data:{initialized:true,contact:{phone:'0912345678'}}};}};
 const handler=createGuestCommerce({admin,secret,origins,production:true,limit:async()=>{}}),res={headers:{},setHeader(k,v){this.headers[k]=v;},json(){},status(){return this;}};
 await handler({method:'POST',headers:{origin:origins[0],'content-type':'application/json'},body:{}},res,'session');const cookie=res.headers['Set-Cookie'].split(';')[0],linker=createGuestAccountLink({admin,secret,origins,production:true});
 assert.equal(await linker.discover({headers:{origin:origins[0]}},'0912345678'),null);assert.equal(calls,0);
 assert.equal(await linker.discover({headers:{origin:origins[0],cookie}},'0999999999'),null);assert.match((await linker.discover({headers:{origin:origins[0],cookie}},'0912345678')).hash,/^[a-f0-9]{64}$/);
 await assert.rejects(()=>linker.discover({headers:{origin:'https://evil.invalid',cookie}},'0912345678'));fail=true;await assert.rejects(()=>linker.discover({headers:{origin:origins[0],cookie}},'0912345678'),e=>!e.message.includes('private'));
});
test('Auth and commerce normalize identical phone formats and reject garbage',()=>{
 for(const text of ['0912345678','+84 912 345 678','0084-912-345-678','84912345678','(091) 234.5678']){assert.equal(normalizeVietnamPhone(text),'0912345678');assert.equal(phoneLocal(text),'0912345678');}
 for(const text of ['abc0912345678','0912345678 ext2','+1 912345678','09123',912345678]){assert.throws(()=>normalizeVietnamPhone(text));assert.throws(()=>phoneLocal(text));}
});
test('Account proof uses same signed cookie, requires Origin and never returns raw token',async()=>{
 const handler=createGuestCommerce({admin:{},secret:'cookie-test-secret-with-at-least-32-characters',origins:['https://pawpal.test'],production:true,limit:async()=>{}});
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},json(v){this.body=v;return this;},status(){return this;}};
 await handler({method:'POST',headers:{origin:'https://pawpal.test','content-type':'application/json'},body:{}},res,'session');
 const cookie=res.headers['Set-Cookie'].split(';')[0];const proof=handler.prepareAccountLink({headers:{origin:'https://pawpal.test',cookie}});assert.match(proof.hash,/^[a-f0-9]{64}$/);assert.equal(proof.value,undefined);
 assert.throws(()=>handler.prepareAccountLink({headers:{origin:'https://other.invalid',cookie}}));assert.throws(()=>handler.prepareAccountLink({headers:{origin:'https://pawpal.test',cookie:cookie+'x'}}));handler.clearAccountCookie(res);assert.match(res.headers['Set-Cookie'],/Max-Age=0/);
});
test('Account linker reports expired cookie and cross-profile conflict without leaking internal details',async()=>{
 const linker=createGuestAccountLink({admin:{rpc:async()=>({error:{code:'PT409',message:'private database details'}})},secret:'cookie-test-secret-with-at-least-32-characters',origins:['https://pawpal.test'],production:true});
 assert.throws(()=>linker.prepare({headers:{origin:'https://pawpal.test',cookie:'__Host-pawpal_guest=invalid'}}),/Phiên khách vãng lai/);
 await assert.rejects(()=>linker.complete({hash:'a'.repeat(64)},{authId:'fixture',phone:'0912345678',name:'Test'}),error=>error.message.includes('đối soát')&&!error.message.includes('private'));
});
