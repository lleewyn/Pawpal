'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
test('public review readers request only published metadata, preserve safe links and reject unsafe legacy URLs',async()=>{
 const id='94000000-0000-0000-0000-000000000001',asset='33333333-3333-4333-8333-333333333333',filters=[];
 const db={rpc:async()=>({data:[{id,rating:5,review_content:'Published review'}]}),from:table=>{
  assert.equal(table,'review_media');const q={select:s=>{assert.match(s,/review_id!inner\(review_status\)/);return q;},in:(key,value)=>{filters.push({key,value});return q;},order:async()=>({data:[{review_id:id,media_asset_id:asset},{review_id:id,image_url:'https://example.test/safe.jpg'},{review_id:id,image_url:'javascript:alert(1)'},{review_id:id,image_url:'https://example.test/unsafe\".jpg'},{review_id:id,image_url:'https://example.test/dual.jpg',media_asset_id:asset}]})};return q;
 }};
 const win={SupabaseClient:db,getSupabaseClient:()=>db},file=pathToFileURL(path.resolve('scripts/shared/media-source.mjs')).href;
 const source=fs.readFileSync('scripts/shared/data-loader.js','utf8').replace("import('/scripts/shared/media-source.mjs')",'import('+JSON.stringify(file)+')');
 new Function('window',source)(win);
 const product=await win.DataLoader.getProductReviews('product'),service=await win.DataLoader.getServiceReviews('service');
 const expected=['/api/media?action=read&id='+asset,'https://example.test/safe.jpg'];
 assert.deepEqual(product[0].media,expected);assert.equal(product[0].hasMedia,true);assert.deepEqual(service[0].images,expected);
 assert.equal(filters.filter(f=>f.key==='review.review_status').length,2);
 for(const f of filters.filter(f=>f.key==='review.review_status'))assert.deepEqual(f.value,['published','approved','da_duyet']);
});
