'use strict';
const fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto');
async function main(){let cloud;try{
 if(process.argv[2]==='apply'){
  const sql=fs.readFileSync('scripts/database/v1/201_content_media.sql','utf8'),draft=fs.readFileSync('scripts/database/v1/202_ticket_draft_media_access.sql','utf8'),report=JSON.parse(fs.readFileSync('docs/media/phase5-content-database.txt'));
  if(report.status!=='PASS'||report.checksum!==crypto.createHash('sha256').update(sql).digest('hex')||report.draftChecksum!==crypto.createHash('sha256').update(draft).digest('hex'))throw Error('TEST_REQUIRED');
  const before=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/content-before.private.json'));
  cloud=await require('../database/v1/service_import_connection.cjs').connect();await cloud.query('BEGIN');await cloud.query("SET LOCAL lock_timeout='3s'");
  for(const row of before.defs){const actual=(await cloud.query('SELECT pg_get_functiondef($1::regprocedure) definition',[row.signature])).rows;if(actual[0]?.definition!==row.definition)throw Error('FUNCTION_DRIFT');}
  const oldManage=fs.readFileSync('scripts/database/v1/199_review_media.sql','utf8').match(/CREATE OR REPLACE FUNCTION pawpal_private.media_session_manage[\s\S]*?END \$function\$/)[0];
  const actualManage=(await cloud.query("SELECT pg_get_functiondef('pawpal_private.media_session_manage(uuid,uuid,boolean)'::regprocedure) definition")).rows[0].definition;
  if(actualManage.trim()!==oldManage.trim())throw Error('SESSION_ACCESS_DRIFT');
  const constraints=(await cloud.query("SELECT conname,pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conrelid='public.media_upload_session'::regclass AND conname IN ('media_upload_session_check','media_upload_session_purpose_check') ORDER BY conname")).rows;
  if(JSON.stringify(constraints)!==JSON.stringify(before.constraints))throw Error('CONSTRAINT_DRIFT');
  for(const statement of [sql,draft])await cloud.query(statement.replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,''));await cloud.query("NOTIFY pgrst,'reload schema'");await cloud.query('COMMIT');
  fs.writeFileSync('docs/media/phase5-content-cloud.txt',JSON.stringify({status:'APPLIED',checksum:report.checksum,draftChecksum:report.draftChecksum,businessFixtureWrites:false,productionDeploymentChanged:false},null,2));console.log('CONTENT_AND_DRAFT_ACCESS_CLOUD_APPLIED');return;
 }
 const m=JSON.parse(fs.readFileSync('docs/media/phase3-database.private.txt'));if(!/^pawpal_media_s3_[a-f0-9]{12}$/.test(m.database))throw Error('DATABASE_SCOPE');
 const run=input=>cp.execFileSync('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d',m.database,'-X','-qAt','-v','ON_ERROR_STOP=1','-f','-'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000});
 if(run("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database();").trim()!==m.owner)throw Error('OWNERSHIP');
 const strip=s=>s.replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
 const helper=fs.readFileSync('scripts/database/v1/073_customer_support.sql','utf8').match(/CREATE OR REPLACE FUNCTION pawpal_private.customer_support_owner\(\)[\s\S]*?END \$\$;/)[0];
 const sql=fs.readFileSync('scripts/database/v1/201_content_media.sql','utf8');
 const draft=fs.readFileSync('scripts/database/v1/202_ticket_draft_media_access.sql','utf8');
 const body=helper+'\n'+['198_private_evidence_media.sql','199_review_media.sql','200_review_media_cache.sql','201_content_media.sql','202_ticket_draft_media_access.sql'].map(f=>strip(fs.readFileSync('scripts/database/v1/'+f,'utf8'))).join('\n');
 const checks=fs.readFileSync('scripts/test/media_stage3_checks.sql','utf8').replace('BEGIN;',()=> 'BEGIN;\n'+body).replace("ROLLBACK;\nSELECT 'MEDIA_DATABASE_CHECKS_PASS';",()=>fs.readFileSync('scripts/test/media_content_checks.sql','utf8')+"\nROLLBACK;\nSELECT 'CONTENT_MEDIA_PASS';");
 if(!run(checks).includes('CONTENT_MEDIA_PASS'))throw Error('CHECKS');
 const undo=strip(fs.readFileSync('scripts/database/v1/201_content_media.rollback.sql','utf8'));
 if(!run('BEGIN;\n'+body+'\n'+undo+'\n'+strip(sql)+'\nROLLBACK;\nSELECT \'CONTENT_REAPPLY_PASS\';').includes('CONTENT_REAPPLY_PASS'))throw Error('ROLLBACK_REAPPLY');
 fs.writeFileSync('docs/media/phase5-content-database.txt',JSON.stringify({status:'PASS',checksum:crypto.createHash('sha256').update(sql).digest('hex'),draftChecksum:crypto.createHash('sha256').update(draft).digest('hex'),cloudApplied:false,fixturesRolledBack:true,checks:['wrong target denied','banner public only active and within dates','Admin reads hidden content','one source per slot','replacement retains old file','blog draft and scheduling private','published article public','staff upload denied','rollback/reapply','own pre-ticket draft read and cancellation','wrong owner denied pre-ticket draft']},null,2));console.log('CONTENT_MEDIA_DATABASE_PASS');
}catch(error){try{await cloud?.query('ROLLBACK');}catch{}fs.writeFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/content-error.private.txt',String(error.stderr||error.message));console.error('CONTENT_MEDIA_DATABASE_FAILED');process.exitCode=1;}finally{await cloud?.end();}}
main();
