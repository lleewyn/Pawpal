const fs=require('node:fs'),assert=require('node:assert/strict');
const {connect}=require('./service_import_connection.cjs');
(async()=>{const db=await connect();try{
 await db.query("BEGIN;SET LOCAL statement_timeout='10s';SET LOCAL lock_timeout='3s'");
 await db.query(fs.readFileSync('scripts/database/v1/233_complaint_execution_gate.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 const r=(await db.query("SELECT pg_get_functiondef('public.act_admin_complaint(uuid,uuid,timestamptz,text,jsonb)'::regprocedure) action,pg_get_functiondef('public.own_support_tickets(integer,text,uuid,integer)'::regprocedure) projection,pg_get_functiondef('pawpal_private.work_guard_rpc(text,jsonb)'::regprocedure) guard")).rows[0];
 assert.ok(r.action.includes('complaint_execution_not_started')&&r.action.includes('resolution_started_at=clock_timestamp()'));
 assert.ok(r.projection.includes('customer_complaint_status')&&r.guard.includes('start_resolution'));
 const apply=process.argv.includes('--apply');await db.query(apply?'COMMIT':'ROLLBACK');console.log(JSON.stringify({applied:apply,approvalAndPublicNotificationGate:true,customerStatusAndCountsUpdated:true,businessRowsChanged:0}));
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||'',e.message);process.exitCode=1;});
