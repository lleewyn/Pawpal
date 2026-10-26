// Explicit Cloud deployment entry point; never called by tests or npm start.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('./service_import_connection.cjs');
if(!process.argv.includes('--apply-cloud')){console.log('Use --apply-cloud to deploy reviewed migration 107. No connection made.');process.exit(0);}
(async()=>{const db=await connect();try{
 const migration=fs.readFileSync('scripts/database/v1/107_refund_reward_points.sql','utf8');
 await db.query("SET statement_timeout='8s';SET lock_timeout='3s'");
 await db.query(migration);
 const rows=(await db.query(`SELECT proname,prosecdef,pg_get_functiondef(oid) AS definition FROM pg_proc
 WHERE oid IN('public.get_admin_sales_cashier(uuid)'::regprocedure,'public.get_admin_service_cashier(uuid)'::regprocedure,
 'public.post_admin_sales_money(uuid,uuid,text,text,jsonb)'::regprocedure,'public.post_admin_service_money(uuid,uuid,text,text,jsonb)'::regprocedure)`)).rows;
 assert.equal(rows.length,4);
 for(const row of rows){assert.equal(row.prosecdef,true);assert.ok(row.definition.includes(row.proname.startsWith('get_')?'pawpal_private.refund_loyalty_state(p.id)':'pawpal_private.record_refund_loyalty(p_request_id'));}
 const report={timestamp:new Date().toISOString(),environment:'Supabase Cloud cpzuvaplseielhgcnqrn',migration:'107_refund_reward_points.sql',sha256:crypto.createHash('sha256').update(migration).digest('hex'),status:'APPLIED',functions:rows.map(r=>r.proname),scope:'Function DDL only; existing payment/refund/reward rows unchanged; no real money or Logs'};
 fs.writeFileSync('docs/verification/sync/refund-rewards-cloud-apply.txt',JSON.stringify(report,null,2)+'\n');
 console.log('APPLIED migration 107; verified both getters and both money RPCs. Existing rows unchanged.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});console.error(e.code||'',e.message);process.exitCode=1;}finally{await db.end();}})().catch(e=>{console.error(e.code||'connection_failed');process.exitCode=1;});
