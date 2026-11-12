const fs=require('fs'),assert=require('node:assert/strict'),crypto=require('crypto');const{connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect(),q=(s,a)=>db.query(s,a);try{
 await q("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");await q(fs.readFileSync('scripts/database/v1/234_customer_avatar.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 if(process.argv.includes('--apply')){await q('COMMIT');console.log('APPLIED account avatar migration');return;}
 const auth=crypto.randomUUID(),other=crypto.randomUUID(),cid=crypto.randomUUID(),request=crypto.randomUUID(),asset=crypto.randomUUID();
 await q('INSERT INTO auth.users(id) VALUES($1),($2)',[auth,other]);await q('INSERT INTO public.customer(id,auth_user_id,customer_code) VALUES($1,$2,$3)',[cid,auth,'AVATAR-'+cid]);await q("INSERT INTO public.customer_profile(customer_id,full_name) VALUES($1,'Avatar rollback') ON CONFLICT(customer_id) DO NOTHING",[cid]);
 const actor=async id=>{await q('RESET ROLE');await q("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[id]);await q('SET LOCAL ROLE authenticated');};
 const deny=async fn=>{await q('SAVEPOINT denied');let e;try{await fn();}catch(x){e=x;}await q('ROLLBACK TO SAVEPOINT denied');assert.ok(e);assert.ok(['42501','PT409'].includes(e.code),e.message);};
 await actor(other);await deny(()=>q("SELECT public.prepare_customer_avatar_upload($1,$2,'customer_avatar',100,'image/png','avatar.png')",[request,cid]));
 await actor(auth);const session=(await q("SELECT public.prepare_customer_avatar_upload($1,$2,'customer_avatar',100,'image/png','avatar.png') value",[request,cid])).rows[0].value.session_id;
 await q('RESET ROLE');await q("UPDATE public.media_upload_session SET state='verified' WHERE id=$1",[session]);
 await q("INSERT INTO public.media_asset(id,session_id,mongo_file_id,mime_type,size_bytes,sha256,width,height) VALUES($1,$2,$3,'image/png',100,$4,10,10)",[asset,session,crypto.randomBytes(12).toString('hex'),'a'.repeat(64)]);
 await actor(auth);await q('SELECT public.save_own_customer_avatar($1,NULL)',[asset]);await q('SELECT public.save_own_customer_avatar($1,NULL)',[asset]);
 assert.equal((await q('SELECT public.own_customer_avatar() value')).rows[0].value.asset_id,asset);
 assert.ok((await q('SELECT public.resolve_media_asset($1) value',[asset])).rows[0].value);
 await actor(other);assert.equal((await q('SELECT public.resolve_media_asset($1) value',[asset])).rows[0].value,null);
 await actor(auth);await deny(()=>q('SELECT public.save_own_customer_avatar(NULL,$1)',[crypto.randomUUID()]));await q('SELECT public.save_own_customer_avatar(NULL,$1)',[asset]);assert.equal((await q('SELECT public.own_customer_avatar() value')).rows[0].value.asset_id,null);
 await q('ROLLBACK');console.log('PASS Cloud rollback avatar: prepare ownership, attach/save/retry, reload pointer, private read, stale write, remove; no retained fixtures or image bytes uploaded.');
}catch(e){await q('RESET ROLE').catch(()=>{});await q('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||'',e.message);process.exitCode=1;});
