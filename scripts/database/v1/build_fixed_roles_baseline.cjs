// Build the deployment drift guard from ORIGINAL definitions captured by the owned local migration test.
const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const env=JSON.parse(fs.readFileSync('docs/security/phase2/local-environment.txt','utf8'));
assert.match(env.database,/^pawpal_access_[a-f0-9]{12}$/);
const sql=input=>execFileSync('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d',env.database,'-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f','-'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();
assert.equal(sql("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()"),env.marker);
const rows=JSON.parse(sql(`SELECT jsonb_agg(x ORDER BY signature) FROM (
 SELECT CASE WHEN position('.' in split_part(b.key,'(',1))>0 THEN b.key ELSE 'public.'||b.key END signature,md5(b.payload->>'definition') fingerprint
 FROM pawpal_private.access_migration_backup b WHERE b.version=165 AND b.kind='function'
 AND (regexp_replace(split_part(b.key,'(',1),'^.*[.]','') IN (SELECT name FROM pawpal_private.work_rpc_catalog)
 OR regexp_replace(split_part(b.key,'(',1),'^.*[.]','') IN ('get_staff_login_context','set_admin_staff_access','create_admin_staff_profile','has_permission'))) x`));
assert.ok(rows.length>=30);
const literal=v=>"'"+v.replaceAll("'","''")+"'";
const guard=`DO $baseline$ DECLARE expected record; actual regprocedure; BEGIN
 FOR expected IN SELECT * FROM (VALUES
${rows.map(r=>'  ('+literal(r.signature)+','+literal(r.fingerprint)+')').join(',\n')}
 ) fingerprints(signature,fingerprint) LOOP
  actual:=to_regprocedure(expected.signature);
  IF actual IS NULL OR md5(pg_get_functiondef(actual))<>expected.fingerprint THEN
   RAISE EXCEPTION 'fixed_roles_source_changed: %',expected.signature;
  END IF;
 END LOOP;
END $baseline$;`;
const file='scripts/database/v1/165_admin_fixed_roles.sql',text=fs.readFileSync(file,'utf8'),start='-- BEGIN reviewed function fingerprints',end='-- END reviewed function fingerprints';
const a=text.indexOf(start),b=text.indexOf(end);assert.ok(a>=0&&b>a);
fs.writeFileSync(file,text.slice(0,a)+start+'\n'+guard+'\n'+text.slice(b));
console.log('Pinned '+rows.length+' original function definitions; run migration/rollback tests again.');
