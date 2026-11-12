// Isolated temporary account, actual local HTTP/media store, deterministic cleanup.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js'),sharp=require('sharp');
const {settings}=require('../database/v1/cloud_connection.cjs'),{connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const {config}=settings(),options={auth:{persistSession:false,autoRefreshToken:false}},service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,options),db=await connect();let auth,cid,sid,asset;
try{
 const email='avatar-'+crypto.randomUUID()+'@example.invalid',password=crypto.randomBytes(24).toString('hex')+'!';
 const created=await service.auth.admin.createUser({email,password,email_confirm:true});if(created.error)throw created.error;auth=created.data.user.id;cid=crypto.randomUUID();
 await db.query('INSERT INTO public.customer(id,auth_user_id,customer_code) VALUES($1,$2,$3)',[cid,auth,'AVATAR-LIVE-'+cid]);await db.query("INSERT INTO public.customer_profile(customer_id,full_name) VALUES($1,'Avatar local verification') ON CONFLICT(customer_id) DO NOTHING",[cid]);
 const client=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,options),login=await client.auth.signInWithPassword({email,password});if(login.error)throw login.error;
 const token=login.data.session.access_token,origin='http://localhost:4000',headers={Authorization:'Bearer '+token,Origin:origin};
 const bytes=await sharp({create:{width:48,height:48,channels:3,background:'#236B48'}}).png().toBuffer();
 const response=await fetch(origin+'/api/media?action=prepare',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({request_id:crypto.randomUUID(),purpose:'customer_avatar',pet_id:cid,size_bytes:bytes.length,mime_type:'image/png',name:'avatar-verification.png'})});const prepared=await response.json();assert.equal(response.status,200,JSON.stringify(prepared));sid=prepared.session_id;
 const form=new FormData();form.append('file',new Blob([bytes],{type:'image/png'}),'avatar-verification.png');const uploaded=await fetch(origin+'/api/media?action=upload&session='+sid,{method:'POST',headers,body:form});const body=await uploaded.json();assert.equal(uploaded.status,201,JSON.stringify(body));asset=body.asset_id;
 const saved=await client.rpc('save_own_customer_avatar',{p_asset:asset,p_expected:null});if(saved.error)throw saved.error;assert.equal(saved.data,cid);
 const reload=await client.rpc('own_customer_avatar');assert.equal(reload.data.asset_id,asset);
 const read=await fetch(origin+'/api/media?action=read&id='+asset,{headers});assert.equal(read.status,200);assert.equal(crypto.createHash('sha256').update(Buffer.from(await read.arrayBuffer())).digest('hex'),crypto.createHash('sha256').update(bytes).digest('hex'));
 const anonymous=await fetch(origin+'/api/media?action=read&id='+asset);assert.equal(anonymous.status,404);
 const removed=await client.rpc('save_own_customer_avatar',{p_asset:null,p_expected:asset});if(removed.error)throw removed.error;
 console.log('PASS actual local HTTP -> Supabase -> MongoDB image upload, account save, reload, private byte-exact read, anonymous denial and remove. Temporary account only.');
}finally{
 // Remove only IDs owned by this test account, including uploaded bytes.
 if(auth){
  await db.query('UPDATE public.customer_profile SET avatar_media_asset_id=NULL WHERE customer_id=$1',[cid]).catch(()=>{});
  const rows=(await db.query('SELECT id,mongo_file_id FROM public.media_upload_session WHERE created_by=$1',[auth])).rows;
  if(rows.length){require('node:dns').setServers(['1.1.1.1','8.8.8.8']);const env=require('dotenv').parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/atlas.private.env'));const store=require('../api/media_mongodb.cjs').createMediaMongoStore({env});try{const {bucket}=await store.resources();for(const row of rows){try{await bucket.delete(new(require('mongodb').ObjectId)(row.mongo_file_id));}catch(e){if(e.code!=='ENOENT'&&!/File not found/.test(e.message))throw e;}}}finally{await store.close();}
   await db.query('DELETE FROM public.media_asset WHERE session_id=ANY($1::uuid[])',[rows.map(r=>r.id)]);await db.query('DELETE FROM public.media_upload_session WHERE id=ANY($1::uuid[])',[rows.map(r=>r.id)]);
  }
  await db.query('DELETE FROM public.customer_profile WHERE customer_id=$1',[cid]);await db.query('DELETE FROM public.customer WHERE id=$1',[cid]);await service.auth.admin.deleteUser(auth);console.log('Temporary account/media cleanup completed.');
 }await db.end();
}})().catch(e=>{console.error(e.code||'',e.message);process.exitCode=1;});
