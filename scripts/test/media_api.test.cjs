'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const sharp = require('sharp');
const { createMediaHandler } = require('../api/media.cjs');
const { readImageUpload, verifyImage, MAX_BODY_BYTES } = require('../api/media_files.cjs');
const actor = '11111111-1111-4111-8111-111111111111';
const session = '22222222-2222-4222-8222-222222222222';
const lease = '33333333-3333-4333-8333-333333333333';
const asset = '44444444-4444-4444-8444-444444444444';
const env = { MEDIA_UPLOAD_ENABLED: 'true', PAWPAL_MEDIA_SUPABASE_URL: 'https://test.supabase.co', PAWPAL_MEDIA_SUPABASE_ANON_KEY: 'anon-test', PAWPAL_MEDIA_SUPABASE_SERVICE_ROLE_KEY: 'service-test' };
function res() { return { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(s) { this.statusCode = s; return this; }, json(v) { this.body = v; return this; }, end(v) { this.body = v; return this; } }; }
function request(bytes, type, url, extra = {}) { const r = Readable.from([bytes]); r.headers = { 'content-type': type, 'content-length': String(bytes.length), host: 'pawpal.test', authorization: 'Bearer token', ...extra }; r.url = url; r.method = 'POST'; return r; }
function multipart(bytes, mime = 'image/png', field = 'file', count = 1) {
    const boundary = 'pawpal-test-boundary';
    const parts = [];
    for (let i = 0; i < count; i++) parts.push(Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="' + field + '"; filename="image.png"\r\nContent-Type: ' + mime + '\r\n\r\n'), bytes, Buffer.from('\r\n'));
    parts.push(Buffer.from('--' + boundary + '--\r\n'));
    return { bytes: Buffer.concat(parts), type: 'multipart/form-data; boundary=' + boundary };
}
function dependencies(overrides = {}) {
    const calls = [];
    return { calls, clientFactory: (url, key) => ({ auth: { getUser: async () => ({ data: { user: { id: actor } } }) }, rpc: async (name, args) => {
        calls.push({ key, name, args });
        if (overrides[name]) return overrides[name](args);
        if (name === 'claim_media_upload') return { data: { state: 'uploading', session_id: session, lease, mongo_file_id: '0123456789abcdef01234567', size_bytes: overrides.size, mime_type: 'image/png' } };
        if (name === 'finish_media_upload') return { data: asset };
        return { data: null };
    } }) };
}

test('responsive public images shrink bytes, separate ETags, and never transform private media', async () => {
    const bytes=await sharp({create:{width:1720,height:540,channels:3,background:'#236B48'}}).png().toBuffer();
    let published=true,reads=0;
    const deps=dependencies({resolve_media_asset:async()=>({data:{mime_type:'image/png',sha256:'a'.repeat(64),public:published}})});
    const handler=createMediaHandler({env,clientFactory:deps.clientFactory,store:{read:async()=>{reads++;return bytes;}}});
    const get=async(width,headers={})=>{const req=request(Buffer.alloc(0),'','/api/media?id='+asset+'&width='+width,{authorization:undefined,...headers});req.method='GET';const response=res();await handler(req,response);return response;};
    const result=await get(640);
    assert.equal(result.statusCode,200);assert.equal(result.headers['Content-Type'],'image/webp');
    assert.equal((await sharp(result.body).metadata()).width,640);assert.ok(result.body.length<bytes.length);
    assert.match(result.headers.ETag,/-w640-webp-v1/);
    assert.equal((await get(640,{'if-none-match':result.headers.ETag})).statusCode,304);assert.equal(reads,1);
    assert.equal((await get(9000)).statusCode,400);assert.equal(reads,1);
    published=false;assert.equal((await get(640)).statusCode,404);assert.equal(reads,1);
});

test('chat guest upload hashes the session secret and uses only service RPCs; arbitrary actors are rejected',async()=>{
 const deps=dependencies({prepare_chat_media_upload:async()=>({data:{session_id:session}})});
 const handler=createMediaHandler({chat:true,env,clientFactory:deps.clientFactory,store:{}});
 const body={request_id:actor,conversation_id:session,message_id:asset,size_bytes:100,mime_type:'image/png',name:'chat.png'};
 const headers={authorization:undefined,'x-pawpal-chat-session':'isolated-guest-secret-with-enough-entropy'};
 const response=res();await handler(request(Buffer.from(JSON.stringify(body)),'application/json','/api/chat-media?action=prepare',headers),response);
 assert.equal(response.statusCode,200);assert.equal(deps.calls[0].key,'service-test');assert.equal(deps.calls[0].name,'prepare_chat_media_upload');
 assert.equal(deps.calls[0].args.p_actor,null);assert.match(deps.calls[0].args.p_guest_hash,/^[a-f0-9]{64}$/);assert.equal(JSON.stringify(deps.calls).includes(headers['x-pawpal-chat-session']),false);
 const bad=res();await handler(request(Buffer.from(JSON.stringify({...body,p_actor:actor})),'application/json','/api/chat-media?action=prepare',headers),bad);assert.equal(bad.statusCode,400);assert.equal(deps.calls.length,1);
 const noSession=res();await handler(request(Buffer.from(JSON.stringify(body)),'application/json','/api/chat-media?action=prepare',{authorization:undefined}),noSession);assert.equal(noSession.statusCode,401);
});

test('chat binary read is always private and rechecks guest permission even with an ETag',async()=>{
 const bytes=Buffer.from('private chat image'),sha='a'.repeat(64);let read=0;
 const deps=dependencies({resolve_chat_media:async()=>({data:{mime_type:'image/png',sha256:sha,size_bytes:bytes.length,public:false}})});
 const handler=createMediaHandler({chat:true,env,clientFactory:deps.clientFactory,store:{read:async()=>{read++;return bytes;}}});
 for(let i=0;i<2;i++){const req=request(Buffer.alloc(0),'','/api/chat-media?id='+asset,{authorization:undefined,'x-pawpal-chat-session':'isolated-guest-secret-with-enough-entropy','if-none-match':'"'+sha+'"'});req.method='GET';const response=res();await handler(req,response);assert.equal(response.statusCode,200);assert.equal(response.headers['Cache-Control'],'private, no-store');}
 assert.equal(read,2);assert.equal(deps.calls.length,2);
});

test('multipart accepts exactly one file and rejects extra files, fields and oversized declared body', async () => {
    const bytes = Buffer.from('small parser fixture');
    const single = multipart(bytes);
    assert.deepEqual((await readImageUpload(request(single.bytes, single.type, '/'))).bytes, bytes);
    for (const invalid of [multipart(bytes, 'image/png', 'wrong'), multipart(bytes, 'image/png', 'file', 2), multipart(bytes, 'image/svg+xml')]) {
        await assert.rejects(readImageUpload(request(invalid.bytes, invalid.type, '/')), { code: 'MEDIA_INVALID_MULTIPART' });
    }
    await assert.rejects(readImageUpload(request(single.bytes, single.type, '/', { 'content-length': String(MAX_BODY_BYTES + 1) })), { status: 413 });
});

test('image verification decodes actual pixels and rejects fake MIME, truncated data and excess pixel count', async () => {
    const png = await sharp({ create: { width: 2, height: 3, channels: 3, background: '#236B48' } }).png().toBuffer();
    const proof = await verifyImage(png, 'image/png');
    assert.equal(proof.width, 2); assert.equal(proof.height, 3); assert.match(proof.sha256, /^[a-f0-9]{64}$/);
    await assert.rejects(verifyImage(png, 'image/jpeg'), { code: 'MEDIA_INVALID_IMAGE' });
    await assert.rejects(verifyImage(Buffer.from('<svg></svg>'), 'image/png'), { code: 'MEDIA_INVALID_IMAGE' });
    await assert.rejects(verifyImage(png.subarray(0, 35), 'image/png'), { code: 'MEDIA_INVALID_IMAGE' });
    const huge = await sharp({ create: { width: 8193, height: 1, channels: 3, background: '#fff' } }).png().toBuffer();
    await assert.rejects(verifyImage(huge, 'image/png'), { code: 'MEDIA_INVALID_IMAGE' });
});

test('disabled upload, invalid token and unsupported purpose never reach storage', async () => {
    const deps = dependencies(); let stored = false;
    const store = { put: async () => { stored = true; } };
    const disabled = createMediaHandler({ env: { ...env, MEDIA_UPLOAD_ENABLED: 'false' }, clientFactory: deps.clientFactory, store });
    const r = res(); await disabled(request(Buffer.from('{}'), 'application/json', '/api/media?action=prepare'), r);
    assert.equal(r.statusCode, 503); assert.equal(deps.calls.length, 0);
    const handler = createMediaHandler({ env, clientFactory: deps.clientFactory, store });
    const anonymous = res(); await handler(request(Buffer.from('{}'), 'application/json', '/api/media?action=prepare', { authorization: undefined }), anonymous);
    assert.equal(anonymous.statusCode, 401);
    const invalid = res(); await handler(request(Buffer.from(JSON.stringify({ purpose: 'chat_attachment' })), 'application/json', '/api/media?action=prepare'), invalid);
    assert.equal(invalid.statusCode, 400); assert.equal(stored, false); assert.equal(deps.calls.length, 0);
});

test('variant prepare binds its exact variant ID and rejects variant IDs on unrelated purposes',async()=>{
    const deps=dependencies({prepare_variant_media_upload:async()=>({data:{session_id:session}})});
    const handler=createMediaHandler({env,clientFactory:deps.clientFactory,store:{}});
    const body={request_id:actor,purpose:'product_variant_image',product_id:actor,variant_id:asset,size_bytes:100,mime_type:'image/png',name:'variant.png'};
    const good=res();await handler(request(Buffer.from(JSON.stringify(body)),'application/json','/api/media?action=prepare'),good);
    assert.equal(good.statusCode,200);assert.equal(deps.calls[0].name,'prepare_variant_media_upload');assert.equal(deps.calls[0].args.p_variant,asset);assert.equal('p_appointment' in deps.calls[0].args,false);
    for(const value of [{...body,variant_id:null},{...body,purpose:'product_image'},{...body,appointment_id:asset}]){
        const denied=res();await handler(request(Buffer.from(JSON.stringify(value)),'application/json','/api/media?action=prepare'),denied);assert.equal(denied.statusCode,400);
    }
    assert.equal(deps.calls.length,1);
});

test('service prepare binds its service or draft and rejects unrelated entity IDs',async()=>{
    const deps=dependencies({prepare_service_media_upload:async()=>({data:{session_id:session}})});
    const handler=createMediaHandler({env,clientFactory:deps.clientFactory,store:{}});
    const body={request_id:actor,purpose:'service_image',service_id:asset,size_bytes:100,mime_type:'image/png',name:'service.png'};
    for(const value of [body,{...body,service_id:null,draft_id:asset}]){
        const good=res();await handler(request(Buffer.from(JSON.stringify(value)),'application/json','/api/media?action=prepare'),good);
        assert.equal(good.statusCode,200);assert.equal(deps.calls.at(-1).name,'prepare_service_media_upload');assert.equal('p_product' in deps.calls.at(-1).args,false);
    }
    for(const value of [{...body,service_id:null},{...body,draft_id:actor},{...body,product_id:actor},{...body,variant_id:actor},{...body,appointment_id:actor},{...body,purpose:'product_image'}]){
        const denied=res();await handler(request(Buffer.from(JSON.stringify(value)),'application/json','/api/media?action=prepare'),denied);assert.equal(denied.statusCode,400);
    }
    assert.equal(deps.calls.length,2);
});

test('intake prepare binds appointment and immutable record identity without other entity scopes',async()=>{
    const deps=dependencies({prepare_intake_media_upload:async()=>({data:{session_id:session}})});
    const handler=createMediaHandler({env,clientFactory:deps.clientFactory,store:{}});
    const body={request_id:actor,purpose:'intake_image',appointment_id:actor,record_id:asset,size_bytes:100,mime_type:'image/png',name:'intake.png'};
    const response=res();await handler(request(Buffer.from(JSON.stringify(body)),'application/json','/api/media?action=prepare'),response);
    assert.equal(response.statusCode,200);assert.equal(deps.calls[0].name,'prepare_intake_media_upload');assert.equal(deps.calls[0].args.p_record,asset);assert.equal(deps.calls[0].args.p_appointment,actor);assert.equal('p_product' in deps.calls[0].args,false);
    for(const value of [{...body,record_id:null},{...body,appointment_id:null},{...body,product_id:actor},{...body,draft_id:actor},{...body,service_id:actor},{...body,purpose:'care_log_image'}]){
        const denied=res();await handler(request(Buffer.from(JSON.stringify(value)),'application/json','/api/media?action=prepare'),denied);assert.equal(denied.statusCode,400);
    }
    assert.equal(deps.calls.length,1);
});

test('handover prepare binds its own record purpose and rejects unrelated scopes',async()=>{
    const deps=dependencies({prepare_handover_media_upload:async()=>({data:{session_id:session}})});
    const handler=createMediaHandler({env,clientFactory:deps.clientFactory,store:{}});
    const body={request_id:actor,purpose:'handover_image',appointment_id:actor,record_id:asset,size_bytes:100,mime_type:'image/png',name:'handover.png'};
    const response=res();await handler(request(Buffer.from(JSON.stringify(body)),'application/json','/api/media?action=prepare'),response);
    assert.equal(response.statusCode,200);assert.equal(deps.calls[0].name,'prepare_handover_media_upload');assert.equal(deps.calls[0].args.p_record,asset);
    for(const value of [{...body,record_id:null},{...body,appointment_id:null},{...body,service_id:actor},{...body,product_id:actor},{...body,purpose:'care_log_image'}]){
        const denied=res();await handler(request(Buffer.from(JSON.stringify(value)),'application/json','/api/media?action=prepare'),denied);assert.equal(denied.statusCode,400);
    }
    assert.equal(deps.calls.length,1);
});

test('adjustment prepare uses an adjustment ID and rejects record or unrelated scopes',async()=>{
    const deps=dependencies({prepare_adjustment_media_upload:async()=>({data:{session_id:session}})}),handler=createMediaHandler({env,clientFactory:deps.clientFactory,store:{}});
    const body={request_id:actor,purpose:'adjustment_image',appointment_id:actor,adjustment_id:asset,size_bytes:100,mime_type:'image/png',name:'surcharge.png'};
    const good=res();await handler(request(Buffer.from(JSON.stringify(body)),'application/json','/api/media?action=prepare'),good);
    assert.equal(good.statusCode,200);assert.equal(deps.calls[0].name,'prepare_adjustment_media_upload');assert.equal(deps.calls[0].args.p_adjustment,asset);
    for(const value of [{...body,adjustment_id:null},{...body,record_id:actor},{...body,purpose:'handover_image'},{...body,product_id:actor}]){const bad=res();await handler(request(Buffer.from(JSON.stringify(value)),'application/json','/api/media?action=prepare'),bad);assert.equal(bad.statusCode,400);}assert.equal(deps.calls.length,1);
});

test('pet avatar prepare accepts only a pet identity and never an appointment or draft',async()=>{
 const deps=dependencies({prepare_pet_media_upload:async()=>({data:{session_id:session}})}),handler=createMediaHandler({env,clientFactory:deps.clientFactory,store:{}}),body={request_id:actor,purpose:'pet_avatar',pet_id:asset,size_bytes:100,mime_type:'image/png',name:'avatar.png'};
 const good=res();await handler(request(Buffer.from(JSON.stringify(body)),'application/json','/api/media?action=prepare'),good);assert.equal(good.statusCode,200);assert.equal(deps.calls[0].name,'prepare_pet_media_upload');assert.equal(deps.calls[0].args.p_pet,asset);
 for(const value of [{...body,pet_id:null},{...body,appointment_id:actor},{...body,draft_id:actor},{...body,purpose:'product_image'}]){const bad=res();await handler(request(Buffer.from(JSON.stringify(value)),'application/json','/api/media?action=prepare'),bad);assert.equal(bad.statusCode,400);}assert.equal(deps.calls.length,1);
});

test('private evidence prepare binds an exact target and context without accepting mixed scopes',async()=>{
 for(const purpose of ['ticket_image','return_image']){
  const deps=dependencies({prepare_evidence_media_upload:async()=>({data:{session_id:session}})}),handler=createMediaHandler({env,clientFactory:deps.clientFactory,store:{}});
  const body={request_id:actor,purpose,target_id:asset,context_id:session,size_bytes:100,mime_type:'image/png',name:'evidence.png'};
  const good=res();await handler(request(Buffer.from(JSON.stringify(body)),'application/json','/api/media?action=prepare'),good);assert.equal(good.statusCode,200);
  assert.deepEqual(deps.calls[0].args,{p_request:actor,p_purpose:purpose,p_target:asset,p_context:session,p_size:100,p_mime:'image/png',p_name:'evidence.png'});
  for(const value of [{...body,target_id:null},{...body,context_id:null},{...body,appointment_id:actor},{...body,pet_id:actor},{...body,purpose:'product_image'}]){const bad=res();await handler(request(Buffer.from(JSON.stringify(value)),'application/json','/api/media?action=prepare'),bad);assert.equal(bad.statusCode,400);}assert.equal(deps.calls.length,1);
 }
});

test('customer pet images bind the pet and purpose using caller credentials and reject mixed scopes',async()=>{
 for(const purpose of ['customer_pet_avatar','customer_pet_vaccine','customer_avatar']){
  const rpcName=purpose==='customer_avatar'?'prepare_customer_avatar_upload':'prepare_customer_pet_media_upload';
  const deps=dependencies({[rpcName]:async()=>({data:{session_id:session}})}),handler=createMediaHandler({env,clientFactory:deps.clientFactory,store:{}});
  const body={request_id:actor,purpose,pet_id:asset,size_bytes:100,mime_type:'image/png',name:'pet.png'};
  const good=res();await handler(request(Buffer.from(JSON.stringify(body)),'application/json','/api/media?action=prepare'),good);assert.equal(good.statusCode,200);
  assert.equal(deps.calls[0].key,'anon-test');assert.equal(deps.calls[0].name,rpcName);assert.equal(deps.calls[0].args.p_pet,asset);assert.equal(deps.calls[0].args.p_kind,purpose);
  for(const value of [{...body,pet_id:null},{...body,appointment_id:actor},{...body,draft_id:actor},{...body,size_bytes:6*1024*1024}]){
   const bad=res();await handler(request(Buffer.from(JSON.stringify(value)),'application/json','/api/media?action=prepare'),bad);assert.equal(bad.statusCode,400);
  }
  assert.equal(deps.calls.length,1);
 }
});
test('review upload binds the review, line and business kind and rejects mixed purpose scopes',async()=>{
 const deps=dependencies({prepare_review_media_upload:async()=>({data:{session_id:session}})}),handler=createMediaHandler({env,clientFactory:deps.clientFactory,store:{}});
 const body={request_id:actor,purpose:'review_image',target_id:asset,context_id:session,review_kind:'sales',size_bytes:100,mime_type:'image/png',name:'review.png'};
 const good=res();await handler(request(Buffer.from(JSON.stringify(body)),'application/json','/api/media?action=prepare'),good);assert.equal(good.statusCode,200);assert.deepEqual(deps.calls[0].args,{p_request:actor,p_target:asset,p_context:session,p_kind:'sales',p_size:100,p_mime:'image/png',p_name:'review.png'});
 for(const value of [{...body,review_kind:null},{...body,review_kind:'staff'},{...body,product_id:actor},{...body,purpose:'ticket_image'}]){const bad=res();await handler(request(Buffer.from(JSON.stringify(value)),'application/json','/api/media?action=prepare'),bad);assert.equal(bad.statusCode,400);}assert.equal(deps.calls.length,1);
});

test('content image prepare binds a single content UUID and rejects private or product scopes',async()=>{
 for(const purpose of ['banner_image','blog_thumbnail']){
  const deps=dependencies({prepare_content_media_upload:async()=>({data:{session_id:session}})}),handler=createMediaHandler({env,clientFactory:deps.clientFactory,store:{}}),body={request_id:actor,purpose,content_id:asset,size_bytes:100,mime_type:'image/png',name:'content.png'};
  const good=res();await handler(request(Buffer.from(JSON.stringify(body)),'application/json','/api/media?action=prepare'),good);assert.equal(good.statusCode,200);assert.deepEqual(deps.calls[0].args,{p_request:actor,p_purpose:purpose,p_content:asset,p_size:100,p_mime:'image/png',p_name:'content.png'});
  for(const value of [{...body,content_id:null},{...body,target_id:actor},{...body,product_id:actor},{...body,draft_id:actor},{...body,review_kind:'sales'},{...body,purpose:'product_image'}]){const bad=res();await handler(request(Buffer.from(JSON.stringify(value)),'application/json','/api/media?action=prepare'),bad);assert.equal(bad.statusCode,400);}assert.equal(deps.calls.length,1);
 }
});

test('verified upload finalizes through service role; repeat returns original asset without rewriting', async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer();
    const deps = dependencies({ size: png.length }); let writes = 0;
    const form = multipart(png);
    const handler = createMediaHandler({ env, clientFactory: deps.clientFactory, store: { put: async (claim, bytes) => { assert.deepEqual(bytes, png); writes++; } } });
    const response = res(); await handler(request(form.bytes, form.type, '/api/media?action=upload&session=' + session), response);
    assert.equal(response.statusCode, 201); assert.equal(response.body.asset_id, asset); assert.equal(writes, 1);
    assert.deepEqual(deps.calls.map(c => [c.key, c.name]), [['anon-test', 'claim_media_upload'], ['service-test', 'finish_media_upload']]);
    const repeat = dependencies({ claim_media_upload: async () => ({ data: { state: 'verified', asset_id: asset } }) });
    const retried = createMediaHandler({ env, clientFactory: repeat.clientFactory, store: { put: async () => { throw Error('Must not rewrite'); } } });
    const existing = res(); await retried(request(form.bytes, form.type, '/api/media?action=upload&session=' + session), existing);
    assert.equal(existing.statusCode, 200); assert.equal(existing.body.asset_id, asset);
});

