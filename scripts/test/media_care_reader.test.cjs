'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const asset=index=>({id:String(index),media_asset_id:'10000000-0000-0000-0000-'+String(index).padStart(12,'0'),media_url:null});
test('private care reader authenticates, bounds parallel reads and releases temporary URLs',async()=>{
 const {createCareMediaReader}=await import('../shared/care-media-reader.mjs');let running=0,max=0,created=0;const revoked=[];
 const reader=createCareMediaReader({auth:{getSession:async()=>({data:{session:{access_token:'test-token'}}})}},{urlApi:{createObjectURL:()=>`blob:test-${++created}`,revokeObjectURL:url=>revoked.push(url)},fetchImpl:async(url,options)=>{
  assert.equal(options.headers.Authorization,'Bearer test-token');assert.equal(options.cache,'no-store');running++;max=Math.max(max,running);await new Promise(resolve=>setTimeout(resolve,2));running--;return {ok:true,blob:async()=>new Blob(['image'])};
 }});
 const rows=await reader.read(Array.from({length:7},(_,i)=>asset(i+1)));assert.equal(rows.length,7);assert.equal(max,3);assert.equal(created,7);assert.equal(revoked.length,0);
 const legacy=await reader.read([{id:'legacy',media_url:'/assets/old.png'}]);assert.equal(legacy[0].resolved_url,'/assets/old.png');assert.equal(revoked.length,7);
 reader.clear();
});
test('private care reader never fetches without a session and does not expose denied files',async()=>{
 const {createCareMediaReader}=await import('../shared/care-media-reader.mjs');let fetched=0;
 const denied=createCareMediaReader({auth:{getSession:async()=>({data:{session:null}})}},{fetchImpl:async()=>{fetched++;}});
 await assert.rejects(()=>denied.read([asset(1)]),/care_media_auth_required/);assert.equal(fetched,0);
 const reader=createCareMediaReader({auth:{getSession:async()=>({data:{session:{access_token:'token'}}})}},{fetchImpl:async()=>({ok:false})});
 const result=await reader.read([asset(1)]);assert.equal(result[0].resolved_url,'');
});
