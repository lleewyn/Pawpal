'use strict';
// Full UI Preview. Upload requires the explicit user-authorized --upload-preview flag.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {runCli}=require('./media_vercel_preview.cjs');
const {readMediaMongoConfig}=require('../api/media_mongodb.cjs');
const dotenv=require('dotenv');
(async()=>{let deploymentId=null;try{
 const linked=JSON.parse(fs.readFileSync('.vercel/project.json'));
 const variantPreview=process.argv.includes('--variant-preview');
 const servicePreview=process.argv.includes('--service-preview');
 const intakePreview=process.argv.includes('--intake-preview');
 const handoverPreview=process.argv.includes('--handover-preview');
 const evidencePreview=process.argv.includes('--evidence-preview');
 const reportFile=evidencePreview?'docs/media/phase5-evidence-preview.txt':handoverPreview?'docs/media/phase5-handover-preview.txt':intakePreview?'docs/media/phase5-intake-preview.txt':servicePreview?'docs/media/phase5-service-preview.txt':variantPreview?'docs/media/phase5-variant-preview.txt':'docs/media/phase4-full-preview.txt';
 const stateFile=evidencePreview?'D:/Aboutme/Pawpal-infra/media/phase5-evidence-preview.private.json':handoverPreview?'D:/Aboutme/Pawpal-infra/media/phase5-handover-preview.private.json':intakePreview?'D:/Aboutme/Pawpal-infra/media/phase5-intake-preview.private.json':servicePreview?'D:/Aboutme/Pawpal-infra/media/phase5-service-preview.private.json':variantPreview?'D:/Aboutme/Pawpal-infra/media/phase5-variant-preview.private.json':'D:/Aboutme/Pawpal-infra/media/phase4-full-preview.private.json';
 const previous=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile)):null;
 const auth=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json')));
 const request=async endpoint=>{const r=await fetch('https://api.vercel.com'+endpoint+'?teamId='+linked.orgId,{headers:{Authorization:'Bearer '+auth.token},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('VERCEL_ACCESS');return r.json();};
 const before=await request('/v9/projects/'+linked.projectId);
 if(before.name!=='pawpal_gr3')throw Error('PROJECT_SCOPE');
 const cloud=dotenv.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/CLOUD-MIGRATION.private.env'));
 if(cloud.DESTINATION_SUPABASE_URL!=='https://cpzuvaplseielhgcnqrn.supabase.co'||!cloud.DESTINATION_SUPABASE_ANON_KEY||!cloud.DESTINATION_SUPABASE_SERVICE_ROLE_KEY)throw Error('CONFIG_SCOPE');
 const mongo=readMediaMongoConfig(dotenv.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/atlas.private.env')));
 const values={PAWPAL_MEDIA_MONGODB_URI:mongo.uri,PAWPAL_MEDIA_MONGODB_DB:mongo.database,PAWPAL_MEDIA_MONGODB_BUCKET:mongo.bucket,
  SUPABASE_URL:cloud.DESTINATION_SUPABASE_URL,SUPABASE_ANON_KEY:cloud.DESTINATION_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:cloud.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,
  PAWPAL_MEDIA_SUPABASE_URL:cloud.DESTINATION_SUPABASE_URL,PAWPAL_MEDIA_SUPABASE_ANON_KEY:cloud.DESTINATION_SUPABASE_ANON_KEY,PAWPAL_MEDIA_SUPABASE_SERVICE_ROLE_KEY:cloud.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,
  PAWPAL_ADMIN_SUPABASE_URL:cloud.DESTINATION_SUPABASE_URL,PAWPAL_ADMIN_SUPABASE_ANON_KEY:cloud.DESTINATION_SUPABASE_ANON_KEY,PAWPAL_ADMIN_SUPABASE_SERVICE_ROLE_KEY:cloud.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,MEDIA_UPLOAD_ENABLED:process.argv.includes('--upload-preview')?'true':'false',MEDIA_VIDEO_ENABLED:'false'};
 const artifact=path.resolve('D:/Aboutme/Pawpal-infra/media/phase4-full-preview-'+Date.now());fs.mkdirSync(artifact,{recursive:true});
 const filter=file=>!/(?:^|[\\/])(?:\.env[^\\/]*|[^\\/]*\.private\.[^\\/]*|node_modules|\.git)(?:[\\/]|$)/i.test(file);
 for(const folder of ['api','assets','components','pages','styles','data','scripts/api','scripts/shared','scripts/vendor','scripts/rag'])fs.cpSync(folder,path.join(artifact,folder),{recursive:true,filter});
 for(const file of ['index.html','package.json','package-lock.json','vercel.json','.vercelignore'])fs.copyFileSync(file,path.join(artifact,file));
 // The unrelated FAB edit belongs to the user and is excluded from this media Preview.
 fs.writeFileSync(path.join(artifact,'components/fab/fab.html'),cp.execFileSync('git',['show','HEAD:components/fab/fab.html'],{windowsHide:true}));
 fs.mkdirSync(path.join(artifact,'.vercel'));fs.writeFileSync(path.join(artifact,'.vercel/project.json'),JSON.stringify(linked));
 const cache=path.join(process.env.LOCALAPPDATA,'npm-cache/_npx');
 const packages=fs.readdirSync(cache).map(name=>path.join(cache,name,'node_modules/vercel/package.json')).filter(file=>fs.existsSync(file)).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs);
 const pkg=JSON.parse(fs.readFileSync(packages[0])),cli=path.resolve(path.dirname(packages[0]),typeof pkg.bin==='string'?pkg.bin:pkg.bin.vercel);
 const result=await runCli(cli,['deploy','--yes','--target','preview','--no-wait',...Object.keys(values).flatMap(key=>['--env',key])],{cwd:artifact,env:values,timeout:120000});
 const urls=result.output.match(/https:\/\/[a-z0-9-]+\.vercel\.app/g)||[];if(!urls.length)throw Error('DEPLOYMENT_FAILED');
 const preview=await request('/v13/deployments/'+new URL(urls[0]).hostname);deploymentId=preview.id;if(preview.target==='production')throw Error('TARGET_SCOPE');
 const report={status:'BUILDING',previewUrl:'https://'+preview.url,deploymentId,uploadEnabled:values.MEDIA_UPLOAD_ENABLED==='true',productionChanged:false,projectEnvironmentChanged:false,unrelatedFabEditExcluded:true,sourceDirectory:artifact};
 fs.writeFileSync(reportFile,JSON.stringify({...report,sourceDirectory:undefined},null,2));
 fs.writeFileSync(stateFile,JSON.stringify({artifact,deploymentId,previewUrl:report.previewUrl,originalBypasses:previous?.originalBypasses||Object.keys(before.protectionBypass||{}),generatedBypass:previous?.generatedBypass,previousDeployments:[...(previous?.previousDeployments||[]),...(previous?[{deploymentId:previous.deploymentId,previewUrl:previous.previewUrl}]:[])]}));
 console.log(JSON.stringify(report));
}catch(error){fs.writeFileSync('D:/Aboutme/Pawpal-infra/media/phase4-preview-error.private.txt',String(error.stack||error.message));console.error(JSON.stringify({status:'FAIL',code:'MEDIA_PREVIEW_PREPARATION_FAILED',deploymentId}));process.exitCode=1;}})();
