// Scope: Storage policy/config metadata only, no object rows or file contents.
const fs=require('node:fs'),{connect}=require('./database/v1/service_import_connection.cjs');
(async()=>{let db;try{
 db=await connect();await db.query('BEGIN READ ONLY');await db.query("SET LOCAL statement_timeout='5s'");
 const policies=(await db.query("SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='storage' AND tablename IN ('objects','buckets') ORDER BY 1,2")).rows;
 const buckets=(await db.query('SELECT id,public FROM storage.buckets ORDER BY id LIMIT 30')).rows;
 await db.query('ROLLBACK');
 fs.mkdirSync('docs/security/phase2',{recursive:true});
 fs.writeFileSync('docs/security/phase2/storage-readonly.txt',JSON.stringify({capturedAt:new Date().toISOString(),scope:'Cloud READ ONLY: Storage policies and bucket public flags; no object rows or Logs',policies,buckets},null,2)+'\n');
 console.log(JSON.stringify({policies:policies.length,buckets: buckets.map(b=>({id:b.id,public:b.public}))}));
}catch(e){if(db)await db.query('ROLLBACK').catch(()=>{});console.error('Storage metadata failed:',e.code||e.name);process.exitCode=1;}finally{if(db)await db.end();}})();
