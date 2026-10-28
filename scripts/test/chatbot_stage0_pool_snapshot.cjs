// One aggregate metadata snapshot, not Logs and not a load test.
const fs=require('node:fs');
if(!process.argv.includes('--cloud-metadata')){console.log('No connection. Pass --cloud-metadata for one aggregate snapshot.');process.exit(0);}
const {connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{let db;const result={capturedAt:new Date().toISOString(),scope:'One read-only aggregate; no query text, users, PII, Logs or business rows; not a capacity guarantee.'};
 try{db=await connect();await db.query('BEGIN READ ONLY');await db.query("SET LOCAL statement_timeout='3s'");
  result.snapshot=(await db.query(`SELECT current_setting('max_connections')::int max_connections,
   current_setting('superuser_reserved_connections')::int superuser_reserved_connections,
   current_setting('reserved_connections',true) reserved_connections,
   pg_has_role(current_user,'pg_read_all_stats','MEMBER') full_stats_visibility,
   count(*) FILTER(WHERE backend_type='client backend') client_backends,
   count(*) FILTER(WHERE backend_type='client backend' AND datname=current_database()) current_database_clients,
   count(*) FILTER(WHERE backend_type='client backend' AND state='active') visible_active_clients,
   count(*) FILTER(WHERE backend_type='client backend' AND state IS NULL) hidden_client_states
   FROM pg_stat_activity`)).rows[0];await db.query('ROLLBACK');result.status='CAPTURED';
 }catch(e){if(db)await db.query('ROLLBACK').catch(()=>{});result.status='UNAVAILABLE';result.error={name:e.name,code:e.code||null};process.exitCode=1;}finally{if(db)await db.end();}
 fs.writeFileSync('docs/chatbot/stage0-2026-10-28/pool-snapshot.txt',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
})();
