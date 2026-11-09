'use strict';
const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const strip=s=>s.replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
async function main(){let cloud;try{
 const sql=fs.readFileSync('scripts/database/v1/203_chat_media.sql','utf8'),checksum=crypto.createHash('sha256').update(sql).digest('hex');
 if(process.argv[2]==='apply'){
  const report=JSON.parse(fs.readFileSync('docs/media/phase5-chat-database.txt'));if(report.status!=='PASS'||report.checksum!==checksum)throw Error('TEST_REQUIRED');
  const before=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/chat-before.private.json'));
  cloud=await require('../database/v1/service_import_connection.cjs').connect();await cloud.query('BEGIN');await cloud.query("SET LOCAL lock_timeout='3s'");
  for(const r of before.defs){const actual=(await cloud.query('SELECT pg_get_functiondef($1::regprocedure) definition',[r.signature])).rows[0];if(actual?.definition!==r.definition)throw Error('FUNCTION_DRIFT');}
  await cloud.query(strip(sql));await cloud.query("NOTIFY pgrst,'reload schema'");await cloud.query('COMMIT');
  fs.writeFileSync('docs/media/phase5-chat-cloud.txt',JSON.stringify({status:'APPLIED',checksum,businessFixtureWrites:false,productionDeploymentChanged:false},null,2));console.log('CHAT_MEDIA_CLOUD_APPLIED');return;
 }
 const m=JSON.parse(fs.readFileSync('docs/media/phase3-database.private.txt'));if(!/^pawpal_media_s3_[a-f0-9]{12}$/.test(m.database))throw Error('DATABASE_SCOPE');
 const run=input=>cp.execFileSync('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d',m.database,'-X','-qAt','-v','ON_ERROR_STOP=1','-f','-'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000});
 if(run("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()").trim()!==m.owner)throw Error('OWNERSHIP');
 const helper=fs.readFileSync('scripts/database/v1/073_customer_support.sql','utf8').match(/CREATE OR REPLACE FUNCTION pawpal_private.customer_support_owner\(\)[\s\S]*?END \$\$;/)[0];
 const baseline=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/chat-before.private.json')).defs.filter(x=>['post_public_chat_message','act_admin_chat'].includes(x.proname)).map(x=>x.definition+';').join('\n');
 const body=helper+"\nALTER TABLE public.chat_conversation ADD COLUMN IF NOT EXISTS bot_unhandled_count integer NOT NULL DEFAULT 0;\n"+baseline+'\n'+['198_private_evidence_media.sql','199_review_media.sql','200_review_media_cache.sql','201_content_media.sql','202_ticket_draft_media_access.sql','203_chat_media.sql'].map(f=>strip(fs.readFileSync('scripts/database/v1/'+f,'utf8'))).join('\n');
 const checks=fs.readFileSync('scripts/test/media_stage3_checks.sql','utf8').replace('BEGIN;',()=> 'BEGIN;\n'+body).replace("ROLLBACK;\nSELECT 'MEDIA_DATABASE_CHECKS_PASS';",()=>fs.readFileSync('scripts/test/media_chat_checks.sql','utf8')+"\nROLLBACK;\nSELECT 'CHAT_MEDIA_PASS';");
 if(!run(checks).includes('CHAT_MEDIA_PASS'))throw Error('CHECKS');
 if(!run('BEGIN;\n'+body+'\n'+strip(fs.readFileSync('scripts/database/v1/203_chat_media.rollback.sql','utf8'))+'\n'+strip(sql)+"\nROLLBACK;\nSELECT 'CHAT_REAPPLY_PASS';").includes('CHAT_REAPPLY_PASS'))throw Error('ROLLBACK');
 fs.writeFileSync('docs/media/phase5-chat-database.txt',JSON.stringify({status:'PASS',checksum,fixturesRolledBack:true,checks:['guest/member authorization','wrong guest and wrong message denied','message plus image atomic rollback','idempotent retry and payload conflict','guest revocation and expiry','private read','assigned staff scope and reassignment','shared quota','rollback/reapply']},null,2));console.log('CHAT_MEDIA_DATABASE_PASS');
 }catch(e){try{await cloud?.query('ROLLBACK');}catch{}fs.writeFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/chat-error.private.txt',String(e.stderr||e.message));console.error('CHAT_MEDIA_DATABASE_FAILED');process.exitCode=1;}finally{await cloud?.end();}}
main();
