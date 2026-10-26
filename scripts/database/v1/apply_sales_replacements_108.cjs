// Explicit deployment entry point, never invoked by tests or npm start.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('./service_import_connection.cjs');
if(!process.argv.includes('--apply-cloud')){console.log('Use --apply-cloud to deploy reviewed migration 108. No connection made.');process.exit(0);}
(async()=>{const db=await connect();try{
 const sql=fs.readFileSync('scripts/database/v1/108_sales_replacements.sql','utf8');
 await db.query("SET statement_timeout='8s';SET lock_timeout='3s'");await db.query(sql);
 const {rows}=await db.query(`SELECT
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.sales_replacement'::regclass) AS rls,
  has_table_privilege('authenticated','public.sales_replacement','SELECT') AS can_read,
  has_table_privilege('authenticated','public.sales_replacement','INSERT') AS can_insert,
  strpos(pg_get_functiondef('public.create_admin_sales_replacement(uuid,uuid,timestamptz,jsonb)'::regprocedure),'stock_reservation')>0 AS rpc,
  strpos(pg_get_functiondef('public.post_admin_sales_money(uuid,uuid,text,text,jsonb)'::regprocedure),'sales_replacement_refund_review_required')>0 AS refund_guard,
  EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.sales_order'::regclass AND tgname='sync_sales_replacement' AND NOT tgisinternal) AS sync_trigger`);
 assert.deepEqual(rows[0],{rls:true,can_read:true,can_insert:false,rpc:true,refund_guard:true,sync_trigger:true});
 fs.writeFileSync('docs/verification/sync/sales-replacements-cloud-apply.txt',JSON.stringify({timestamp:new Date().toISOString(),environment:'Supabase Cloud cpzuvaplseielhgcnqrn',migration:'108_sales_replacements.sql',sha256:crypto.createHash('sha256').update(sql).digest('hex'),status:'APPLIED',checks:rows[0],scope:'Schema/functions only; no existing customer/order/payment/inventory rows modified; no actual delivery, money or Logs'},null,2)+'\n');console.log('APPLIED migration 108; RLS, RPC, money guard and RMA sync trigger verified.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});console.error(e.code||'',e.message);process.exitCode=1;}finally{await db.end();}})().catch(e=>{console.error(e.code||'connection_failed');process.exitCode=1;});
