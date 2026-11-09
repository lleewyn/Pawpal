'use strict';
const fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto');
async function main(){let cloud;try{
 if(process.argv[2]==='apply'){
  const sql=fs.readFileSync('scripts/database/v1/198_private_evidence_media.sql','utf8'),report=JSON.parse(fs.readFileSync('docs/media/phase5-evidence-database.txt'));
  if(report.status!=='PASS'||report.checksum!==crypto.createHash('sha256').update(sql).digest('hex'))throw Error('TEST_REQUIRED');
  const before=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/domain-before.private.json')),access=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/evidence-before.private.json'));
  cloud=await require('../database/v1/service_import_connection.cjs').connect();await cloud.query('BEGIN');await cloud.query("SET LOCAL lock_timeout='3s'");
  for(const row of before.defs){const r=await cloud.query('SELECT pg_get_functiondef($1::regprocedure) definition',[row.signature]);if(r.rows[0]?.definition!==row.definition)throw Error('FUNCTION_DRIFT');}
  const policies=(await cloud.query("SELECT * FROM pg_policies WHERE schemaname='public' AND tablename IN ('support_ticket_message_attachment','return_request_evidence')")).rows;
  if(JSON.stringify(policies)!==JSON.stringify(access.policies))throw Error('POLICY_DRIFT');
  const constraints=(await cloud.query("SELECT conname,pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conrelid='public.media_upload_session'::regclass AND conname IN ('media_upload_session_check','media_upload_session_purpose_check') ORDER BY conname")).rows;
  if(JSON.stringify(constraints)!==JSON.stringify(before.constraints))throw Error('CONSTRAINT_DRIFT');
  await cloud.query(sql.replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,''));await cloud.query("NOTIFY pgrst,'reload schema'");await cloud.query('COMMIT');
  fs.writeFileSync('docs/media/phase5-evidence-cloud.txt',JSON.stringify({status:'APPLIED',checksum:report.checksum,businessFixtureWrites:false,productionDeploymentChanged:false},null,2));console.log('PRIVATE_EVIDENCE_CLOUD_APPLIED');return;
 }
 const m=JSON.parse(fs.readFileSync('docs/media/phase3-database.private.txt'));
 if(!/^pawpal_media_s3_[a-f0-9]{12}$/.test(m.database))throw Error('DATABASE_SCOPE');
 const run=input=>cp.execFileSync('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d',m.database,'-X','-qAt','-v','ON_ERROR_STOP=1','-f','-'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000});
 if(run("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database();").trim()!==m.owner)throw Error('OWNERSHIP');
 const sql=fs.readFileSync('scripts/database/v1/198_private_evidence_media.sql','utf8');
 // Exercise migration and fixtures inside a single rollback-only transaction.
 const helper=fs.readFileSync('scripts/database/v1/073_customer_support.sql','utf8').match(/CREATE OR REPLACE FUNCTION pawpal_private.customer_support_owner\(\)[\s\S]*?END \$\$;/)[0];
 const backup=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/domain-before.private.json'));
 const other=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/functions.private.json'));
 const dependencies=[...backup.defs.filter(x=>['reply_own_support_ticket','request_own_return_core'].includes(x.proname)),...other.filter(x=>x.proname==='request_own_sales_return')].map(x=>x.definition+';').join('\n');
 const body=helper+'\n'+dependencies+'\n'+sql.replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, '');
 const base=fs.readFileSync('scripts/test/media_stage3_checks.sql','utf8');
 const checks=base.replace('BEGIN;',()=> 'BEGIN;\n'+body).replace("ROLLBACK;\nSELECT 'MEDIA_DATABASE_CHECKS_PASS';",()=>fs.readFileSync('scripts/test/media_evidence_checks.sql','utf8')+"\nROLLBACK;\nSELECT 'PRIVATE_EVIDENCE_PASS';");
 if(!run(checks).includes('PRIVATE_EVIDENCE_PASS'))throw Error('CHECKS');
 const undo=fs.readFileSync('scripts/database/v1/198_private_evidence_media.rollback.sql','utf8').replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
 if(!run('BEGIN;\n'+body+'\n'+undo+'\n'+body+'\nROLLBACK;\nSELECT \'EVIDENCE_REAPPLY_PASS\';').includes('EVIDENCE_REAPPLY_PASS'))throw Error('ROLLBACK_REAPPLY');
 fs.writeFileSync('docs/media/phase5-evidence-database.txt',JSON.stringify({status:'PASS',checksum:crypto.createHash('sha256').update(sql).digest('hex'),cloudApplied:false,transactionRolledBack:true,checks:['customer upload prepare/claim/finalize','atomic ticket rollback','idempotent attachment','owner read','wrong owner denied','anonymous denied','internal evidence and metadata hidden','legal hold','return quantities roll back with wrong evidence','owner-only return evidence','migration rollback/reapply']},null,2));
 console.log('PRIVATE_EVIDENCE_DATABASE_PASS');
}catch(error){try{await cloud?.query('ROLLBACK');}catch{}fs.writeFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/evidence-error.private.txt',String(error.stderr||error.message));console.error('PRIVATE_EVIDENCE_DATABASE_FAILED');process.exitCode=1;}finally{await cloud?.end();}}
main();