test('invalid file or DB finalization failure keeps a cleanup reservation and never returns success', async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer();
    for (const bytes of [Buffer.from('malicious-not-image'), png]) {
        const deps = dependencies({ size: bytes.length, finish_media_upload: async () => ({ error: { code: '42501', message: 'secret backend detail' } }) });
        const handler = createMediaHandler({ env, clientFactory: deps.clientFactory, store: { put: async () => {} } });
        const form = multipart(bytes), response = res();
        await handler(request(form.bytes, form.type, '/api/media?action=upload&session=' + session), response);
        assert.ok(response.statusCode >= 400);
        assert.equal(deps.calls.at(-1).name, 'fail_media_upload');
        assert.ok(!JSON.stringify(response.body).includes('secret backend detail'));
    }
});

test('private reads are checked before storage, never shared-cache, and public cache revalidation still authorizes', async () => {
    let reads = 0;
    const source = { id: asset, mongo_file_id: '0123456789abcdef01234567', mime_type: 'image/png', size_bytes: 3, sha256: 'a'.repeat(64), public: false };
    const deps = dependencies({ resolve_media_asset: async () => ({ data: source }) });
    const handler = createMediaHandler({ env, clientFactory: deps.clientFactory, store: { read: async () => { reads++; return Buffer.from('abc'); } } });
    const req = request(Buffer.alloc(0), '', '/api/media?id=' + asset); req.method = 'GET';
    const response = res(); await handler(req, response);
    assert.equal(response.statusCode, 200); assert.equal(response.headers['Cache-Control'], 'private, no-store');
    assert.equal(response.headers.ETag, undefined); assert.equal(reads, 1);
    source.public = true;
    const cached = request(Buffer.alloc(0), '', '/api/media?id=' + asset, { 'if-none-match': '"' + source.sha256 + '"' }); cached.method = 'GET';
    const cachedResponse = res(); await handler(cached, cachedResponse);
    assert.equal(cachedResponse.statusCode, 304); assert.equal(reads, 1);
    assert.equal(deps.calls.filter(c => c.name === 'resolve_media_asset').length, 2);
    const denied = createMediaHandler({ env, clientFactory: dependencies({ resolve_media_asset: async () => ({ data: null }) }).clientFactory, store: { read: async () => { throw Error('must not read'); } } });
    const deniedResponse = res(); await denied(cached, deniedResponse);
    assert.equal(deniedResponse.statusCode, 404); assert.equal(deniedResponse.headers['Cache-Control'], 'private, no-store');
});

