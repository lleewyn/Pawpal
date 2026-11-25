const {tables}=require('./model.cjs');
function verify(sql,db) {
 const rows=JSON.parse(sql(db,`SELECT json_agg(x) FROM (SELECT c.relname AS name,c.relrowsecurity AS rls,
 (SELECT json_agg(a.attname ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) AS columns,
 (SELECT json_agg(json_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'required',a.attnotnull)) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) AS specs,
 (SELECT json_agg(a.attname ORDER BY u.ord) FROM pg_constraint k CROSS JOIN LATERAL unnest(k.conkey) WITH ORDINALITY u(attnum,ord) JOIN pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=u.attnum WHERE k.conrelid=c.oid AND k.contype='p') AS pk
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname) x`));
 if(rows.length!==105)throw Error('Expected exactly 105 public tables');
 for(const t of tables){
  const actual=rows.find(r=>r.name===t.name);
  if(!actual||!actual.rls)throw Error('Missing table/RLS: '+t.name);
  if(JSON.stringify([...actual.columns].sort())!==JSON.stringify(t.columns.map(c=>c.name).sort()))throw Error('Column mismatch '+t.name);
  if(JSON.stringify(actual.pk)!==JSON.stringify(t.columns.filter(c=>c.pk).map(c=>c.name)))throw Error('Primary key mismatch '+t.name);
  for(const c of t.columns){
   const spec=actual.specs.find(s=>s.name===c.name);
   const expectedType=c.type==='timestamptz'?'timestamp with time zone':c.type==='extensions.vector'?'vector':c.type;
   if(spec.type!==expectedType||spec.required===c.nullable)throw Error('Physical type/NULL mismatch '+t.name+'.'+c.name+': '+spec.type);
  }
 }
 const expectedFK=tables.reduce((sum,t)=>sum+t.columns.filter(c=>c.ref).length,0);
 const actualFK=Number(sql(db,"SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND c.contype='f' AND c.convalidated"));
 if(expectedFK!==actualFK)throw Error(`FK mismatch ${actualFK}/${expectedFK}`);
 const columnCount=rows.reduce((s,t)=>s+t.columns.length,0);
 const anonGrants=Number(sql(db,"SELECT count(*) FROM information_schema.role_table_grants WHERE table_schema='public' AND grantee='anon'"));
 if(anonGrants)throw Error('Unexpected anonymous table access');
 const orphanFunctions=Number(sql(db,"SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('pawpal_is_staff','pawpal_owns_customer','check_user_account_type')"));
 if(orphanFunctions)throw Error('Legacy public helper remains');
 return {tables:rows.length,columns:columnCount,foreignKeys:actualFK,rls:rows.filter(t=>t.rls).length};
}
module.exports={verify};
