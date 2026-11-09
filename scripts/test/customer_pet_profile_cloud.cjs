// Transactional schema/ownership regression. Synthetic records are always rolled back.
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 await db.query('BEGIN');await db.query("SET LOCAL statement_timeout='15s';SET LOCAL lock_timeout='3s'");
 const sql=fs.readFileSync(require.resolve('../database/v1/205_customer_pet_profile.sql'),'utf8').replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'');
 if(!process.argv.includes('--installed'))await db.query(sql);
 console.log('Database upload gate enabled:',(await db.query('SELECT enabled FROM pawpal_private.media_settings WHERE singleton')).rows[0]?.enabled);
 await db.query('SAVEPOINT fixtures');
 const actor=randomUUID(),other=randomUUID(),pet=randomUUID(),phone='099'+String(Math.floor(Math.random()*1e7)).padStart(7,'0'),otherPhone='098'+String(Math.floor(Math.random()*1e7)).padStart(7,'0');
 await db.query('INSERT INTO auth.users(id,phone,phone_confirmed_at) VALUES($1,$2,now()),($3,$4,now())',[actor,'84'+phone.slice(1),other,'84'+otherPhone.slice(1)]);
 const owner=(await db.query("SELECT public.complete_customer_auth($1,$2,'QA Pet owner') id",[actor,phone])).rows[0].id;
 await db.query("SELECT public.complete_customer_auth($1,$2,'QA Other owner')",[other,otherPhone]);
 await db.query("UPDATE pawpal_private.media_settings SET enabled=true,max_storage_bytes=300000000 WHERE singleton");
 const as=async(id,role='authenticated')=>{await db.query('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[id]);await db.query('SET LOCAL ROLE '+role);};
 await as(actor);
 const assets=[];
 for(const kind of ['customer_pet_avatar','customer_pet_vaccine']){
  const session=(await db.query("SELECT public.prepare_customer_pet_media_upload($1,$2,$3,100,'image/png','qa.png') result",[randomUUID(),pet,kind])).rows[0].result;
  const claim=(await db.query('SELECT public.claim_media_upload($1) result',[session.session_id])).rows[0].result;
  await as(actor,'service_role');
  assets.push((await db.query("SELECT public.finish_media_upload($1,$2,$3,repeat('a',64),2,2) id",[session.session_id,claim.lease,actor])).rows[0].id);
  await as(actor);
 }
 const species=(await db.query('SELECT species_name FROM public.pet_species WHERE is_active ORDER BY id LIMIT 1')).rows[0].species_name;
 const values={pet_name:'Miu Miu',species_name:species,breed_name:'QA Custom '+randomUUID(),gender:'nu',allergy:'Dị ứng hải sản',safety_note:'Sợ tiếng sấy mạnh',avatar_media_asset_id:assets[0],vaccine_media_asset_id:assets[1],vaccination_recorded:true};
 await db.query('SELECT public.save_own_pet($1,null,$2,4.5)',[pet,values]);
 const row=(await db.query('SELECT p.*,p.updated_at::text revision,b.breed_name FROM public.pet_profile p JOIN public.pet_breed b ON b.id=p.breed_id WHERE p.id=$1',[pet])).rows[0];
 assert.equal(row.customer_id,owner);assert.equal(row.breed_name,values.breed_name);assert.equal(row.avatar_media_asset_id,assets[0]);assert.equal(row.vaccine_media_asset_id,assets[1]);
 for(const id of assets)assert.ok((await db.query('SELECT public.resolve_media_asset($1) result',[id])).rows[0].result);
 await db.query('SELECT public.save_own_pet($1,$2,$3,4.5)',[pet,row.revision,{...values,avatar_media_asset_id:undefined,vaccine_media_asset_id:undefined}]);
 const updated=(await db.query('SELECT * FROM public.pet_profile WHERE id=$1',[pet])).rows[0];assert.equal(updated.avatar_media_asset_id,assets[0]);assert.equal(updated.vaccine_media_asset_id,assets[1]);
 const replacements=[];
 for(const kind of ['customer_pet_avatar','customer_pet_vaccine']){
  const session=(await db.query("SELECT public.prepare_customer_pet_media_upload($1,$2,$3,100,'image/png','replacement.png') result",[randomUUID(),pet,kind])).rows[0].result;
  const claim=(await db.query('SELECT public.claim_media_upload($1) result',[session.session_id])).rows[0].result;
  await as(actor,'service_role');replacements.push((await db.query("SELECT public.finish_media_upload($1,$2,$3,repeat('b',64),2,2) id",[session.session_id,claim.lease,actor])).rows[0].id);await as(actor);
 }
 const revision=(await db.query('SELECT updated_at::text revision FROM public.pet_profile WHERE id=$1',[pet])).rows[0].revision;
 await db.query('SELECT public.save_own_pet($1,$2,$3,5.2)',[pet,revision,{...values,avatar_media_asset_id:replacements[0],vaccine_media_asset_id:replacements[1],routine:'Mới tiêm phòng dại ngày 20/10.'}]);
 const replacementRow=(await db.query('SELECT avatar_media_asset_id,vaccine_media_asset_id,routine FROM public.pet_profile WHERE id=$1',[pet])).rows[0];
 assert.equal(replacementRow.avatar_media_asset_id,replacements[0]);assert.equal(replacementRow.vaccine_media_asset_id,replacements[1]);assert.equal(replacementRow.routine,'Mới tiêm phòng dại ngày 20/10.');
 const weight=(await db.query('SELECT weight FROM public.pet_weight_history WHERE pet_id=$1 ORDER BY measured_at DESC,created_at DESC,id DESC LIMIT 1',[pet])).rows[0].weight;assert.equal(Number(weight),5.2);
 for(const id of replacements)assert.ok((await db.query('SELECT public.resolve_media_asset($1) result',[id])).rows[0].result);
 for(const id of assets)assert.equal((await db.query('SELECT public.resolve_media_asset($1) result',[id])).rows[0].result,null);
 await as(other);for(const id of assets)assert.equal((await db.query('SELECT public.resolve_media_asset($1) result',[id])).rows[0].result,null);
 await db.query('SAVEPOINT denied');
 await assert.rejects(db.query("SELECT public.prepare_customer_pet_media_upload($1,$2,'customer_pet_avatar',100,'image/png','qa.png')",[randomUUID(),pet]),error=>error.code==='42501');
 await db.query('ROLLBACK TO SAVEPOINT denied');
 await as('','anon');for(const id of assets)assert.equal((await db.query('SELECT public.resolve_media_asset($1) result',[id])).rows[0].result,null);
 await db.query('RESET ROLE');await db.query('ROLLBACK TO SAVEPOINT fixtures');
 console.log('PASS custom breed; both images attach, persist and replace; weight 5.2 and routine saved; old images retired; other user and anonymous reads denied. All synthetic records rolled back.');
 await db.query(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');console.log(process.argv.includes('--apply')?'Applied customer pet profile migration.':'Migration rehearsal rolled back.');
}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}})().catch(e=>{console.error(e.message||e.code,e.where||'');process.exitCode=1;});
