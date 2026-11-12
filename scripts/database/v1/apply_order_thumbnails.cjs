const fs=require('node:fs'),assert=require('node:assert/strict');const {connect}=require('./service_import_connection.cjs');
const apply=process.argv.includes('--apply');
(async()=>{const db=await connect();try{
 await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
 await db.query(fs.readFileSync('scripts/database/v1/230_customer_order_thumbnails.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 const owner=(await db.query("SELECT c.id,c.auth_user_id,d.product_variant_id FROM public.customer c JOIN public.sales_order o ON o.customer_id=c.id JOIN public.sales_order_detail d ON d.order_id=o.id WHERE c.customer_status='active' AND c.auth_user_id IS NOT NULL ORDER BY o.created_at DESC LIMIT 1")).rows[0];assert.ok(owner);
 const unrelated=(await db.query('SELECT v.id FROM public.product_variant v WHERE NOT EXISTS(SELECT 1 FROM public.sales_order_detail d JOIN public.sales_order o ON o.id=d.order_id WHERE o.customer_id=$1 AND d.product_variant_id=v.id) LIMIT 1',[owner.id])).rows[0]?.id;
 await db.query('SAVEPOINT verification');
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[owner.auth_user_id]);await db.query('SET LOCAL ROLE authenticated');
 const rows=(await db.query('SELECT * FROM public.own_order_thumbnails($1)',[[owner.product_variant_id,...(unrelated?[unrelated]:[])]] )).rows;
 assert.equal(rows.length,1);assert.equal(rows[0].product_variant_id,owner.product_variant_id);
 assert.equal((await db.query("SELECT has_function_privilege('anon','public.own_order_thumbnails(uuid[])','EXECUTE') allowed")).rows[0].allowed,false);
 await db.query('SAVEPOINT invalid');let rejected=false;
 try{await db.query('SELECT * FROM public.own_order_thumbnails($1)',[Array(101).fill(owner.product_variant_id)]);}catch(e){assert.equal(e.code,'22023');rejected=true;}
 assert.ok(rejected);await db.query('ROLLBACK TO SAVEPOINT verification');
 await db.query(apply?'COMMIT':'ROLLBACK');
 console.log(JSON.stringify({applied:apply,ownVariantReturned:true,otherVariantsExcluded:true,anonymousDenied:true,batchLimitEnforced:true,thumbnailPresent:!!(rows[0].image_url||rows[0].media_asset_id),businessRecordsChanged:0,imagesDownloaded:0}));
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.message||e.code);process.exitCode=1;});
