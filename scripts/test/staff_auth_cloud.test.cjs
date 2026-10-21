const {test}=require('node:test'),assert=require('node:assert/strict');
const handler=require('../../api/staff-auth');
test('Cloud password endpoint rejects incomplete configuration without calling the local bridge',async()=>{
 const names=['PAWPAL_ADMIN_SUPABASE_URL','PAWPAL_ADMIN_SUPABASE_ANON_KEY','PAWPAL_ADMIN_SUPABASE_SERVICE_ROLE_KEY'];
 const before=names.map(k=>process.env[k]),nativeFetch=global.fetch;
 const response=()=>({headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;}});
 let calls=0;global.fetch=async()=>{calls++;throw Error('Unexpected network request');};
 try{
  process.env.PAWPAL_ADMIN_SUPABASE_URL='https://cpzuvaplseielhgcnqrn.supabase.co';delete process.env.PAWPAL_ADMIN_SUPABASE_SERVICE_ROLE_KEY;
  let res=response();await handler({method:'POST',headers:{},body:{password:'test-value'}},res);assert.equal(res.statusCode,401);
  res=response();await handler({method:'POST',headers:{authorization:'Bearer invalid'},body:{password:'short'}},res);assert.equal(res.statusCode,400);
  res=response();await handler({method:'POST',headers:{authorization:'Bearer invalid'},body:{password:'test-value'}},res);assert.equal(res.statusCode,503);
  process.env.PAWPAL_ADMIN_SUPABASE_SERVICE_ROLE_KEY='test.'+Buffer.from(JSON.stringify({role:'anon'})).toString('base64url')+'.signature';
  res=response();await handler({method:'POST',headers:{authorization:'Bearer invalid'},body:{password:'test-value'}},res);assert.equal(res.statusCode,503);
  res=response();await handler({method:'GET',headers:{}},res);assert.equal(res.statusCode,405);
  assert.equal(calls,0);
 }finally{global.fetch=nativeFetch;names.forEach((k,i)=>{if(before[i]===undefined)delete process.env[k];else process.env[k]=before[i];});}
});
