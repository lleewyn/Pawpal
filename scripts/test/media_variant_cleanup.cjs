'use strict';
// One-shot cleanup of the exactly recorded variant acceptance file. No generic public delete route.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {runCli}=require('./media_vercel_preview.cjs');
const {readMediaMongoConfig}=require('../api/media_mongodb.cjs');
(async()=>{let db,request,deploymentId=null;try{
 if(process.argv[2]!=='--variant-execute')throw Error('EXECUTE_REQUIRED');
 const scope=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-variant/cleanup-scope.private.json'));
 if(scope.product_id!=='a0000000-0000-0000-0000-000000000001'||scope.variant_id!=='9b8b1913-f21e-4e3a-8afa-4f6c63fd63e3'||scope.asset_id!=='f469e848-836f-4018-abbf-23c3b26d1a71')throw Error('EXACT_ACCEPTANCE_SCOPE');
 const candidates=[{id:scope.id}];
 db=await require('../database/v1/service_import_connection.cjs').connect();await db.query('BEGIN');
 const claims=[];
 for(const candidate of candidates){
  const row=(await db.query(`SELECT s.id,s.mongo_file_id,s.created_by,s.product_id,s.variant_id,s.appointment_id,s.purpose,s.state,a.legal_hold,a.size_bytes,a.sha256 FROM public.media_upload_session s JOIN public.media_asset a ON a.session_id=s.id WHERE s.id=$1 FOR UPDATE OF s,a`,[candidate.id])).rows[0];
  if(!row||row.created_by!==scope.created_by||row.state!=='pending_delete'||row.legal_hold)throw Error('CLAIM_SCOPE');
  if(row.product_id!==scope.product_id||row.variant_id!==scope.variant_id||row.purpose!=='product_variant_image'||Number(row.size_bytes)!==1385797)throw Error('FILE_SCOPE');
  if((await db.query('SELECT 1 FROM public.product_media WHERE media_asset_id IN (SELECT id FROM public.media_asset WHERE session_id=$1) UNION ALL SELECT 1 FROM public.care_log_media WHERE media_asset_id IN (SELECT id FROM public.media_asset WHERE session_id=$1) UNION ALL SELECT 1 FROM public.product_variant_media WHERE media_asset_id IN (SELECT id FROM public.media_asset WHERE session_id=$1)',[row.id])).rows.length)throw Error('STILL_REFERENCED');
  const lease=crypto.randomUUID();await db.query("UPDATE public.media_upload_session SET state='cleaning',lease=$2,lease_until=now()+interval '15 minutes' WHERE id=$1",[row.id,lease]);await db.query("UPDATE public.media_asset SET status='cleaning' WHERE session_id=$1",[row.id]);
  claims.push({session_id:row.id,mongo_file_id:row.mongo_file_id,sha256:row.sha256,lease});
 }
 await db.query('COMMIT');fs.writeFileSync('D:/Aboutme/Pawpal-infra/media/phase5-variant-cleanup-claims.private.json',JSON.stringify(claims));
 const linked=JSON.parse(fs.readFileSync('.vercel/project.json')),auth=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'))),state=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-variant-preview.private.json'));
 request=async(endpoint,method='GET')=>{const r=await fetch('https://api.vercel.com'+endpoint+'?teamId='+linked.orgId,{method,headers:{Authorization:'Bearer '+auth.token},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('VERCEL_ACCESS');if(r.status===204)return {};return r.json();};
 const config=readMediaMongoConfig(require('dotenv').parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/atlas.private.env'))),token=crypto.randomBytes(32).toString('hex');
 const values={MONGODB_URI:config.uri,MONGODB_DB:config.database,MONGODB_MEDIA_BUCKET:config.bucket,MEDIA_UPLOAD_ENABLED:'false',MEDIA_VIDEO_ENABLED:'false',MEDIA_CLEANUP_TOKEN:token};
 const artifact='D:/Aboutme/Pawpal-infra/media/phase5-variant-cleanup-'+Date.now();fs.mkdirSync(artifact,{recursive:true});
 for(const folder of ['api','scripts/api','.vercel'])fs.mkdirSync(path.join(artifact,folder),{recursive:true});
 fs.writeFileSync(path.join(artifact,'.vercel/project.json'),JSON.stringify(linked));fs.writeFileSync(path.join(artifact,'package.json'),JSON.stringify({private:true,dependencies:{mongodb:'6.21.0',sharp:'0.34.5',busboy:'1.6.0'}}));
 fs.writeFileSync(path.join(artifact,'vercel.json'),JSON.stringify({framework:null,buildCommand:'',outputDirectory:'.',functions:{'api/media-cleanup.js':{maxDuration:30}}}));
 fs.writeFileSync(path.join(artifact,'index.html'),'<title>PawPal private cleanup</title>');
 for(const file of ['media_mongodb.cjs','media_gridfs.cjs','media_files.cjs'])fs.copyFileSync('scripts/api/'+file,path.join(artifact,'scripts/api',file));
 const endpoint=`const {timingSafeEqual}=require('node:crypto'),{ObjectId}=require('mongodb'),{getMediaMongoResources}=require('../scripts/api/media_mongodb.cjs'),{createGridfsStore}=require('../scripts/api/media_gridfs.cjs');const claims=${JSON.stringify(claims)};module.exports=async(req,res)=>{res.setHeader('Cache-Control','no-store');const expected=process.env.MEDIA_CLEANUP_TOKEN,got=req.headers['x-pawpal-cleanup'];if(process.env.VERCEL_ENV!=='preview'||req.method!=='POST'||!expected||typeof got!=='string'||got.length!==expected.length||!timingSafeEqual(Buffer.from(got),Buffer.from(expected)))return res.status(403).json({ok:false});try{const resources=await getMediaMongoResources(),store=createGridfsStore(async()=>resources);for(const c of claims){const id=new ObjectId(c.mongo_file_id),file=await resources.bucket.find({_id:id}).limit(1).next();if(file&&(file.metadata?.sessionId!==c.session_id||file.metadata?.sha256!==c.sha256))throw Error();await store.removeClaimed(c);if(await resources.bucket.find({_id:id}).limit(1).next()||await resources.db.collection(resources.bucketName+'.chunks').countDocuments({files_id:id}))throw Error();}return res.status(200).json({ok:true,deleted:claims.length});}catch{return res.status(503).json({ok:false});}};`;
 fs.writeFileSync(path.join(artifact,'api/media-cleanup.js'),endpoint);
 const cli='C:/Users/QUYEN/AppData/Local/npm-cache/_npx/67eb4586ca667318/node_modules/vercel/dist/vc.js';
 const deployed=await runCli(cli,['deploy','--yes','--target','preview','--no-wait',...Object.keys(values).flatMap(key=>['--env',key])],{cwd:artifact,env:values,timeout:120000});
 const url=deployed.output.match(/https:\/\/[a-z0-9-]+\.vercel\.app/)?.[0];if(!url)throw Error('DEPLOY_FAILED');const deployment=await request('/v13/deployments/'+new URL(url).hostname);deploymentId=deployment.id;if(deployment.target==='production')throw Error('TARGET_SCOPE');
 let ready=false;for(let i=0;i<50;i++){const d=await request('/v13/deployments/'+deploymentId);if(d.readyState==='READY'){ready=true;break;}if(['ERROR','CANCELED'].includes(d.readyState))throw Error('BUILD_FAILED');await new Promise(r=>setTimeout(r,2000));}if(!ready)throw Error('BUILD_TIMEOUT');
 const response=await fetch(url+'/api/media-cleanup',{method:'POST',headers:{'x-pawpal-cleanup':token,'x-vercel-protection-bypass':state.generatedBypass},signal:AbortSignal.timeout(30000)}),proof=await response.json();if(!response.ok||!proof.ok||proof.deleted!==1)throw Error('CLEANUP_FAILED');
 for(const claim of claims)await db.query('SELECT public.finish_media_cleanup($1,$2)',[claim.session_id,claim.lease]);
 fs.writeFileSync('docs/media/phase5-variant-cleanup.txt',JSON.stringify({status:'PASS',exactOwnFilesAndChunksRemoved:1,quotaReleasedBytes:1385797,unrelatedFilesDeleted:0,productionDeploymentChanged:false},null,2));console.log('OWN_VARIANT_TEST_FILE_REMOVED_AND_QUOTA_RELEASED');
}catch(error){try{await db?.query('ROLLBACK');}catch{}fs.writeFileSync('D:/Aboutme/Pawpal-infra/media/phase5-variant-cleanup-error.private.txt',String(error.message));console.error('VARIANT_CLEANUP_FAILED_RECONCILIATION_REQUIRED');process.exitCode=1;}finally{
 if(request&&deploymentId){try{await request('/v13/deployments/'+deploymentId,'DELETE');console.log('TEMPORARY_CLEANUP_DEPLOYMENT_REMOVED');}catch{console.error('TEMPORARY_DEPLOYMENT_CLEANUP_REQUIRED');process.exitCode=1;}}
 await db?.end();}})();
