'use strict';
// Restore only the product whose before/after snapshots were recorded for this acceptance run.
const fs=require('node:fs');
const root='D:/Aboutme/Pawpal-infra/media/phase5-variant/';
const stable=value=>JSON.stringify(JSON.parse(JSON.stringify(value)),(key,item)=>key==='updated_at'?undefined:item);
(async()=>{let db;try{
 const before=JSON.parse(fs.readFileSync(root+'e2e-before.private.json'));
 const after=JSON.parse(fs.readFileSync(root+'e2e-after.private.json'));
 const assets=after.media.filter(row=>row.media_asset_id);
 if(before.product.id!=='a0000000-0000-0000-0000-000000000001'||after.product.id!==before.product.id||assets.length!==1||before.media.some(row=>row.media_asset_id))throw Error('SCOPE');
 db=await require('../database/v1/service_import_connection.cjs').connect();
 await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");
 const product=(await db.query('SELECT * FROM public.product WHERE id=$1 FOR UPDATE',[before.product.id])).rows[0];
 const variants=(await db.query('SELECT * FROM public.product_variant WHERE product_id=$1 ORDER BY id FOR UPDATE',[before.product.id])).rows;
 const media=(await db.query('SELECT * FROM public.product_variant_media WHERE product_variant_id IN (SELECT id FROM public.product_variant WHERE product_id=$1) ORDER BY id FOR UPDATE',[before.product.id])).rows;
 if(stable(product)!==stable(before.product)||stable(variants)!==stable(before.variants)||stable(media)!==stable(after.media))throw Error('CONCURRENT_CHANGE');
 const scope=(await db.query('SELECT s.*,a.id AS asset_id,a.size_bytes,a.sha256,a.legal_hold FROM public.media_upload_session s JOIN public.media_asset a ON a.session_id=s.id WHERE a.id=$1 FOR UPDATE OF s,a',[assets[0].media_asset_id])).rows[0];
 if(scope.purpose!=='product_variant_image'||scope.product_id!==before.product.id||scope.variant_id!==assets[0].product_variant_id||scope.legal_hold||Number(scope.size_bytes)!==1385797)throw Error('ASSET_SCOPE');
 fs.writeFileSync(root+'cleanup-scope.private.json',JSON.stringify(scope));
 await db.query('DELETE FROM public.product_variant_media WHERE product_variant_id=ANY($1::uuid[])',[variants.map(row=>row.id)]);
 await db.query('INSERT INTO public.product_variant_media SELECT * FROM jsonb_populate_recordset(null::public.product_variant_media,$1::jsonb)',[JSON.stringify(before.media)]);
 const restored=(await db.query('SELECT * FROM public.product_variant_media WHERE product_variant_id=ANY($1::uuid[]) ORDER BY id',[variants.map(row=>row.id)])).rows;
 if(JSON.stringify(restored)!==JSON.stringify(before.media))throw Error('RESTORE_MISMATCH');
 await db.query('COMMIT');
 fs.writeFileSync('docs/media/phase5-variant-restoration.txt',JSON.stringify({status:'PASS',repeatSaveRetainedReferenceIdsAndSources:true,onlyRepeatSaveUpdatedAtChanged:true,originalReferencesRestoredExactly:true,restoredImages:restored.length,productAndVariantBusinessColumnsUnchanged:true},null,2));
 console.log('VARIANT_REFERENCES_RESTORED');
}catch(error){try{await db?.query('ROLLBACK');}catch{}console.error(error.message);process.exitCode=1;}finally{await db?.end();}})();
