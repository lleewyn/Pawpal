'use strict';
const fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto');
async function main(){let cloud;try{
 if(process.argv[2]==='apply-cache'){
  const sql=fs.readFileSync('scripts/database/v1/200_review_media_cache.sql','utf8'),report=JSON.parse(fs.readFileSync('docs/media/phase5-review-database.txt'));
  if(report.status!=='PASS'||report.cacheChecksum!==crypto.createHash('sha256').update(sql).digest('hex'))throw Error('CACHE_TEST_REQUIRED');
  const original=fs.readFileSync('scripts/database/v1/199_review_media.sql','utf8').match(/CREATE OR REPLACE FUNCTION public.resolve_media_asset[\s\S]*?END \$function\$/)[0];
  cloud=await require('../database/v1/service_import_connection.cjs').connect();await cloud.query('BEGIN');await cloud.query("SET LOCAL lock_timeout='3s'");
  const actual=(await cloud.query("SELECT pg_get_functiondef('public.resolve_media_asset(uuid)'::regprocedure) definition")).rows[0].definition;
  if(actual.trim()!==original.trim())throw Error('CACHE_FUNCTION_DRIFT');
  await cloud.query(sql.replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,''));await cloud.query('COMMIT');
  fs.writeFileSync('docs/media/phase5-review-cache-cloud.txt',JSON.stringify({status:'APPLIED',checksum:report.cacheChecksum,businessFixtureWrites:false,reviewPublicCache:false},null,2));console.log('REVIEW_CACHE_CLOUD_APPLIED');return;
 }
 if(process.argv[2]==='apply'){
  const sql=fs.readFileSync('scripts/database/v1/199_review_media.sql','utf8'),report=JSON.parse(fs.readFileSync('docs/media/phase5-review-database.txt'));
  if(report.status!=='PASS'||report.checksum!==crypto.createHash('sha256').update(sql).digest('hex'))throw Error('TEST_REQUIRED');
  const before=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/review-before.private.json'));
  cloud=await require('../database/v1/service_import_connection.cjs').connect();await cloud.query('BEGIN');await cloud.query("SET LOCAL lock_timeout='3s'");
  for(const row of before.defs){const actual=(await cloud.query('SELECT pg_get_functiondef($1::regprocedure) definition',[row.signature])).rows;if(actual[0]?.definition!==row.definition)throw Error('FUNCTION_DRIFT');}
  const constraints=(await cloud.query("SELECT conname,pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conrelid='public.media_upload_session'::regclass AND conname IN ('media_upload_session_check','media_upload_session_purpose_check') ORDER BY conname")).rows;
  if(JSON.stringify(constraints)!==JSON.stringify(before.constraints))throw Error('CONSTRAINT_DRIFT');
  await cloud.query(sql.replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,''));await cloud.query("NOTIFY pgrst,'reload schema'");await cloud.query('COMMIT');
  fs.writeFileSync('docs/media/phase5-review-cloud.txt',JSON.stringify({status:'APPLIED',checksum:report.checksum,businessFixtureWrites:false,productionDeploymentChanged:false},null,2));console.log('REVIEW_MEDIA_CLOUD_APPLIED');return;
 }
 const m=JSON.parse(fs.readFileSync('docs/media/phase3-database.private.txt'));if(!/^pawpal_media_s3_[a-f0-9]{12}$/.test(m.database))throw Error('DATABASE_SCOPE');
 const run=input=>cp.execFileSync('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d',m.database,'-X','-qAt','-v','ON_ERROR_STOP=1','-f','-'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000});
 if(run("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database();").trim()!==m.owner)throw Error('OWNERSHIP');
 const strip=s=>s.replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
 const dependencies=fs.readFileSync('scripts/database/v1/073_customer_support.sql','utf8').match(/CREATE OR REPLACE FUNCTION pawpal_private.customer_support_owner\(\)[\s\S]*?END \$\$;/)[0];
 const migration=fs.readFileSync('scripts/database/v1/199_review_media.sql','utf8');
 const cache=fs.readFileSync('scripts/database/v1/200_review_media_cache.sql','utf8');
 const body=dependencies+'\n'+strip(fs.readFileSync('scripts/database/v1/198_private_evidence_media.sql','utf8'))+'\n'+strip(migration)+'\n'+strip(cache);
 const base=fs.readFileSync('scripts/test/media_stage3_checks.sql','utf8');
 const checks=base.replace('BEGIN;',()=> 'BEGIN;\n'+body).replace("ROLLBACK;\nSELECT 'MEDIA_DATABASE_CHECKS_PASS';",()=>fs.readFileSync('scripts/test/media_review_checks.sql','utf8')+"\nROLLBACK;\nSELECT 'REVIEW_MEDIA_PASS';");
 if(!run(checks).includes('REVIEW_MEDIA_PASS'))throw Error('CHECKS');
 const rollback=strip(fs.readFileSync('scripts/database/v1/199_review_media.rollback.sql','utf8'));
 if(!run('BEGIN;\n'+body+'\n'+rollback+'\n'+strip(migration)+'\nROLLBACK;\nSELECT \'REVIEW_REAPPLY_PASS\';').includes('REVIEW_REAPPLY_PASS'))throw Error('ROLLBACK_REAPPLY');
 fs.writeFileSync('docs/media/phase5-review-database.txt',JSON.stringify({status:'PASS',checksum:crypto.createHash('sha256').update(migration).digest('hex'),cacheChecksum:crypto.createHash('sha256').update(cache).digest('hex'),cloudApplied:false,fixturesRolledBack:true,checks:['atomic sales and service review/media save','retry attaches once','pending private to owner','wrong owner denied','publication opens binary and metadata','hiding revokes binary and metadata','cannot append upload after submission','review image uses no public cache','rollback/reapply']},null,2));console.log('REVIEW_MEDIA_DATABASE_PASS');
}catch(error){try{await cloud?.query('ROLLBACK');}catch{}fs.writeFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/review-error.private.txt',String(error.stderr||error.message));console.error('REVIEW_MEDIA_DATABASE_FAILED');process.exitCode=1;}finally{await cloud?.end();}}
main();
