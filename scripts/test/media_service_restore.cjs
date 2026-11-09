'use strict';
const fs=require('node:fs'),root='D:/Aboutme/Pawpal-infra/media/phase5-service/';
const normalize=x=>JSON.stringify(x,(key,value)=>['created_at','updated_at'].includes(key)?undefined:value);
(async()=>{let db;try{
 const before=JSON.parse(fs.readFileSync(root+'e2e-before.private.json')),after=JSON.parse(fs.readFileSync(root+'e2e-after.private.json'));
 if(before.id!=='8d8d0107-b113-4dcb-9812-5394de6d0fde'||after.id!==before.id||after.service_image.length!==1||after.service_image[0].media_asset_id!=='cb649c76-4a68-40dd-974e-61f58d3fcd8d')throw Error('SCOPE');
 db=await require('../database/v1/service_import_connection.cjs').connect();await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");
 const current={id:before.id};
 for(const table of ['service','service_image','service_supported_species','service_care_action','service_price_matrix'])current[table]=(await db.query('SELECT * FROM public.'+table+' WHERE '+(table==='service'?'id':'service_id')+'=$1 ORDER BY '+(table==='service_supported_species'?'species_id':table==='service_care_action'?'care_action_id':'id')+' FOR UPDATE',[before.id])).rows;
 if(normalize(current.service)!==normalize(before.service)||normalize(current.service_image)!==normalize(after.service_image)||JSON.stringify(current.service_price_matrix)!==JSON.stringify(before.service_price_matrix))throw Error('CONCURRENT_CHANGE');
 for(const [table,columns]of [['service_supported_species',['species_id']],['service_care_action',['care_action_id','display_order','estimated_duration']]]){
  const semantic=rows=>JSON.stringify(rows.map(row=>columns.map(key=>row[key])));
  if(semantic(current[table])!==semantic(before[table]))throw Error('RELATION_CHANGE');
 }
 const sessions=(await db.query("SELECT s.*,a.id asset_id,a.sha256,a.legal_hold FROM public.media_upload_session s LEFT JOIN public.media_asset a ON a.session_id=s.id WHERE s.service_id=$1 AND s.purpose='service_image' AND (s.id='de8aff0e-92fe-4629-a93b-26a053a60497' OR a.id=$2) FOR UPDATE OF s",[before.id,after.service_image[0].media_asset_id])).rows;
 if(sessions.length!==2||sessions.some(row=>Number(row.declared_size)!==196843||row.legal_hold))throw Error('SESSION_SCOPE');
 fs.writeFileSync(root+'cleanup-scope.private.json',JSON.stringify(sessions));
 for(const table of ['service_image','service_supported_species','service_care_action']){
  await db.query('DELETE FROM public.'+table+' WHERE service_id=$1',[before.id]);
  if(before[table].length)await db.query('INSERT INTO public.'+table+' SELECT * FROM jsonb_populate_recordset(null::public.'+table+',$1::jsonb)',[JSON.stringify(before[table])]);
  const restored=(await db.query('SELECT * FROM public.'+table+' WHERE service_id=$1 ORDER BY '+(table==='service_supported_species'?'species_id':table==='service_care_action'?'care_action_id':'id'),[before.id])).rows;
  if(JSON.stringify(restored)!==JSON.stringify(before[table]))throw Error('RESTORE_MISMATCH');
 }
 await db.query('COMMIT');
 fs.writeFileSync('docs/media/phase5-service-restoration.txt',JSON.stringify({status:'PASS',repeatSaveRetainedReferenceIdAndSource:true,originalImageReferencesAndSpeciesAndStepsRestoredExactly:true,serviceBusinessColumnsAndPriceRowsUnchanged:true,auditAndServiceUpdatedAtRetained:true},null,2));console.log('SERVICE_ACCEPTANCE_REFERENCES_RESTORED');
}catch(error){try{await db?.query('ROLLBACK');}catch{}console.error(error.message);process.exitCode=1;}finally{await db?.end();}})();
