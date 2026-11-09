'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
test('service thumbnails authenticate hidden images, bound concurrency and retry denied reads',async()=>{
    const {createServiceMediaReader}=await import('../shared/service-media-reader.mjs');
    let session=null,calls=0,active=0,peak=0,denied=true;
    const reader=createServiceMediaReader({db:{auth:{getSession:async()=>({data:{session}})}},fetchImpl:async(url,options)=>{
        calls++;assert.equal(options.headers.Authorization,'Bearer '+session.access_token);
        peak=Math.max(peak,++active);await new Promise(resolve=>setTimeout(resolve,3));active--;
        if(denied&&url.endsWith('000001'))return new Response('',{status:404});
        return new Response(new Blob(['fixture'],{type:'image/png'}));
    }});
    const services=[{images:Array.from({length:5},(_,i)=>({media_asset_id:'11111111-1111-4111-8111-'+String(i+1).padStart(12,'0')}))}];
    await reader.hydrate(services);assert.equal(calls,0);
    session={user:{id:'admin-one'},access_token:'isolated-token'};
    await reader.hydrate(services);assert.equal(peak,3);assert.equal(services[0].images[0].resolved_url,'');assert.match(services[0].images[1].resolved_url,/^blob:/);
    denied=false;await reader.hydrate(services);assert.equal(calls,6);assert.match(services[0].images[0].resolved_url,/^blob:/);
    session={user:{id:'admin-two'},access_token:'other-isolated-token'};await reader.hydrate(services);assert.equal(calls,11);
    reader.clear();
});
