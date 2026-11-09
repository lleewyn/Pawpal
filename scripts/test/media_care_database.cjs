'use strict';
const fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto');
const migrationFile='scripts/database/v1/190_care_log_media.sql',reportFile='docs/media/phase4-care-database.txt';
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
(async()=>{let cloud;try{
 const migration=fs.readFileSync(migrationFile,'utf8');
 if(process.argv[2]==='apply'){
  const tested=JSON.parse(fs.readFileSync(reportFile));if(tested.status!=='PASS'||tested.checksum!==hash(migration))throw Error('TEST_REQUIRED');
  cloud=await require('../database/v1/service_import_connection.cjs').connect();
  const original=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase4-care/functions.private.json'))[0];
  const actual=await cloud.query("SELECT pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='save_admin_service_care_log'");
  if(actual.rows.length!==1||actual.rows[0].definition!==original.definition)throw Error('FUNCTION_DRIFT');
  await cloud.query(migration);console.log('CARE_MEDIA_CLOUD_APPLIED_UPLOAD_DISABLED');
 }else{
  const m=JSON.parse(fs.readFileSync('docs/media/phase3-database.private.txt'));
  if(!/^pawpal_media_s3_[a-f0-9]{12}$/.test(m.database))throw Error('SCOPE');
  const run=input=>cp.execFileSync('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d',m.database,'-X','-qAt','-v','ON_ERROR_STOP=1','-f','-'],{input,encoding:'utf8',windowsHide:true,timeout:60000,stdio:['pipe','pipe','pipe']});
  if(run("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database();").trim()!==m.owner)throw Error('OWNERSHIP');
  const guards=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase4-care/guards.private.json'));
  run("CREATE TABLE IF NOT EXISTS pawpal_private.work_rpc_catalog(name text PRIMARY KEY,permission_code text); INSERT INTO pawpal_private.work_rpc_catalog VALUES('save_admin_service_care_log','work.service.perform') ON CONFLICT DO NOTHING; SET check_function_bodies=false;\n"+guards.map(x=>x.definition+';').join('\n'));
  run(migration);
  let checks=fs.readFileSync('scripts/test/media_stage3_checks.sql','utf8');
  checks=checks.replace("ROLLBACK;\nSELECT 'MEDIA_DATABASE_CHECKS_PASS';",fs.readFileSync('scripts/test/media_care_checks.sql','utf8')+"\nROLLBACK;\nSELECT 'CARE_MEDIA_CHECKS_PASS';");
  if(!run(checks).includes('CARE_MEDIA_CHECKS_PASS'))throw Error('CHECKS');
  fs.writeFileSync(reportFile,JSON.stringify({status:'PASS',checksum:hash(migration),cloudWrites:false,rolledBackFixtures:true,checks:['real staff role RPC and assignment guard','append verified evidence','retain existing evidence','legal hold','idempotent references','invalid source rollback','customer owner only','anonymous denied']},null,2));console.log('CARE_MEDIA_DATABASE_TESTS_PASS');
 }
}catch(error){fs.writeFileSync('D:/Aboutme/Pawpal-infra/media/phase4-care/error.private.txt',String(error.stderr||error.message));console.error('CARE_MEDIA_DATABASE_STEP_FAILED');process.exitCode=1;}finally{await cloud?.end();}})();
