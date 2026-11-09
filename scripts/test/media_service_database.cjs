'use strict';
const fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto');
const file='scripts/database/v1/192_service_media.sql',reportFile='docs/media/phase5-service-database.txt';
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
(async()=>{let cloud;try{
 const migration=fs.readFileSync(file,'utf8');const backup=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-service/before.private.json'));
 if(process.argv[2]==='apply'){
  const report=JSON.parse(fs.readFileSync(reportFile));if(report.status!=='PASS'||report.checksum!==hash(migration))throw Error('TEST_REQUIRED');
  cloud=await require('../database/v1/service_import_connection.cjs').connect();await cloud.query('BEGIN READ ONLY');
  for(const row of backup.defs){const actual=await cloud.query('SELECT pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=$1 AND p.proname=$2',[row.nspname,row.proname]);if(actual.rows.length!==1||actual.rows[0].definition!==row.definition)throw Error('FUNCTION_DRIFT');}
  const data=(await cloud.query('SELECT * FROM public.service_image ORDER BY id')).rows;fs.writeFileSync('D:/Aboutme/Pawpal-infra/media/phase5-service/media-before.private.json',JSON.stringify(data));await cloud.query('ROLLBACK');
  await cloud.query(migration);console.log('SERVICE_MEDIA_CLOUD_APPLIED');
 }else{
  const m=JSON.parse(fs.readFileSync('docs/media/phase3-database.private.txt'));if(!/^pawpal_media_s3_[a-f0-9]{12}$/.test(m.database))throw Error('DATABASE_SCOPE');
  const run=input=>cp.execFileSync('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d',m.database,'-X','-qAt','-v','ON_ERROR_STOP=1','-f','-'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000});
  if(run("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database();").trim()!==m.owner)throw Error('OWNER_SCOPE');
  run(fs.readFileSync('scripts/database/v1/096_service_catalog_final.sql','utf8'));
  if(run("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='media_upload_session' AND column_name='service_id');").trim()==='t')run(fs.readFileSync('scripts/database/v1/192_service_media.rollback.sql','utf8'));
  run(migration);
  const checks=fs.readFileSync('scripts/test/media_stage3_checks.sql','utf8').replace("ROLLBACK;\nSELECT 'MEDIA_DATABASE_CHECKS_PASS';",fs.readFileSync('scripts/test/media_service_checks.sql','utf8')+"\nROLLBACK;\nSELECT 'SERVICE_CHECKS_PASS';");
  if(!run(checks).includes('SERVICE_CHECKS_PASS'))throw Error('CHECKS_FAILED');
  run(fs.readFileSync('scripts/database/v1/192_service_media.rollback.sql','utf8'));run(migration);if(!run(checks).includes('SERVICE_CHECKS_PASS'))throw Error('REAPPLY_FAILED');
  fs.writeFileSync(reportFile,JSON.stringify({status:'PASS',checksum:hash(migration),cloudWrites:false,fixtureTransactionRolledBack:true,checks:['exact service scope','actual service save RPC','retain reference','public directory','inactive service privacy','staff denied','draft service atomic attach','retention','empty rollback and reapply']},null,2));console.log('SERVICE_MEDIA_DATABASE_CHECKS_PASS');
 }
}catch(error){try{await cloud?.query('ROLLBACK');}catch{}fs.writeFileSync('D:/Aboutme/Pawpal-infra/media/phase5-service/error.private.txt',String(error.stderr||error.message));console.error('SERVICE_DATABASE_STEP_FAILED');process.exitCode=1;}finally{await cloud?.end();}})();
