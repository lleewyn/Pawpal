const fs=require('node:fs');
const {connect}=require('./service_import_connection.cjs');
(async()=>{
 const db=await connect();
 try{
  await db.query("BEGIN;SET LOCAL statement_timeout='15s';SET LOCAL lock_timeout='3s'");
  const sql=fs.readFileSync('scripts/database/v1/231_sales_cancellation_reason.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,'');
  await db.query(sql);
  const {rows}=await db.query("SELECT has_function_privilege('anon','public.cancel_guest_sales_order(text,uuid,uuid,timestamptz,text,jsonb)','EXECUTE') anon,has_function_privilege('authenticated','public.cancel_guest_sales_order(text,uuid,uuid,timestamptz,text,jsonb)','EXECUTE') member,has_function_privilege('service_role','public.cancel_guest_sales_order(text,uuid,uuid,timestamptz,text,jsonb)','EXECUTE') service");
  if(rows[0].anon||rows[0].member||!rows[0].service)throw Error('Invalid guest RPC privileges');
  await db.query(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');
  console.log(JSON.stringify({applied:process.argv.includes('--apply'),guestPrivileges:rows[0]}));
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
