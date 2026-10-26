const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {connect}=require('./service_import_connection.cjs');
const {variantArtwork,productArtwork}=require('./product_variant_artwork.cjs');
(async()=>{
 const db=await connect();try{
  await db.query("BEGIN;SET LOCAL lock_timeout='10s';SELECT pg_advisory_xact_lock(20261025,99)");
  const rows=(await db.query("SELECT p.id product_id,v.id,v.sku_variant,v.variant_name FROM public.product p JOIN public.product_variant v ON v.product_id=p.id WHERE p.product_code='PK-BALO-05' AND v.status='active' AND NOT v.catalog_retired ORDER BY v.sku_variant FOR UPDATE OF p,v")).rows;
  assert.equal(rows.length,2);assert.equal(rows[0].variant_name,'Xanh');assert.equal(rows[1].variant_name,'Hồng');
  const ids=rows.map(v=>v.id),productId=rows[0].product_id;
  const before=(await db.query('SELECT * FROM public.product_variant_media WHERE product_variant_id=ANY($1::uuid[])',[ids])).rows;
  const parentBefore=(await db.query('SELECT * FROM public.product_media WHERE product_id=$1',[productId])).rows;
  const backup=path.join(os.tmpdir(),'pawpal-backpack-media-'+Date.now()+'.private.txt');fs.writeFileSync(backup,JSON.stringify({variants:before,parent:parentBefore},null,2));
  for(const v of rows){
   const images=variantArtwork[v.sku_variant];assert.ok(images?.length);
   for(const image of images)assert.ok(fs.existsSync(path.resolve(__dirname,'../../..','.'+image)));
   await db.query('DELETE FROM public.product_variant_media WHERE product_variant_id=$1',[v.id]);
   await db.query('INSERT INTO public.product_variant_media(product_variant_id,image_url,display_order,is_thumbnail) SELECT $1,url,ord-1,ord=1 FROM unnest($2::text[]) WITH ORDINALITY t(url,ord)',[v.id,images]);
  }
  await db.query('DELETE FROM public.product_media WHERE product_id=$1',[productId]);
  await db.query('INSERT INTO public.product_media(product_id,image_url,display_order,is_thumbnail) SELECT $1,url,ord-1,ord=1 FROM unnest($2::text[]) WITH ORDINALITY t(url,ord)',[productId,productArtwork('PK-BALO-05')]);
  const catalog=(await db.query('SELECT public.customer_shop_catalog() data')).rows[0].data;
  const p=catalog.find(p=>p.id===productId);assert.equal(p.product_variant.length,2);
  for(const v of p.product_variant)assert.deepEqual(v.image_urls,variantArtwork[v.sku_variant]);
  await db.query('COMMIT');console.log('PASS backpack: green and pink have separate verified images; shared gallery retains all five product images. Product, SKU, prices and stock unchanged. Backup:',backup);
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
