'use strict';
const fs=require('fs'),path=require('path'),dir='D:/Aboutme/Pawpal-infra/media/phase5-remaining';
(async()=>{let db;try{
 const kind=process.argv[2];if(!['pet_avatar','blog_thumbnail','banner_image'].includes(kind))throw Error('KIND_SCOPE');
 const source=JSON.parse(fs.readFileSync(path.join(dir,'admin-media-sources.private.json')))[kind];if(!source)throw Error('SOURCE_SCOPE');
 db=await require('../database/v1/service_import_connection.cjs').connect();await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");
 const current=(await db.query(`SELECT to_jsonb(t) snapshot FROM public.${source.table} t WHERE id=$1 FOR UPDATE`,[source.snapshot.id])).rows[0]?.snapshot;
 const asset=current?.[source.assetColumn];if(!asset||current[source.column]!==null)throw Error('CURRENT_ASSET_SCOPE');
 const allowed=[source.column,source.assetColumn,'updated_at'];
 const strip=value=>Object.fromEntries(Object.entries(value).filter(([k])=>!allowed.includes(k)));
 if(JSON.stringify(strip(current))!==JSON.stringify(strip(source.snapshot)))throw Error('BUSINESS_ROW_CHANGED');
 const row=(await db.query('SELECT a.id asset_id,a.sha256,a.size_bytes,s.* FROM public.media_asset a JOIN public.media_upload_session s ON s.id=a.session_id WHERE a.id=$1 FOR UPDATE OF a,s',[asset])).rows[0];
 if(row?.purpose!==kind||row.sha256!==source.sha256||Number(row.size_bytes)!==source.size||row.original_name!==path.basename(source.file))throw Error('ASSET_PROOF_SCOPE');
 await db.query(`UPDATE public.${source.table} SET ${source.column}=$2,${source.assetColumn}=null WHERE id=$1`,[source.snapshot.id,source.snapshot[source.column]]);
 // Reference-release triggers run above. Restore the original version only after verifying all other business fields.
 await db.query('SET LOCAL session_replication_role=replica');await db.query(`UPDATE public.${source.table} SET updated_at=$2 WHERE id=$1`,[source.snapshot.id,source.snapshot.updated_at]);await db.query('SET LOCAL session_replication_role=origin');
 const restored=(await db.query(`SELECT to_jsonb(t) snapshot FROM public.${source.table} t WHERE id=$1`,[source.snapshot.id])).rows[0].snapshot;
 if(JSON.stringify(restored)!==JSON.stringify(source.snapshot))throw Error('RESTORE_MISMATCH');
 const proof={actor:row.created_by,sourceBytes:source.size,sha256:source.sha256,kind,steps:[{name:row.original_name,session_id:row.id,asset_id:asset,scope:{purpose:kind,pet_id:row.pet_id,content_id:row.content_id}}],businessRestoredExactly:true};
 await db.query('COMMIT');fs.writeFileSync(path.join(dir,kind+'-live-restore.private.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify({kind,restoredExactly:true,sourceBytes:source.size}));
 }catch(e){try{await db?.query('ROLLBACK');}catch{}console.error(e.code||e.message);process.exitCode=1;}finally{await db?.end();}})();
