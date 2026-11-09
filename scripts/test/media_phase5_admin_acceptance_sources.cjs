'use strict';
// Read-only preflight: reuse each record's exact original image, without inventing business content.
const fs=require('fs'),path=require('path'),{verifyImage}=require('../api/media_files.cjs');
const dir='D:/Aboutme/Pawpal-infra/media/phase5-remaining';
async function bytesFor(source){
 if(source.startsWith('/assets/')){const file=path.resolve('.'+source),root=path.resolve('assets')+path.sep;if(!file.startsWith(root))throw Error('LOCAL_SOURCE_SCOPE');return fs.readFileSync(file);}
 if(!source.startsWith('https://'))throw Error('SOURCE_TYPE');
 const response=await fetch(source,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('SOURCE_HTTP');
 const chunks=[];let size=0;try{for await(const chunk of response.body){size+=chunk.length;if(size>3145728)throw Error('SOURCE_TOO_LARGE');chunks.push(chunk);}}finally{try{await response.body.cancel();}catch{}}
 return Buffer.concat(chunks,size);
}
(async()=>{let db;try{
 db=await require('../database/v1/service_import_connection.cjs').connect();const result={};
 for(const [kind,table,column,asset]of [['pet_avatar','pet_profile','avatar_url','avatar_media_asset_id'],['banner_image','banner','image_url','image_media_asset_id'],['blog_thumbnail','blog_post','thumbnail_url','thumbnail_media_asset_id']]){
  const rows=(await db.query(`SELECT to_jsonb(t) snapshot FROM public.${table} t WHERE ${column} IS NOT NULL AND ${asset} IS NULL ORDER BY length(${column}),id LIMIT 5`)).rows;
  for(const {snapshot}of rows){try{const bytes=await bytesFor(snapshot[column]);if(!bytes.length||bytes.length>3145728)continue;let mime,proof;
   for(const type of ['image/jpeg','image/png','image/webp'])try{proof=await verifyImage(bytes,type);mime=type;break;}catch{}
   if(!mime)continue;const file=path.join(dir,kind+'-original.private.'+({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[mime]));fs.writeFileSync(file,bytes);
   result[kind]={table,column,assetColumn:asset,snapshot,file,mime,size:bytes.length,sha256:proof.sha256};break;
  }catch{}}
 }
 fs.writeFileSync(path.join(dir,'admin-media-sources.private.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(Object.fromEntries(Object.entries(result).map(([kind,s])=>[kind,{eligible:true,size:s.size,mime:s.mime}]))));
}catch(e){console.error(e.code||e.message);process.exitCode=1;}finally{await db?.end();}})();
