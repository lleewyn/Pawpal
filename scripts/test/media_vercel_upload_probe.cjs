'use strict';
// Temporary protected Preview only. Every test image is read back and deleted in the same invocation.
const {randomUUID,timingSafeEqual}=require('node:crypto'),{ObjectId}=require('mongodb');
const {readImageUpload,verifyImage}=require('../api/media_files.cjs');
const {createGridfsStore}=require('../api/media_gridfs.cjs');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 const expected=process.env.MEDIA_PREFLIGHT_TOKEN,received=req.headers['x-pawpal-media-probe'];
 if(process.env.VERCEL_ENV!=='preview'||!expected||typeof received!=='string'||received.length!==expected.length||!timingSafeEqual(Buffer.from(received),Buffer.from(expected)))return res.status(403).json({ok:false});
 if(req.method!=='POST')return res.status(405).json({ok:false});
 const store=createGridfsStore();let claim=null,ok=false,cleaned=false;
 try{
  const file=await readImageUpload(req),proof=await verifyImage(file.bytes,file.mime);
  if(proof.width!==2||proof.height!==2)throw Error();
  claim={session_id:randomUUID(),mongo_file_id:new ObjectId().toHexString(),mime_type:file.mime};
  await store.put(claim,file.bytes,proof);
  const bytes=await store.read({...claim,size_bytes:file.bytes.length,sha256:proof.sha256});
  ok=bytes.equals(file.bytes);
 }catch{ok=false;}
 finally{if(claim){try{await store.removeClaimed(claim);cleaned=true;}catch{ok=false;}}}
 return res.status(ok&&cleaned?200:503).json({ok:ok&&cleaned,scope:'image_roundtrip',writes:true,cleaned});
};
