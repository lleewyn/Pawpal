const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {connect}=require('./service_import_connection.cjs');
const root=path.resolve(__dirname,'../../..');
(async()=>{const db=await connect(),apply=process.argv.includes('--apply');
 const folder=path.join(os.tmpdir(),'pawpal-copilot-business-'+Date.now());fs.mkdirSync(folder,{recursive:true});
 try{
  await db.query("BEGIN;SET LOCAL lock_timeout='10s';SET LOCAL statement_timeout='20s'");
  const prior=(await db.query("SELECT p.proname,pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('admin_copilot_facts','adjust_admin_chat_points','admin_copilot_recent_context','admin_copilot_chat_context')")).rows;
  fs.writeFileSync(path.join(folder,'before-functions.private.sql'),prior.map(p=>p.definition+';').join('\n'));
  for(const file of ['101_admin_copilot_facts.sql','102_chat_points_context.sql'])await db.query(fs.readFileSync(path.join(__dirname,file),'utf8'));
  for(const test of ['admin_copilot_facts_rollback.sql','chat_points_context_rollback.sql']){
   await db.query('SAVEPOINT check_fixtures');await db.query(fs.readFileSync(path.join(root,'scripts/test',test),'utf8'));await db.query('ROLLBACK TO SAVEPOINT check_fixtures');await db.query('RELEASE SAVEPOINT check_fixtures');
  }
  const privilege=(await db.query("SELECT p.proname,p.prosecdef,has_function_privilege('anon',p.oid,'EXECUTE') anon,has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('admin_copilot_facts','adjust_admin_chat_points','admin_copilot_recent_context','admin_copilot_chat_context')")).rows;
  if(privilege.length!==4||privilege.some(p=>p.anon||!p.authenticated))throw Error('Unexpected function privileges');
  const signatures={adjust_admin_chat_points:'uuid,uuid,timestamptz,uuid,integer',admin_copilot_facts:'text,jsonb',admin_copilot_recent_context:'uuid',admin_copilot_chat_context:'uuid'};
  const rollback=Object.entries(signatures).map(([name,args])=>{
   const old=prior.find(p=>p.proname===name);
   return old?old.definition+';':'DROP FUNCTION IF EXISTS public.'+name+'('+args+');';
  }).join('\n');
  fs.writeFileSync(path.join(folder,'rollback.private.sql'),'BEGIN;\n'+rollback+"\nNOTIFY pgrst,'reload schema';\nCOMMIT;\n");
  await db.query("NOTIFY pgrst,'reload schema'");await db.query(apply?'COMMIT':'ROLLBACK');
  const report={status:apply?'COMMITTED':'TRIAL ROLLED BACK',functions:privilege,fixtures:'All fixtures rolled back before commit',sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'101_admin_copilot_facts.sql'))).digest('hex')};
  fs.writeFileSync(path.join(folder,'verification.private.txt'),JSON.stringify(report,null,2));console.log(report,'Evidence folder:',folder);
 }catch(e){await db.query('ROLLBACK').catch(()=>{});console.error(e.message,e.where);process.exitCode=1;}finally{await db.end();}
})();
