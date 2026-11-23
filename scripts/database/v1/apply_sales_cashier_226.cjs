// Restore the missing return-refund RPC used by the sales cashier. No business-row writes.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {connect}=require('./service_import_connection.cjs');
if(!process.argv.includes('--check-cloud')&&!process.argv.includes('--apply-cloud'))process.exit(0);
(async()=>{const db=await connect();try{
 await db.query("BEGIN; SET LOCAL statement_timeout='8s'; SET LOCAL lock_timeout='3s'");
 const exists=(await db.query("SELECT to_regprocedure('public.get_admin_sales_return_refunds(uuid)') IS NOT NULL ready")).rows[0].ready;
 if(!exists){
  const sql=fs.readFileSync('scripts/database/v1/226_sales_return_refund_limit.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,'');
  await db.query(sql);
 }
 const checks=(await db.query(`SELECT
  to_regprocedure('public.get_admin_sales_return_refunds(uuid)') IS NOT NULL rpc_exists,
  has_function_privilege('authenticated','public.get_admin_sales_return_refunds(uuid)','EXECUTE') admin_rpc,
  NOT has_function_privilege('anon','public.get_admin_sales_return_refunds(uuid)','EXECUTE') anon_blocked,
  strpos(pg_get_functiondef('public.post_admin_sales_money(uuid,uuid,text,text,jsonb)'::regprocedure),'work_guard_rpc')>0 money_guard_preserved,
  strpos(pg_get_functiondef('public.post_admin_sales_money(uuid,uuid,text,text,jsonb)'::regprocedure),'sales_refund_return_limit')>0 refund_cap,
  strpos(pg_get_functiondef('public.post_admin_sales_money(uuid,uuid,text,text,jsonb)'::regprocedure),'record_refund_loyalty')>0 loyalty_preserved
 `)).rows[0];assert.ok(Object.values(checks).every(Boolean));
 const applied=process.argv.includes('--apply-cloud');await db.query(applied?'COMMIT':'ROLLBACK');
 console.log(JSON.stringify({status:applied?'APPLIED':'ROLLBACK CHECK PASSED',alreadyInstalled:exists,checks}));
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code,e.message);process.exitCode=1;});
