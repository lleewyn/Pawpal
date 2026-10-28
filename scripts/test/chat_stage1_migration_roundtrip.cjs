const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
if(!process.argv.includes('--local-only')){console.log('No connection. Use --local-only.');process.exit(0);}
const out='docs/chatbot/stage1-final-races-2026-10-28',env=JSON.parse(fs.readFileSync(out+'/local-environment.txt','utf8'));
if(env.status!=='READY'||!/^pawpal_chatbot_g0_[a-f0-9]{12}$/.test(env.database))throw Error('invalid_fixture');
const sql=text=>execFileSync('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d',env.database,'-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f','-'],{input:text,encoding:'utf8',windowsHide:true,timeout:15000,stdio:['pipe','pipe','pipe']}).trim();
assert.equal(sql("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database();"),env.ownerMarker);
const digest=()=>sql("SELECT md5(pg_get_functiondef('public.adjust_admin_chat_points(uuid,uuid,timestamptz,uuid,integer)'::regprocedure));");
const before=digest();sql(fs.readFileSync('scripts/database/v1/135_chat_compensation_case_limit.sql','utf8'));const applied=digest();assert.notEqual(before,applied);
sql(fs.readFileSync('scripts/database/v1/135_chat_compensation_case_limit.rollback.sql','utf8'));const restored=digest();assert.equal(restored,before);
fs.writeFileSync(out+'/migration-roundtrip.txt',JSON.stringify({capturedAt:new Date().toISOString(),scope:'Marker-owned local clone only; no Cloud',status:'PASS',before,applied,restored,warning:'Rollback restores the old cumulative-cap vulnerability; use only as reviewed rollback, not a final fix.'},null,2)+'\n');
console.log('PASS local migration and rollback function fingerprint roundtrip.');
