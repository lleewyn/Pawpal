const fs=require('node:fs'),assert=require('node:assert/strict');
const {connect}=require('./service_import_connection.cjs');
(async()=>{const db=await connect();try{
 await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
 const snapshot=async()=>(await db.query("SELECT p.oid::regprocedure::text signature,md5(pg_get_functiondef(p.oid)) definition,has_function_privilege('authenticated',p.oid,'EXECUTE') callable FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_admin_complaint' ORDER BY 1")).rows;
 const before=await snapshot();assert.ok(before.length);
 await db.query(fs.readFileSync('scripts/database/v1/232_retire_chat_complaint.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 const chat=(await db.query("SELECT p.oid::regprocedure::text signature,has_function_privilege('authenticated',p.oid,'EXECUTE') member,has_function_privilege('anon',p.oid,'EXECUTE') anon,has_function_privilege('service_role',p.oid,'EXECUTE') service FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_chat_complaint' ORDER BY 1")).rows;
 assert.ok(chat.length);assert.ok(chat.every(r=>!r.member&&!r.anon&&!r.service));assert.deepEqual(await snapshot(),before);
 for(const fn of chat){await db.query('SAVEPOINT denied');await db.query('SET LOCAL ROLE authenticated');let error;
  try{await db.query('SELECT '+fn.signature.replace(/\((.*)\)/,(_,args)=>'('+args.split(',').map(type=>'NULL::'+type).join(',')+')'));}catch(e){error=e;}
  await db.query('ROLLBACK TO SAVEPOINT denied');assert.equal(error?.code,'42501');
 }
 const apply=process.argv.includes('--apply');await db.query(apply?'COMMIT':'ROLLBACK');console.log(JSON.stringify({applied:apply,chatOverloadsDenied:chat.length,centralComplaintDefinitionsAndPermissionsUnchanged:true,businessRowsChanged:0}));
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||'',e.message);process.exitCode=1;});
