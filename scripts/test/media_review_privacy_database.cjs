'use strict';
const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
(async()=>{let db;try{
 const sql=fs.readFileSync('scripts/database/v1/197_review_media_privacy.sql','utf8'),hash=crypto.createHash('sha256').update(sql).digest('hex');
 if(process.argv[2]==='apply'){
  const tested=JSON.parse(fs.readFileSync('docs/media/phase5-review-privacy-database.txt'));if(tested.checksum!==hash||tested.status!=='PASS')throw Error('TEST_REQUIRED');
  db=await require('../database/v1/service_import_connection.cjs').connect();
  const original=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/domain-before.private.json')).policies;
  const current=(await db.query("SELECT * FROM pg_policies WHERE schemaname='public' AND tablename='review_media'")).rows;
  if(JSON.stringify(current)!==JSON.stringify(original))throw Error('POLICY_DRIFT');
  await db.query(sql);console.log('REVIEW_METADATA_PRIVACY_CLOUD_APPLIED');
 }else{
  const m=JSON.parse(fs.readFileSync('docs/media/phase3-database.private.txt'));if(!/^pawpal_media_s3_[a-f0-9]{12}$/.test(m.database))throw Error('SCOPE');
  const run=input=>cp.execFileSync('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d',m.database,'-X','-qAt','-v','ON_ERROR_STOP=1','-f','-'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000});
  if(run("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database();").trim()!==m.owner)throw Error('OWNERSHIP');
  const exists=run("SELECT to_regprocedure('pawpal_private.can_read_review_media(uuid)') IS NOT NULL;").trim()==='t';
  if(!exists)run(sql);else run('GRANT SELECT ON public.review_media TO anon,authenticated;');
  const checks=fs.readFileSync('scripts/test/media_stage3_checks.sql','utf8').replace("ROLLBACK;\nSELECT 'MEDIA_DATABASE_CHECKS_PASS';",fs.readFileSync('scripts/test/media_review_privacy_checks.sql','utf8')+"\nROLLBACK;\nSELECT 'REVIEW_PRIVACY_PASS';");
  if(!run(checks).includes('REVIEW_PRIVACY_PASS'))throw Error('CHECKS');
  fs.writeFileSync('docs/media/phase5-review-privacy-database.txt',JSON.stringify({status:'PASS',checksum:hash,cloudFixtureWrites:false,checks:['pending images deny anon and wrong customer','owner reads own pending metadata','published public','hidden revoked']},null,2));console.log('REVIEW_PRIVACY_DATABASE_PASS');
 }
}catch(error){fs.writeFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/review-privacy-error.private.txt',String(error.stderr||error.message));console.error('REVIEW_PRIVACY_STEP_FAILED');process.exitCode=1;}finally{await db?.end();}})();
