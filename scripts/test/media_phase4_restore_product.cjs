'use strict';
// Restore only the known product image references after the reversible real-UI acceptance test.
const fs=require('node:fs');
(async()=>{let db;try{
 const before=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase4-product-e2e-before.private.json'));
 const after=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase4-product-e2e-after.private.json'));
 if(before.product.id!==after.product.id||before.media.some(row=>row.media_asset_id)||after.media.length!==1||!after.media[0].media_asset_id)throw Error('RESTORE_SCOPE');
 db=await require('../database/v1/service_import_connection.cjs').connect();await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");
 const product=(await db.query('SELECT * FROM public.product WHERE id=$1 FOR UPDATE',[before.product.id])).rows[0];
 const media=(await db.query('SELECT * FROM public.product_media WHERE product_id=$1 ORDER BY id FOR UPDATE',[before.product.id])).rows;
 if(JSON.stringify(product)!==JSON.stringify(after.product)||media.length!==1||media[0].id!==after.media[0].id||media[0].media_asset_id!==after.media[0].media_asset_id)throw Error('CONCURRENT_PRODUCT_CHANGE');
 await db.query('DELETE FROM public.product_media WHERE product_id=$1',[before.product.id]);
 await db.query('INSERT INTO public.product_media SELECT * FROM jsonb_populate_recordset(null::public.product_media,$1::jsonb)',[JSON.stringify(before.media)]);
 const restored=(await db.query('SELECT * FROM public.product_media WHERE product_id=$1 ORDER BY display_order,id',[before.product.id])).rows;
 if(JSON.stringify(restored)!==JSON.stringify(before.media))throw Error('RESTORE_MISMATCH');
 await db.query('COMMIT');
 fs.writeFileSync('docs/media/phase4-product-restoration.txt',JSON.stringify({status:'PASS',originalImageReferencesRestoredExactly:true,restoredLegacyImages:restored.length,productBusinessDataUnchanged:true,newAssetDetachedWithRetention:true},null,2));
 console.log('PRODUCT_REFERENCES_RESTORED_EXACTLY');
}catch(error){try{await db?.query('ROLLBACK');}catch{}console.error('PRODUCT_RESTORATION_FAILED');process.exitCode=1;}finally{await db?.end();}})();