test('media source keeps old links and rejects mixed sources or unsafe schemes', async () => {
    const { mediaSource, loadMediaSource } = await import('../shared/media-source.mjs');
    assert.equal(mediaSource({ url: 'https://example.test/image.jpg' }).url, 'https://example.test/image.jpg');
    assert.equal(mediaSource({ url: 'assets/image.jpg' }).url, '/assets/image.jpg');
    assert.throws(() => mediaSource({ url: 'javascript:alert(1)' }));
    assert.throws(() => mediaSource({ url: '/assets/../private.env' }));
    assert.throws(() => mediaSource({ media_asset_id: asset, url: '/assets/image.jpg' }));
    let released = false;
    const fetched = await loadMediaSource(mediaSource({ media_asset_id: asset }), 'session-token', {
        fetchImpl: async (url, options) => { assert.equal(options.headers.Authorization, 'Bearer session-token'); return { ok: true, blob: async () => new Blob(['abc']) }; },
        urlApi: { createObjectURL: () => 'blob:test', revokeObjectURL: url => { assert.equal(url, 'blob:test'); released = true; } }
    });
    assert.equal(fetched.url, 'blob:test'); fetched.release(); assert.equal(released, true);
});

test('moderated public media bypasses caches and conditional responses to enforce hiding promptly',async()=>{
 let reads=0;const source={id:asset,mongo_file_id:'0123456789abcdef01234567',mime_type:'image/png',size_bytes:3,sha256:'a'.repeat(64),public:true,cache_public:false};
 const deps=dependencies({resolve_media_asset:async()=>({data:source})}),handler=createMediaHandler({env,clientFactory:deps.clientFactory,store:{read:async()=>{reads++;return Buffer.from('abc');}}});
 const req=request(Buffer.alloc(0),'','/api/media?id='+asset,{'if-none-match':'"'+source.sha256+'"'});req.method='GET';
 const response=res();await handler(req,response);assert.equal(response.statusCode,200);assert.equal(response.headers['Cache-Control'],'private, no-store');assert.equal(response.headers.ETag,undefined);assert.equal(reads,1);
});
